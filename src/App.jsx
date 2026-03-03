import { useState, useEffect, useRef, useCallback } from "react";
import { ref, set, get, onValue, update } from "firebase/database";

// ─── Services ────────────────────────────────────────────────────────────────
import { db } from "./services/firebase";

// ─── Data constants ──────────────────────────────────────────────────────────
import {
  STYLE,
  SPACES,
  COLOR_GROUPS,
  CHANCE_CARDS,
  COMMUNITY_CARDS,
  FREE_PARKING_EVENTS,
  PLAYER_COLORS,
  PLAYER_TOKENS,
  CELL_POSITIONS,
  DEFAULT_SETTINGS,
  COLOR_LABELS,
} from "./constants";

// ─── Utility helpers ─────────────────────────────────────────────────────────
import {
  clamp,
  generateCode,
  safePlayers,
  safeProps,
  safeLog,
  safeDice,
  safeSettings,
  estimateAssetValueForPlayer,
  estimatePropertyRent,
  freshGameState,
} from "./utils";

// ─── AI logic ────────────────────────────────────────────────────────────────
import {
  AI_DIFFICULTY,
  AI_PERSONALITY,
  aiShouldBuy,
  aiShouldBuild,
  aiJailStrategy,
} from "./ai";

// ─── Components ──────────────────────────────────────────────────────────────
import DieFace from "./components/DieFace";
import BoardCell from "./components/BoardCell";
import PropertyCardModal from "./components/PropertyCardModal";
import BoardPopup from "./components/BoardPopup";
import TurnTimer from "./components/TurnTimer";
import GameTimer from "./components/GameTimer";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  // ── State ──
  const [screen, setScreen] = useState("lobby");
  const [lobbyMode, setLobbyMode] = useState("multiplayer"); // "multiplayer" | "ai"
  const [playerCount, setPlayerCount] = useState(2);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [myIdx, setMyIdx] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [isLocalGame, setIsLocalGame] = useState(false); // true for AI-only games
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // AI mode config
  const [aiOpponentCount, setAiOpponentCount] = useState(1);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiPersonality] = useState("aggressive");

  // Animation state
  const [diceLanding, setDiceLanding] = useState(false);
  const [flashCell, setFlashCell] = useState(null);
  const [bouncingPlayer, setBouncingPlayer] = useState(null);
  const [visualPositions, setVisualPositions] = useState({});

  // Sell-to-pay flow
  const [sellToPay, setSellToPay] = useState(null); // {amount, playerId}
  // Property card viewer
  const [selectedSpace, setSelectedSpace] = useState(null);

  // Analytics dashboard
  const [wealthMode, setWealthMode] = useState("net"); // net | assets
  const [wealthHistory, setWealthHistory] = useState([]);
  const [layoutFocus, setLayoutFocus] = useState("board"); // board | panel

  const gsRef = useRef(null);
  const myIdxRef = useRef(null);
  const prevDiceRef = useRef([1, 1]);
  const prevPositionsRef = useRef(null);
  const aiTimerRef = useRef(null);

  gsRef.current = gameState;
  myIdxRef.current = myIdx;

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById("mono-style")) return;
    const el = document.createElement("style");
    el.id = "mono-style";
    el.textContent = STYLE;
    document.head.appendChild(el);
  }, []);

  // ── Firebase: game state ──
  useEffect(() => {
    if (!roomCode || screen === "lobby") return;
    const gameRef = ref(db, `games/${roomCode}/state`);
    const unsub = onValue(gameRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      if (data.properties == null) data.properties = {};
      if (!Array.isArray(data.log)) data.log = [];
      if (!Array.isArray(data.dice)) data.dice = [1, 1];
      if (data.players && !Array.isArray(data.players)) {
        const arr = [];
        const maxKey = Math.max(...Object.keys(data.players).map(Number));
        for (let i = 0; i <= maxKey; i++) arr.push(data.players[i] || null);
        data.players = arr;
      }
      if (!data.players) data.players = [];

      const prev = prevDiceRef.current,
        nd = data.dice;
      if ((prev[0] !== nd[0] || prev[1] !== nd[1]) && !data.rolling) {
        prevDiceRef.current = nd;
        setDiceLanding(true);
        setTimeout(() => setDiceLanding(false), 500);
      }
      if (data.rolling) setDiceLanding(false);
      setGameState(data);
      if (data.status === "playing" && screen === "waiting") setScreen("game");
    });
    return () => unsub();
  }, [roomCode, screen]);

  // ── Firebase: lobby ──
  useEffect(() => {
    if (!roomCode || screen !== "waiting") return;
    const lobbyRef = ref(db, `games/${roomCode}/lobby`);
    const unsub = onValue(lobbyRef, (snap) => {
      if (snap.exists())
        setLobbyPlayers(Object.values(snap.val()).filter(Boolean));
    });
    return () => unsub();
  }, [roomCode, screen]);

  // ── Firebase: chat ──
  useEffect(() => {
    if (!roomCode || screen === "lobby") return;
    const chatRef = ref(db, `games/${roomCode}/chat`);
    const unsub = onValue(chatRef, (snap) => {
      if (snap.exists()) {
        const msgs = Object.values(snap.val()).sort((a, b) => a.ts - b.ts);
        setChatMessages(msgs);
        setTimeout(
          () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          50,
        );
      } else setChatMessages([]);
    });
    return () => unsub();
  }, [roomCode, screen]);

  // ── Non-host: watch for game start ──
  useEffect(() => {
    if (screen !== "waiting" || isHost) return;
    const stRef = ref(db, `games/${roomCode}/state/status`);
    const unsub = onValue(stRef, (snap) => {
      if (snap.exists() && snap.val() === "playing") setScreen("game");
    });
    return () => unsub();
  }, [screen, isHost, roomCode]);

  // ── Position animation ──
  useEffect(() => {
    if (!gameState) return;
    const players = safePlayers(gameState);
    if (!players.length) return;
    if (prevPositionsRef.current === null) {
      const seed = {};
      players.forEach((p) => {
        if (p) seed[p.id] = p.position;
      });
      prevPositionsRef.current = seed;
      return;
    }
    players.forEach((p) => {
      if (!p || p.bankrupt) return;
      const prev = prevPositionsRef.current[p.id];
      if (prev === undefined) {
        prevPositionsRef.current[p.id] = p.position;
        return;
      }
      if (prev !== p.position) {
        const steps =
          p.position > prev ? p.position - prev : 40 - prev + p.position;
        prevPositionsRef.current[p.id] = p.position;
        animateSteps(p.id, prev, steps);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState?.players?.map((p) => p?.position + "").join(","),
    gameState?.status,
  ]);

  // ── Close property card when a game-modal appears ──
  useEffect(() => {
    if (gameState?.modal) setSelectedSpace(null);
  }, [gameState?.modal]);


  // ── Wealth history tracker (real-time analytics) ──
  useEffect(() => {
    if (screen !== "game" || !gameState) return;
    const players = safePlayers(gameState);
    const props = safeProps(gameState);
    if (!players.length) return;
    const topLog = safeLog(gameState)[0] || "";
    const marker = /BANKRUPT|rent|MONO|reached/i.test(topLog) ? topLog : "";
    const point = {
      t: Date.now(),
      key: `${gameState.turnStartTime || 0}|${players.map((p) => `${p?.money || 0}-${p?.position || 0}-${p?.bankrupt ? 1 : 0}`).join("|")}|${Object.keys(props).length}|${topLog}`,
      values: players.map((pl, i) => ({
        id: i,
        net: (pl?.money || 0) + estimateAssetValueForPlayer(i, props),
        assets: estimateAssetValueForPlayer(i, props),
      })),
      event: marker,
    };
    setWealthHistory((prev) => {
      if (prev[prev.length - 1]?.key === point.key) return prev;
      return [...prev.slice(-19), point];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    screen,
    gameState?.turnStartTime,
    gameState?.log?.[0],
    gameState,
  ]);

  // ── Target-win check ──
  useEffect(() => {
    if (!gameState || gameState.status !== "playing") return;
    const s = safeSettings(gameState);
    if (s.gameMode !== "target") return;
    const winner = safePlayers(gameState).find(
      (p) => !p.bankrupt && p.money >= (s.targetAmount || 10000),
    );
    if (winner) {
      const log = safeLog(gameState);
      log.unshift(`🏆 ${winner.token} reached $${s.targetAmount}! WINNER!`);
      pushState({ ...gameState, status: "gameover", log: log.slice(0, 25) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.players?.map((p) => p?.money + "").join(",")]);

  // ── AI turn trigger ──
  useEffect(() => {
    if (!gameState || gameState.status !== "playing" || !gameState.modal)
      return;
    if (processing) return;

    const players = safePlayers(gameState);
    const curIdx = gameState.currentPlayer;
    const cur = players[curIdx];
    if (!cur || !cur.isAI || cur.bankrupt) return;

    clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      const gs = gsRef.current;
      if (!gs?.modal || gs.currentPlayer !== curIdx) return;

      const modal = gs.modal;
      const props = safeProps(gs);
      const log = safeLog(gs);

      if (modal.type === "steal") {
        const stealable = Object.entries(props)
          .filter(([, p]) => p && p.owner !== curIdx)
          .map(([id]) => +id);
        if (stealable.length) {
          const targetId =
            stealable[Math.floor(Math.random() * stealable.length)];
          log.unshift(
            `🤖 ${players[curIdx]?.token} stole ${SPACES[targetId]?.name}!`,
          );
          pushState({
            ...gs,
            properties: {
              ...props,
              [targetId]: { ...props[targetId], owner: curIdx },
            },
            modal: null,
            log: log.slice(0, 25),
          });
          return;
        }
      }

      if (modal.type === "swap") {
        const mine = Object.entries(props)
          .filter(([, p]) => p && p.owner === curIdx)
          .map(([id]) => +id);
        const theirs = Object.entries(props)
          .filter(([, p]) => p && p.owner !== curIdx)
          .map(([id]) => +id);
        if (mine.length && theirs.length) {
          const mySpaceId = mine[Math.floor(Math.random() * mine.length)];
          const theirSpaceId =
            theirs[Math.floor(Math.random() * theirs.length)];
          const myProp = props[mySpaceId],
            theirProp = props[theirSpaceId];
          log.unshift(
            `🔄 🤖 ${players[curIdx]?.token} swapped ${SPACES[mySpaceId]?.name} ↔ ${SPACES[theirSpaceId]?.name}!`,
          );
          pushState({
            ...gs,
            properties: {
              ...props,
              [mySpaceId]: { ...myProp, owner: theirProp.owner },
              [theirSpaceId]: { ...theirProp, owner: curIdx },
            },
            modal: null,
            log: log.slice(0, 25),
          });
          return;
        }
      }

      pushState({ ...gs, modal: null });
    }, 700);
    return () => clearTimeout(aiTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState?.modal,
    gameState?.currentPlayer,
    gameState?.status,
    processing,
  ]);

  useEffect(() => {
    if (!gameState || gameState.status !== "playing") return;
    if (gameState.modal) return; // wait for modal to clear

    const cur = safePlayers(gameState)[gameState.currentPlayer];
    if (!cur || !cur.isAI || cur.bankrupt) return;
    if (processing) return;

    clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      runAITurn();
    }, 1200);
    return () => clearTimeout(aiTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState?.currentPlayer,
    gameState?.rolled,
    gameState?.status,
    gameState?.modal,
    processing,
  ]);

  const animateSteps = (playerId, from, steps) => {
    const STEP_MS = 200;
    let step = 0;
    const tick = () => {
      if (step >= steps) {
        setFlashCell(null);
        setBouncingPlayer(playerId);
        setTimeout(() => setBouncingPlayer(null), 600);
        setVisualPositions((prev) => {
          const n = { ...prev };
          delete n[playerId];
          return n;
        });
        return;
      }
      const curPos = (from + step + 1) % 40;
      setFlashCell(curPos);
      setVisualPositions((prev) => ({ ...prev, [playerId]: curPos }));
      step++;
      setTimeout(tick, STEP_MS);
    };
    setTimeout(tick, 50);
  };

  // ── pushState — works for local AI games and Firebase multiplayer ──
  const isLocalGameRef = useRef(false);
  isLocalGameRef.current = isLocalGame;

  const pushState = useCallback(
    (s) => {
      const safe = {
        ...s,
        properties:
          s.properties && typeof s.properties === "object" ? s.properties : {},
        log: Array.isArray(s.log) ? s.log : [],
        dice: Array.isArray(s.dice) ? s.dice : [1, 1],
        players: Array.isArray(s.players) ? s.players : [],
        rolling: s.rolling ?? false,
      };
      if (isLocalGameRef.current) {
        // Local AI game: update state directly, return a resolved promise
        setGameState(safe);
        return Promise.resolve();
      }
      return set(ref(db, `games/${roomCode}/state`), safe);
    },
    [roomCode],
  );

  const isMyTurn = gameState && myIdx === gameState.currentPlayer;

  // ── Rent calculation ──
  const calcRent = (space, prop, props, dice, attacker) => {
    const p2 = props && typeof props === "object" ? props : {};
    let rent = 0;
    if (space.type === "railroad") {
      const count = Object.entries(p2).filter(
        ([k, v]) =>
          v && v.owner === prop.owner && SPACES[+k]?.type === "railroad",
      ).length;
      rent = space.rent[Math.min(count - 1, 3)];
    } else if (space.type === "utility") {
      const count = Object.entries(p2).filter(
        ([k, v]) =>
          v && v.owner === prop.owner && SPACES[+k]?.type === "utility",
      ).length;
      const d = Array.isArray(dice) ? dice : [1, 1];
      rent = (d[0] + d[1]) * (count === 2 ? 10 : 4);
    } else {
      const group = COLOR_GROUPS[space.color] || [];
      const monopoly = group.every((id) => p2[id]?.owner === prop.owner);
      rent = prop.hotel
        ? space.rent[5]
        : (prop.houses || 0) > 0
          ? space.rent[prop.houses]
          : monopoly
            ? space.rent[0] * 2
            : space.rent[0];
    }
    // Double rent effect on owner
    const owner = safePlayers(gsRef.current)[prop.owner];
    if ((owner?.doubleRentTurns || 0) > 0) rent *= 2;
    return rent;
  };

  // ── Sell property (for bankruptcy prevention) ──
  const sellProperty = (spaceId) => {
    if (!gameState) return;
    const gs = gsRef.current;
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const props = safeProps(gs);
    const prop = props[spaceId];
    if (!prop) return;
    const space = SPACES[spaceId];
    const sellPrice = Math.floor((space.price || 0) / 2);
    players[prop.owner] = {
      ...players[prop.owner],
      money: players[prop.owner].money + sellPrice,
    };
    const newProps = { ...props };
    delete newProps[spaceId];
    const log = safeLog(gs);
    log.unshift(
      `${players[prop.owner].token} sold ${space.name} for $${sellPrice}`,
    );
    // Check if debt cleared
    if (sellToPay && players[prop.owner].money >= sellToPay.amount) {
      setSellToPay(null);
    }
    pushState({ ...gs, players, properties: newProps, log: log.slice(0, 25) });
  };

  // ── Space action handler ──
  const doSpaceAction = (spaceId, player, gs, props, isDouble) => {
    const space = SPACES[spaceId];
    if (!space) {
      pushState({ ...gs, rolled: true, rolling: false });
      setProcessing(false);
      return;
    }
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const log = safeLog(gs);
    const curIdx = gs.currentPlayer;
    const s = safeSettings(gs);
    const now = Date.now();

    const finishTurn = (updP, updProps, updFP, modal, forceEnd) => {
      const finalPlayers = updP || players;
      // Decrement special-effect counters
      finalPlayers.forEach((p, i) => {
        if (p && (p.doubleRentTurns || 0) > 0)
          finalPlayers[i] = { ...p, doubleRentTurns: p.doubleRentTurns - 1 };
        if (p && (p.rentImmuneTurns || 0) > 0)
          finalPlayers[i] = {
            ...finalPlayers[i],
            rentImmuneTurns: p.rentImmuneTurns - 1,
          };
      });
      // Target win check
      if (s.gameMode === "target") {
        const w = finalPlayers.find(
          (p) => !p.bankrupt && p.money >= (s.targetAmount || 10000),
        );
        if (w) {
          log.unshift(`🏆 ${w.token} reached $${s.targetAmount}!`);
          pushState({
            ...gs,
            players: finalPlayers,
            properties: updProps !== undefined ? updProps : props,
            freePot: updFP !== undefined ? updFP : gs.freePot || 0,
            rolling: false,
            status: "gameover",
            modal: null,
            log: log.slice(0, 25),
          }).then(() => setProcessing(false));
          return;
        }
      }
      pushState({
        ...gs,
        players: finalPlayers,
        properties: updProps !== undefined ? updProps : props,
        freePot: updFP !== undefined ? updFP : gs.freePot || 0,
        rolled: forceEnd ? true : !isDouble,
        rolling: false,
        modal: modal || null,
        log,
        turnStartTime: forceEnd || !isDouble ? now : gs.turnStartTime,
      }).then(() => setProcessing(false));
    };

    if (space.type === "go" || space.type === "jail") {
      finishTurn(null, undefined, undefined, null, false);
    } else if (space.type === "gotojail") {
      log.unshift(`${player.token} — Go To Jail! 🔒`);
      players[curIdx] = { ...player, position: 10, inJail: true, jailTurns: 0 };
      finishTurn(players, undefined, undefined, null, true);
    } else if (space.type === "tax") {
      const amt = space.amount || 0;
      log.unshift(`${player.token} pays ${space.name}: $${amt}`);
      players[curIdx] = { ...player, money: player.money - amt };
      if (players[curIdx].money < 0)
        checkBankruptcy(curIdx, amt, players, props, gs, log, finishTurn);
      else finishTurn(players, undefined, (gs.freePot || 0) + amt, null, false);
    } else if (space.type === "freeparking") {
      const pot = gs.freePot || 0;
      const event =
        FREE_PARKING_EVENTS[
        Math.floor(Math.random() * FREE_PARKING_EVENTS.length)
        ];
      const eventAmount = event?.amount || 0;
      const totalAward = pot + eventAmount;
      log.unshift(`${player.token} collects Free Parking: $${pot}!`);
      if (eventAmount > 0)
        log.unshift(`${player.token} bonus event: +$${eventAmount}`);
      if (eventAmount < 0)
        log.unshift(
          `${player.token} setback event: -$${Math.abs(eventAmount)}`,
        );
      players[curIdx] = { ...player, money: player.money + totalAward };
      finishTurn(
        players,
        undefined,
        0,
        { type: "notify", title: event.title, text: event.text },
        false,
      );
    } else if (space.type === "chance") {
      const card =
        CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
      log.unshift(`❓ Chance: ${card.text}`);
      const acted = card.needsGs
        ? card.action(player, gs)
        : card.action(player);
      const specialEffect = acted.specialEffect;
      const cleanPlayer = { ...acted };
      delete cleanPlayer.specialEffect;
      players[curIdx] = cleanPlayer;

      if (specialEffect?.type === "freeze") {
        const tid = specialEffect.targetId;
        if (players[tid])
          players[tid] = {
            ...players[tid],
            frozenTurns: (players[tid].frozenTurns || 0) + 1,
          };
        log.unshift(`❄️ ${player.token} froze ${players[tid]?.token || "?"}!`);
        finishTurn(
          players,
          undefined,
          undefined,
          { type: "card", title: "❓ Chance!", text: card.text },
          false,
        );
      } else if (specialEffect?.type === "steal") {
        finishTurn(players, undefined, undefined, { type: "steal" }, false);
      } else if (specialEffect?.type === "swap") {
        finishTurn(players, undefined, undefined, { type: "swap" }, false);
      } else if (specialEffect?.type === "forceTransfer") {
        const tid = specialEffect.targetId;
        const cheapest = Object.entries(props).find(
          ([, p]) => p && p.owner === tid,
        );
        if (cheapest) {
          const [cid] = cheapest;
          log.unshift(
            `💸 ${player.token} took ${SPACES[+cid]?.name} from ${players[tid]?.token}!`,
          );
          const newProps = {
            ...props,
            [cid]: { ...props[cid], owner: curIdx },
          };
          finishTurn(
            players,
            newProps,
            undefined,
            { type: "card", title: "❓ Chance!", text: card.text },
            false,
          );
        } else {
          finishTurn(
            players,
            undefined,
            undefined,
            { type: "card", title: "❓ Chance!", text: card.text },
            false,
          );
        }
      } else {
        finishTurn(
          players,
          undefined,
          undefined,
          { type: "card", title: "❓ Chance!", text: card.text },
          false,
        );
      }
    } else if (space.type === "community") {
      const card =
        COMMUNITY_CARDS[Math.floor(Math.random() * COMMUNITY_CARDS.length)];
      log.unshift(`📋 Community: ${card.text}`);
      players[curIdx] = card.action(player);
      finishTurn(
        players,
        undefined,
        undefined,
        { type: "card", title: "📋 Community Chest!", text: card.text },
        false,
      );
    } else if (
      space.type === "property" ||
      space.type === "railroad" ||
      space.type === "utility"
    ) {
      const prop = props[spaceId];
      if (!prop) {
        // AI auto-decides
        if (player.isAI) {
          const shouldBuy = aiShouldBuy(player, space, props);
          if (shouldBuy) {
            log.unshift(`🤖 ${player.token} bought ${space.name}!`);
            players[curIdx] = { ...player, money: player.money - space.price };
            finishTurn(
              players,
              {
                ...props,
                [spaceId]: { owner: curIdx, houses: 0, hotel: false },
              },
              undefined,
              null,
              false,
            );
          } else {
            finishTurn(null, undefined, undefined, null, false);
          }
        } else {
          finishTurn(
            null,
            undefined,
            undefined,
            { type: "buy", spaceId, playerIdx: curIdx },
            false,
          );
        }
      } else if (prop.owner !== curIdx) {
        // Rent immunity?
        if ((player.rentImmuneTurns || 0) > 0) {
          log.unshift(`🛡️ ${player.token} is rent-immune this turn!`);
          finishTurn(null, undefined, undefined, null, false);
          return;
        }
        const rent = calcRent(space, prop, props, gs.dice, player);
        log.unshift(
          `${player.token} pays $${rent} rent to ${players[prop.owner]?.token || "?"}`,
        );
        const newMoney = player.money - rent;
        players[curIdx] = { ...player, money: newMoney };
        if (players[prop.owner])
          players[prop.owner] = {
            ...players[prop.owner],
            money: players[prop.owner].money + rent,
          };
        if (newMoney < 0) {
          // Trigger sell-to-pay
          if (!player.isAI) {
            setSellToPay({ amount: Math.abs(newMoney), playerId: curIdx });
            finishTurn(players, undefined, undefined, null, false);
          } else {
            // AI sells automatically
            let debt = Math.abs(newMoney);
            const newProps = { ...props };
            const ownedIds = Object.entries(newProps)
              .filter(([, p]) => p && p.owner === curIdx)
              .map(([id]) => +id);
            ownedIds.forEach((id) => {
              if (debt <= 0) return;
              const sellPrice = Math.floor((SPACES[id]?.price || 0) / 2);
              players[curIdx] = {
                ...players[curIdx],
                money: players[curIdx].money + sellPrice,
              };
              delete newProps[id];
              debt -= sellPrice;
              log.unshift(
                `🤖 ${player.token} sold ${SPACES[id]?.name} to pay debt`,
              );
            });
            if (players[curIdx].money < 0) {
              log.unshift(`${player.token} is BANKRUPT! 💸`);
              players[curIdx] = { ...players[curIdx], bankrupt: true };
            }
            finishTurn(players, newProps, undefined, null, false);
          }
        } else {
          finishTurn(players, undefined, undefined, null, false);
        }
      } else {
        // Own property — open the property card so player can choose to build
        const group = COLOR_GROUPS[space.color] || [];
        const hasMonopoly =
          space.type === "property" &&
          group.every((id) => props[id]?.owner === curIdx);
        if (!player.isAI) {
          // Open the property card; build button lives inside it
          finishTurn(null, undefined, undefined, null, false);
          // Use a short delay so finishTurn writes to Firebase first
          setTimeout(() => setSelectedSpace(spaceId), 350);
        } else {
          // AI: auto-build using personality/difficulty logic
          if (
            hasMonopoly &&
            !props[spaceId]?.hotel &&
            aiShouldBuild(player, spaceId, props, gs)
          ) {
            const prop = props[spaceId];
            const newProp =
              (prop.houses || 0) >= 4
                ? { ...prop, houses: 0, hotel: true }
                : { ...prop, houses: (prop.houses || 0) + 1 };
            players[curIdx] = {
              ...player,
              money: player.money - (space.houseCost || 100),
            };
            const log2 = safeLog(gs);
            log2.unshift(
              `🤖 ${player.token} built ${newProp.hotel ? "🏨 hotel" : "🏠 house"} on ${space.name}!`,
            );
            finishTurn(
              players,
              { ...props, [spaceId]: newProp },
              undefined,
              null,
              false,
            );
          } else {
            finishTurn(null, undefined, undefined, null, false);
          }
        }
      }
    } else {
      finishTurn(null, undefined, undefined, null, false);
    }
  };

  function checkBankruptcy(
    curIdx,
    amount,
    players,
    props,
    gs,
    log,
    finishTurn,
  ) {
    // handled via sellToPay UI or AI auto-sell
    log.unshift(`${players[curIdx].token} is BANKRUPT! 💸`);
    players[curIdx] = { ...players[curIdx], bankrupt: true };
    finishTurn(players, undefined, (gs.freePot || 0) + amount, null, false);
  }

  const doMoveAndAction = (player, steps, gs, props, isDouble, d1, d2) => {
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const oldPos = player.position,
      newPos = (oldPos + steps) % 40;
    const log = safeLog(gs);
    let bonus = 0;
    if (oldPos + steps >= 40) {
      bonus = 200;
      log.unshift(`${player.token} passed GO — +$200!`);
    }
    log.unshift(`${player.token} → ${SPACES[newPos].name}`);
    const updPlayer = {
      ...player,
      position: newPos,
      money: player.money + bonus,
    };
    players[gs.currentPlayer] = updPlayer;
    const newGs = {
      ...gs,
      players,
      dice: [d1, d2],
      log: log.slice(0, 25),
      rolling: false,
    };
    const TOTAL_ANIM_MS = steps * 200 + 300;
    pushState(newGs).then(() => {
      setTimeout(
        () => doSpaceAction(newPos, updPlayer, newGs, props, isDouble),
        TOTAL_ANIM_MS,
      );
    });
  };

  // ── Jail escape ──
  const handleJailRoll = () => {
    if (!isMyTurn || processing) return;
    setProcessing(true);
    const gs = gsRef.current;
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const props = safeProps(gs);
    const player = players[gs.currentPlayer];
    const d1 = Math.ceil(Math.random() * 6),
      d2 = Math.ceil(Math.random() * 6);
    const isDouble = d1 === d2;
    const log = safeLog(gs);
    log.unshift(
      `${player.token} rolls ${d1}+${d2}${isDouble ? " 🎲 Doubles!" : ""}`,
    );
    pushState({ ...gs, rolling: true, log: log.slice(0, 25) });
    setTimeout(() => {
      if (isDouble) {
        log.unshift(`${player.token} escaped jail with doubles!`);
        const freed = { ...player, inJail: false, jailTurns: 0 };
        players[gs.currentPlayer] = freed;
        const newGs = {
          ...gs,
          players,
          dice: [d1, d2],
          doubleCount: 0,
          rolling: false,
          log: log.slice(0, 25),
          modal: null,
        };
        pushState(newGs).then(() =>
          setTimeout(
            () => doMoveAndAction(freed, d1 + d2, newGs, props, false, d1, d2),
            300,
          ),
        );
      } else {
        const newJT = (player.jailTurns || 0) + 1;
        players[gs.currentPlayer] = { ...player, jailTurns: newJT };
        if (newJT >= 3) {
          log.unshift(`${player.token} served 3 turns — released!`);
          players[gs.currentPlayer] = {
            ...players[gs.currentPlayer],
            inJail: false,
            jailTurns: 0,
          };
          const freed = players[gs.currentPlayer];
          const newGs = {
            ...gs,
            players,
            dice: [d1, d2],
            rolling: false,
            log: log.slice(0, 25),
            modal: null,
          };
          pushState(newGs).then(() =>
            setTimeout(
              () =>
                doMoveAndAction(freed, d1 + d2, newGs, props, false, d1, d2),
              300,
            ),
          );
        } else {
          log.unshift(`${player.token} still in jail (${newJT}/3 turns)`);
          pushState({
            ...gs,
            players,
            dice: [d1, d2],
            rolled: true,
            rolling: false,
            log: log.slice(0, 25),
            modal: null,
          }).then(() => setProcessing(false));
        }
      }
    }, 900);
  };

  const handlePayJailFine = () => {
    if (!isMyTurn || processing) return;
    const gs = gsRef.current;
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const player = players[myIdx];
    if (!player || player.money < 50) return;
    setProcessing(true);
    players[myIdx] = {
      ...player,
      money: player.money - 50,
      inJail: false,
      jailTurns: 0,
    };
    const log = safeLog(gs);
    log.unshift(`${player.token} paid $50 fine — released!`);
    pushState({ ...gs, players, log: log.slice(0, 25), modal: null }).then(() =>
      setProcessing(false),
    );
  };

  const handleUseJailCard = () => {
    if (!isMyTurn || processing) return;
    const gs = gsRef.current;
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const player = players[myIdx];
    if (!player || (player.jailFreeCards || 0) <= 0) return;
    setProcessing(true);
    players[myIdx] = {
      ...player,
      jailFreeCards: player.jailFreeCards - 1,
      inJail: false,
      jailTurns: 0,
    };
    const log = safeLog(gs);
    log.unshift(`${player.token} used a Get Out of Jail Free card! 🃏`);
    pushState({ ...gs, players, log: log.slice(0, 25), modal: null }).then(() =>
      setProcessing(false),
    );
  };

  // ── Roll ──
  const handleRoll = () => {
    if (!isMyTurn || gameState.rolled || processing) return;
    const gs = gsRef.current;
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const player = players[gs.currentPlayer];
    if (!player || player.bankrupt) {
      advanceTurn(gs);
      return;
    }

    // Frozen check
    if ((player.frozenTurns || 0) > 0) {
      const log = safeLog(gs);
      log.unshift(`❄️ ${player.token} is frozen this turn!`);
      players[gs.currentPlayer] = {
        ...player,
        frozenTurns: player.frozenTurns - 1,
      };
      setProcessing(true);
      pushState({ ...gs, players, rolled: true, log: log.slice(0, 25) }).then(
        () => setProcessing(false),
      );
      return;
    }

    // Jail check
    if (player.inJail) {
      pushState({ ...gs, modal: { type: "jail" } });
      return;
    }

    setProcessing(true);
    const d1 = Math.ceil(Math.random() * 6),
      d2 = Math.ceil(Math.random() * 6);
    const isDouble = d1 === d2,
      newDC = isDouble ? (gs.doubleCount || 0) + 1 : 0;
    const log = safeLog(gs);
    log.unshift(
      `${player.token} rolls ${d1}+${d2}=${d1 + d2}${isDouble ? " 🎲 Doubles!" : ""}`,
    );
    pushState({ ...gs, rolling: true, log: log.slice(0, 25) });

    setTimeout(() => {
      if (newDC === 3) {
        log.unshift(`${player.token} rolled 3 doubles — Jail! 🔒`);
        players[gs.currentPlayer] = {
          ...player,
          position: 10,
          inJail: true,
          jailTurns: 0,
        };
        pushState({
          ...gs,
          players,
          dice: [d1, d2],
          rolled: true,
          rolling: false,
          doubleCount: 0,
          log: log.slice(0, 25),
        }).then(() => setProcessing(false));
        return;
      }
      doMoveAndAction(
        player,
        d1 + d2,
        { ...gs, players, doubleCount: newDC, log: log.slice(0, 25) },
        safeProps(gs),
        isDouble,
        d1,
        d2,
      );
    }, 900);
  };

  // ── AI Turn ──
  const runAITurn = () => {
    const gs = gsRef.current;
    if (!gs || gs.status !== "playing" || gs.modal) return;
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const cur = players[gs.currentPlayer];
    if (!cur || !cur.isAI || cur.bankrupt) return;
    setProcessing(true);

    if (gs.rolled) {
      // AI ends turn
      setTimeout(() => advanceTurn(gs), 800);
      return;
    }

    if (cur.inJail) {
      const jailStrat = aiJailStrategy(cur);
      const log = safeLog(gs);
      if (jailStrat === "card" && (cur.jailFreeCards || 0) > 0) {
        log.unshift(`🤖 ${cur.token} used Get Out of Jail Free card!`);
        players[gs.currentPlayer] = {
          ...cur,
          jailFreeCards: cur.jailFreeCards - 1,
          inJail: false,
          jailTurns: 0,
        };
        const d1 = Math.ceil(Math.random() * 6),
          d2 = Math.ceil(Math.random() * 6);
        pushState({ ...gs, rolling: true, log: log.slice(0, 25) });
        setTimeout(() => {
          const newGs = {
            ...gs,
            players,
            dice: [d1, d2],
            rolling: false,
            log: log.slice(0, 25),
          };
          pushState(newGs).then(() =>
            setTimeout(
              () =>
                doMoveAndAction(
                  players[gs.currentPlayer],
                  d1 + d2,
                  newGs,
                  safeProps(gs),
                  false,
                  d1,
                  d2,
                ),
              300,
            ),
          );
        }, 900);
      } else if (jailStrat === "pay" && cur.money >= 50) {
        log.unshift(`🤖 ${cur.token} paid $50 jail fine`);
        players[gs.currentPlayer] = {
          ...cur,
          money: cur.money - 50,
          inJail: false,
          jailTurns: 0,
        };
        const d1 = Math.ceil(Math.random() * 6),
          d2 = Math.ceil(Math.random() * 6);
        pushState({ ...gs, rolling: true, log: log.slice(0, 25) });
        setTimeout(() => {
          const newGs = {
            ...gs,
            players,
            dice: [d1, d2],
            rolling: false,
            log: log.slice(0, 25),
          };
          pushState(newGs).then(() =>
            setTimeout(
              () =>
                doMoveAndAction(
                  players[gs.currentPlayer],
                  d1 + d2,
                  newGs,
                  safeProps(gs),
                  false,
                  d1,
                  d2,
                ),
              300,
            ),
          );
        }, 900);
      } else {
        // Roll for doubles
        const d1 = Math.ceil(Math.random() * 6),
          d2 = Math.ceil(Math.random() * 6);
        const isDouble = d1 === d2;
        log.unshift(
          `🤖 ${cur.token} rolls for doubles: ${d1}+${d2}${isDouble ? " 🎲 FREE!" : ""}`,
        );
        pushState({ ...gs, rolling: true, log: log.slice(0, 25) });
        setTimeout(() => {
          if (isDouble) {
            players[gs.currentPlayer] = { ...cur, inJail: false, jailTurns: 0 };
            const newGs = {
              ...gs,
              players,
              dice: [d1, d2],
              rolling: false,
              log: log.slice(0, 25),
            };
            pushState(newGs).then(() =>
              setTimeout(
                () =>
                  doMoveAndAction(
                    players[gs.currentPlayer],
                    d1 + d2,
                    newGs,
                    safeProps(gs),
                    false,
                    d1,
                    d2,
                  ),
                300,
              ),
            );
          } else {
            const newJT = (cur.jailTurns || 0) + 1;
            if (newJT >= 3) {
              players[gs.currentPlayer] = {
                ...cur,
                inJail: false,
                jailTurns: 0,
              };
              const newGs = {
                ...gs,
                players,
                dice: [d1, d2],
                rolling: false,
                log: log.slice(0, 25),
              };
              pushState(newGs).then(() =>
                setTimeout(
                  () =>
                    doMoveAndAction(
                      players[gs.currentPlayer],
                      d1 + d2,
                      newGs,
                      safeProps(gs),
                      false,
                      d1,
                      d2,
                    ),
                  300,
                ),
              );
            } else {
              players[gs.currentPlayer] = { ...cur, jailTurns: newJT };
              pushState({
                ...gs,
                players,
                dice: [d1, d2],
                rolled: true,
                rolling: false,
                log: log.slice(0, 25),
              }).then(() => setProcessing(false));
            }
          }
        }, 900);
      }
      return;
    }

    if ((cur.frozenTurns || 0) > 0) {
      const log = safeLog(gs);
      log.unshift(`❄️ ${cur.token} is frozen!`);
      players[gs.currentPlayer] = { ...cur, frozenTurns: cur.frozenTurns - 1 };
      pushState({ ...gs, players, rolled: true, log: log.slice(0, 25) }).then(
        () => setProcessing(false),
      );
      return;
    }

    const d1 = Math.ceil(Math.random() * 6),
      d2 = Math.ceil(Math.random() * 6);
    const isDouble = d1 === d2,
      newDC = isDouble ? (gs.doubleCount || 0) + 1 : 0;
    const log = safeLog(gs);
    log.unshift(`🤖 ${cur.token} rolls ${d1}+${d2}=${d1 + d2}`);
    pushState({ ...gs, rolling: true, log: log.slice(0, 25) });
    setTimeout(() => {
      if (newDC === 3) {
        players[gs.currentPlayer] = {
          ...cur,
          position: 10,
          inJail: true,
          jailTurns: 0,
        };
        pushState({
          ...gs,
          players,
          dice: [d1, d2],
          rolled: true,
          rolling: false,
          doubleCount: 0,
          log: log.slice(0, 25),
        }).then(() => setProcessing(false));
        return;
      }
      doMoveAndAction(
        cur,
        d1 + d2,
        { ...gs, players, doubleCount: newDC, log: log.slice(0, 25) },
        safeProps(gs),
        isDouble,
        d1,
        d2,
      );
    }, 900);
  };

  const advanceTurn = (gs) => {
    const players = safePlayers(gs);
    const active = players.filter((p) => p && !p.bankrupt);
    if (active.length <= 1) {
      pushState({ ...gs, status: "gameover" }).then(() => setProcessing(false));
      return;
    }
    let next = (gs.currentPlayer + 1) % players.length;
    while (players[next]?.bankrupt) next = (next + 1) % players.length;
    const log = safeLog(gs);
    const isAI = players[next]?.isAI;
    log.unshift(`▶ Player ${next + 1}${isAI ? " 🤖" : ""}'s turn`);
    pushState({
      ...gs,
      currentPlayer: next,
      rolled: false,
      doubleCount: 0,
      rolling: false,
      log: log.slice(0, 25),
      turnStartTime: Date.now(),
      modal: null,
    }).then(() => setProcessing(false));
  };

  const endTurn = () => {
    if (!isMyTurn || !gameState.rolled || processing) return;
    setProcessing(true);
    advanceTurn(gsRef.current);
  };

  const handleTimerExpire = () => {
    if (!isMyTurn || processing) return;
    const gs = gsRef.current;
    if (!gs.rolled) {
      const d1 = Math.ceil(Math.random() * 6),
        d2 = Math.ceil(Math.random() * 6);
      const log = safeLog(gs);
      log.unshift(`⏰ Time expired! Auto-rolling...`);
      const players = safePlayers(gs).map((p) => ({ ...p }));
      const player = players[gs.currentPlayer];
      if (player && !player.bankrupt)
        doMoveAndAction(
          player,
          d1 + d2,
          { ...gs, players, doubleCount: 0, log: log.slice(0, 25) },
          safeProps(gs),
          false,
          d1,
          d2,
        );
      else advanceTurn(gs);
    } else advanceTurn(gs);
  };

  // ── Property actions ──
  const dismissModal = () => {
    if (!gameState?.modal) return;
    if (!isMyTurn && gameState.modal.type !== "notify") return;
    pushState({ ...gameState, modal: null });
  };

  const buyProperty = () => {
    if (!isMyTurn || !gameState?.modal) return;
    const { spaceId, playerIdx } = gameState.modal;
    const space = SPACES[spaceId];
    const players = safePlayers(gameState).map((p) => ({ ...p }));
    const props = safeProps(gameState);
    const player = players[playerIdx];
    const log = safeLog(gameState);
    if (!player || player.money < space.price) {
      pushState({ ...gameState, modal: null });
      return;
    }
    players[playerIdx] = { ...player, money: player.money - space.price };
    log.unshift(`${player.token} bought ${space.name} for $${space.price}`);
    pushState({
      ...gameState,
      players,
      properties: {
        ...props,
        [spaceId]: { owner: playerIdx, houses: 0, hotel: false },
      },
      modal: null,
      log: log.slice(0, 25),
    });
  };

  const buildHouse = (spaceId) => {
    if (!isMyTurn || processing) return;
    const gs = gsRef.current;
    const space = SPACES[spaceId];
    if (!space) return;
    const props = safeProps(gs);
    const prop = props[spaceId];
    if (!prop || prop.owner !== myIdx) return;
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const player = players[myIdx];
    const group = COLOR_GROUPS[space.color] || [];
    if (!group.every((id) => props[id]?.owner === myIdx) || prop.hotel) return;
    const cost = space.houseCost || 100;
    if (player.money < cost) return;
    players[myIdx] = { ...player, money: player.money - cost };
    const log = safeLog(gs);
    const newProp =
      (prop.houses || 0) >= 4
        ? (log.unshift(`${player.token} built 🏨 hotel on ${space.name}!`),
          { ...prop, houses: 0, hotel: true })
        : (log.unshift(`${player.token} built 🏠 house on ${space.name}!`),
          { ...prop, houses: (prop.houses || 0) + 1 });
    pushState({
      ...gs,
      players,
      properties: { ...props, [spaceId]: newProp },
      log: log.slice(0, 25),
      modal: null,
    });
  };

  const handleSteal = (targetSpaceId) => {
    const gs = gsRef.current;
    const props = safeProps(gs);
    if (!props[targetSpaceId] || props[targetSpaceId].owner === myIdx) return;
    const log = safeLog(gs);
    log.unshift(
      `${safePlayers(gs)[myIdx]?.token} stole ${SPACES[targetSpaceId]?.name}!`,
    );
    pushState({
      ...gs,
      properties: {
        ...props,
        [targetSpaceId]: { ...props[targetSpaceId], owner: myIdx },
      },
      modal: null,
      log: log.slice(0, 25),
    });
  };

  const handleSwap = (mySpaceId, theirSpaceId) => {
    const gs = gsRef.current;
    const props = safeProps(gs);
    const myProp = props[mySpaceId],
      theirProp = props[theirSpaceId];
    if (!myProp || !theirProp) return;
    const log = safeLog(gs);
    log.unshift(
      `🔄 ${safePlayers(gs)[myIdx]?.token} swapped ${SPACES[mySpaceId]?.name} ↔ ${SPACES[theirSpaceId]?.name}!`,
    );
    pushState({
      ...gs,
      properties: {
        ...props,
        [mySpaceId]: { ...myProp, owner: theirProp.owner },
        [theirSpaceId]: { ...theirProp, owner: myIdx },
      },
      modal: null,
      log: log.slice(0, 25),
    });
  };

  // ── Create / Join ──
  const createGame = async () => {
    const code = generateCode();
    setRoomCode(code);
    setIsHost(true);
    setMyIdx(0);
    myIdxRef.current = 0;
    await set(ref(db, `games/${code}`), {
      lobby: { 0: { id: 0, token: PLAYER_TOKENS[0], color: PLAYER_COLORS[0] } },
      state: {
        hostPlayerCount: playerCount,
        status: "waiting",
        properties: {},
        players: [],
        log: [],
        dice: [1, 1],
        rolling: false,
      },
    });
    setScreen("waiting");
  };

  const joinGame = async () => {
    const code = joinCode.toUpperCase().trim();
    if (code.length < 4) {
      setError("Enter a valid room code");
      return;
    }
    setError("");
    const snap = await get(ref(db, `games/${code}`));
    if (!snap.exists()) {
      setError("Room not found!");
      return;
    }
    const data = snap.val();
    const lobbyCount = data.lobby ? Object.keys(data.lobby).length : 0;
    const maxPlayers = data.state?.hostPlayerCount || 2;
    if (lobbyCount >= maxPlayers) {
      setError("Room is full!");
      return;
    }
    const idx = lobbyCount;
    setMyIdx(idx);
    myIdxRef.current = idx;
    setRoomCode(code);
    setIsHost(false);
    await update(ref(db, `games/${code}/lobby`), {
      [idx]: { id: idx, token: PLAYER_TOKENS[idx], color: PLAYER_COLORS[idx] },
    });
    setScreen("waiting");
  };

  const startGame = async (count) => {
    const aiP = settings.aiPlayers || [];
    const aiConfigs = {};
    aiP.forEach((idx) => {
      aiConfigs[idx] = { difficulty: aiDifficulty, personality: aiPersonality };
    });
    const gs = freshGameState(count, settings, aiP, aiConfigs);
    await set(ref(db, `games/${roomCode}/state`), gs);
    setScreen("game");
  };

  // Start a fully local AI game (no Firebase, no room code)
  const startAIGame = () => {
    const totalPlayers = 1 + aiOpponentCount; // human is P0
    const aiPlayerIndices = Array.from(
      { length: aiOpponentCount },
      (_, i) => i + 1,
    );
    const aiConfigs = {};
    aiPlayerIndices.forEach((idx) => {
      // Give each opponent slightly different personality for variety
      const personalities = [
        "aggressive",
        "conservative",
        "monopolist",
        "random",
      ];
      aiConfigs[idx] = {
        difficulty: aiDifficulty,
        personality: personalities[(idx - 1) % personalities.length],
      };
    });
    const gs = freshGameState(
      totalPlayers,
      { ...DEFAULT_SETTINGS },
      [...aiPlayerIndices],
      aiConfigs,
    );
    setMyIdx(0);
    myIdxRef.current = 0;
    setIsLocalGame(true);
    prevPositionsRef.current = null;
    setGameState(gs);
    setScreen("game");
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || myIdx === null) return;
    setChatInput("");
    const me = safePlayers(gsRef.current)[myIdx];
    const token = me?.token || PLAYER_TOKENS[myIdx] || "?";
    const msgId = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    await update(ref(db, `games/${roomCode}/chat`), {
      [msgId]: { id: myIdx, token, text, ts: Date.now() },
    });
  };

  const resetToLobby = () => {
    setScreen("lobby");
    setGameState(null);
    setRoomCode("");
    setMyIdx(null);
    setShowSettings(false);
    prevPositionsRef.current = null;
    setSellToPay(null);
    setIsLocalGame(false);
    setSelectedSpace(null);
  };

  const boardScale = layoutFocus === "board" ? 1.2 : 0.9;
  const CORNER = Math.round(68 * boardScale),
    CELL = Math.round(46 * boardScale);
  const cols = [CORNER, ...Array(9).fill(CELL), CORNER];
  const rows = [CORNER, ...Array(9).fill(CELL), CORNER];

  // ════════════════════════════════════════════════════════════
  // LOBBY
  // ════════════════════════════════════════════════════════════
  if (screen === "lobby") {
    const DIFF_INFO = {
      easy: {
        label: "Easy",
        emoji: "🟢",
        desc: "Buys casually, builds slowly",
      },
      medium: {
        label: "Medium",
        emoji: "🟡",
        desc: "Balanced — competes seriously",
      },
      hard: { label: "Hard", emoji: "🟠", desc: "Monopoly-focused, long-term" },
      strategic: {
        label: "Strategic",
        emoji: "🔴",
        desc: "Calculates risk, targets leaders",
      },
    };
    const PERS_INFO = {
      aggressive: {
        label: "Aggressive",
        emoji: "⚔️",
        desc: "Buys everything, builds fast",
      },
      conservative: {
        label: "Conservative",
        emoji: "🛡️",
        desc: "Saves cash, avoids risk",
      },
      monopolist: {
        label: "Monopolist",
        emoji: "🏠",
        desc: "Obsessed with color sets",
      },
      random: { label: "Random", emoji: "🎲", desc: "Unpredictable & chaotic" },
    };
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(145deg,#14532d 0%,#166534 50%,#15803d 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia,serif",
          padding: 16,
        }}
      >
        <div
          style={{
            background: "#fefce8",
            borderRadius: 20,
            boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
            border: "4px solid #a16207",
            maxWidth: 480,
            width: "100%",
            overflow: "hidden",
          }}
        >
          {/* Title */}
          <div
            style={{
              textAlign: "center",
              padding: "28px 32px 20px",
              borderBottom: "2px solid #e7d9a0",
            }}
          >
            <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 6 }}>
              🎲
            </div>
            <h1
              style={{
                margin: "0 0 4px",
                fontSize: 30,
                letterSpacing: 4,
                color: "#14532d",
                fontFamily: "Georgia",
              }}
            >
              MONOPOLY
            </h1>
            <p style={{ color: "#78716c", fontSize: 13, margin: 0 }}>
              Online Multiplayer &amp; AI Mode
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{ display: "flex", borderBottom: "2px solid #e7d9a0" }}>
            {[
              ["multiplayer", "🌐 Multiplayer"],
              ["ai", "🤖 vs AI"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setLobbyMode(mode)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  background: lobbyMode === mode ? "#14532d" : "#fefce8",
                  color: lobbyMode === mode ? "#fff" : "#78716c",
                  borderBottom:
                    lobbyMode === mode
                      ? "3px solid #14532d"
                      : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: "24px 28px 28px" }}>
            {/* ── MULTIPLAYER TAB ── */}
            {lobbyMode === "multiplayer" && (
              <>
                <div
                  style={{
                    marginBottom: 20,
                    padding: 18,
                    background: "#f0fdf4",
                    borderRadius: 10,
                    border: "2px solid #bbf7d0",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 10px",
                      color: "#14532d",
                      fontSize: 15,
                    }}
                  >
                    🏠 Create a Game
                  </h3>
                  <p
                    style={{ fontSize: 12, color: "#555", margin: "0 0 10px" }}
                  >
                    Number of Players
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setPlayerCount(n)}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: "50%",
                          fontSize: 17,
                          fontWeight: "bold",
                          border:
                            playerCount === n
                              ? "3px solid #14532d"
                              : "2px solid #d4c89a",
                          background: playerCount === n ? "#14532d" : "#fff",
                          color: playerCount === n ? "#fff" : "#333",
                          cursor: "pointer",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={createGame}
                    style={{
                      background: "#14532d",
                      color: "#fff",
                      border: "none",
                      padding: "12px 0",
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: "bold",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Create Game →
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: "#d6d3d1" }} />
                  <span style={{ color: "#a8a29e", fontSize: 12 }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: "#d6d3d1" }} />
                </div>

                <div
                  style={{
                    padding: 18,
                    background: "#eff6ff",
                    borderRadius: 10,
                    border: "2px solid #bfdbfe",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 10px",
                      color: "#1e40af",
                      fontSize: 15,
                    }}
                  >
                    🔗 Join a Game
                  </h3>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && joinGame()}
                    placeholder="Enter room code"
                    maxLength={6}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: 20,
                      textAlign: "center",
                      border: "2px solid #93c5fd",
                      borderRadius: 8,
                      fontFamily: "monospace",
                      letterSpacing: 6,
                      marginBottom: 10,
                      outline: "none",
                      fontWeight: "bold",
                      boxSizing: "border-box",
                    }}
                  />
                  {error && (
                    <p
                      style={{
                        color: "#dc2626",
                        fontSize: 12,
                        margin: "0 0 8px",
                      }}
                    >
                      {error}
                    </p>
                  )}
                  <button
                    onClick={joinGame}
                    style={{
                      background: "#1e40af",
                      color: "#fff",
                      border: "none",
                      padding: "12px 0",
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: "bold",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Join Game →
                  </button>
                </div>
              </>
            )}

            {/* ── AI MODE TAB ── */}
            {lobbyMode === "ai" && (
              <>
                <div
                  style={{
                    background: "#f0fdf4",
                    borderRadius: 12,
                    padding: 16,
                    border: "2px solid #bbf7d0",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      color: "#14532d",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    🤖 <span>AI Opponents</span>
                    <span
                      style={{
                        fontWeight: "normal",
                        color: "#78716c",
                        fontSize: 12,
                      }}
                    >
                      (you are always Player 1)
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "center",
                    }}
                  >
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => setAiOpponentCount(n)}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: "bold",
                          border:
                            aiOpponentCount === n
                              ? "3px solid #14532d"
                              : "2px solid #d4c89a",
                          background:
                            aiOpponentCount === n ? "#14532d" : "#fff",
                          color: aiOpponentCount === n ? "#fff" : "#333",
                          cursor: "pointer",
                        }}
                      >
                        {n} AI{n > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      color: "#14532d",
                      marginBottom: 8,
                    }}
                  >
                    🎯 Difficulty
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                    }}
                  >
                    {Object.entries(DIFF_INFO).map(
                      ([key, { label, emoji, desc }]) => (
                        <button
                          key={key}
                          onClick={() => setAiDifficulty(key)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: "bold",
                            border:
                              aiDifficulty === key
                                ? "3px solid #14532d"
                                : "2px solid #d6d3d1",
                            background:
                              aiDifficulty === key ? "#dcfce7" : "#fff",
                            cursor: "pointer",
                            textAlign: "left",
                            lineHeight: 1.3,
                          }}
                        >
                          <div style={{ fontSize: 14, marginBottom: 2 }}>
                            {emoji} {label}
                          </div>
                          <div
                            style={{
                              fontWeight: "normal",
                              color: "#78716c",
                              fontSize: 11,
                            }}
                          >
                            {desc}
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* Personality */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      color: "#14532d",
                      marginBottom: 8,
                    }}
                  >
                    🎭 AI Play Style
                    <span
                      style={{
                        fontWeight: "normal",
                        color: "#78716c",
                        fontSize: 11,
                        marginLeft: 6,
                      }}
                    >
                      (each AI gets a different style automatically)
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                    }}
                  >
                    {Object.entries(PERS_INFO).map(
                      ([key, { label, emoji, desc }]) => (
                        <div
                          key={key}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            fontSize: 11,
                            border: "2px solid #e5e7eb",
                            background: "#f9fafb",
                            lineHeight: 1.3,
                          }}
                        >
                          <div style={{ fontWeight: "bold", marginBottom: 2 }}>
                            {emoji} {label}
                          </div>
                          <div style={{ color: "#78716c" }}>{desc}</div>
                        </div>
                      ),
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      margin: "8px 0 0",
                      textAlign: "center",
                    }}
                  >
                    With {aiOpponentCount} opponent
                    {aiOpponentCount > 1 ? "s" : ""}, each gets a unique style
                  </p>
                </div>

                {/* Summary */}
                <div
                  style={{
                    background: "#fef3c7",
                    border: "2px solid #f59e0b",
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginBottom: 16,
                    fontSize: 12,
                    color: "#92400e",
                  }}
                >
                  <strong>You vs {aiOpponentCount} AI</strong> —{" "}
                  {DIFF_INFO[aiDifficulty].label} difficulty
                  {aiOpponentCount === 1 &&
                    ` • ${Object.values(PERS_INFO)[0].label} style`}
                </div>

                <button
                  onClick={startAIGame}
                  style={{
                    background: "linear-gradient(135deg,#14532d,#15803d)",
                    color: "#fff",
                    border: "none",
                    padding: "14px 0",
                    borderRadius: 10,
                    fontSize: 16,
                    fontWeight: "bold",
                    cursor: "pointer",
                    width: "100%",
                    boxShadow: "0 4px 14px rgba(20,83,45,0.4)",
                    letterSpacing: 0.5,
                  }}
                >
                  🎮 Play vs AI — Start Game
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // WAITING
  // ════════════════════════════════════════════════════════════
  if (screen === "waiting") {
    const maxPlayers = gameState?.hostPlayerCount || playerCount;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(145deg,#14532d,#166534)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia,serif",
          padding: 16,
        }}
      >
        <div
          style={{
            background: "#fefce8",
            borderRadius: 16,
            padding: "36px 40px",
            textAlign: "center",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            border: "4px solid #a16207",
            maxWidth: 440,
            width: "100%",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 8 }}>⏳</div>
          <h2 style={{ color: "#14532d", margin: "0 0 6px", fontSize: 20 }}>
            Waiting for Players
          </h2>
          <p style={{ color: "#78716c", fontSize: 13, marginBottom: 20 }}>
            {lobbyPlayers.length}/{maxPlayers} joined
          </p>

          <div
            style={{
              background: "#14532d",
              borderRadius: 10,
              padding: "14px 24px",
              marginBottom: 20,
            }}
          >
            <p
              style={{
                color: "#86efac",
                fontSize: 11,
                margin: "0 0 4px",
                letterSpacing: 2,
              }}
            >
              ROOM CODE
            </p>
            <div
              style={{
                color: "#fff",
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: 10,
                fontFamily: "monospace",
              }}
            >
              {roomCode}
            </div>
            <p style={{ color: "#86efac", fontSize: 11, margin: "6px 0 0" }}>
              Share with friends
            </p>
          </div>

          {Array.from({ length: maxPlayers }, (_, i) => {
            const p = lobbyPlayers[i];
            const isAI = (settings.aiPlayers || []).includes(i);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderRadius: 8,
                  marginBottom: 6,
                  background: p ? "#f0fdf4" : "#f5f5f4",
                  border: p ? "2px solid #bbf7d0" : "2px dashed #d6d3d1",
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {isAI ? "🤖" : p ? PLAYER_TOKENS[i] : "⬜"}
                </span>
                <span
                  style={{
                    fontWeight: "bold",
                    color: p ? PLAYER_COLORS[i] : "#a8a29e",
                    fontSize: 13,
                  }}
                >
                  {isAI
                    ? `P${i + 1} AI`
                    : p
                      ? `Player ${i + 1}${i === myIdx ? " (You)" : ""}`
                      : i === 0
                        ? "Connecting..."
                        : "Waiting..."}
                </span>
                {p && (
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "#16a34a",
                      fontSize: 12,
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}

          {/* Settings summary */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: "8px 12px",
              margin: "12px 0",
              fontSize: 12,
              color: "#555",
              textAlign: "left",
            }}
          >
            <strong style={{ color: "#14532d" }}>Settings: </strong>
            {settings.turnTimer
              ? `${settings.turnTimer}s timer`
              : "No timer"} •{" "}
            {settings.gameMode === "classic"
              ? "Classic"
              : settings.gameMode === "timed"
                ? `Timed ${settings.timedMinutes}min`
                : `Target $${(settings.targetAmount || 10000).toLocaleString()}`}
            {(settings.aiPlayers || []).length > 0 &&
              ` • ${settings.aiPlayers.length} AI`}
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {isHost && (
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: "#1e40af",
                  color: "#fff",
                  border: "none",
                  padding: "11px 0",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ⚙️ Change Game Settings
              </button>
            )}
            {isHost && lobbyPlayers.length >= 2 && (
              <button
                onClick={() => startGame(lobbyPlayers.length)}
                style={{
                  background: "#14532d",
                  color: "#fff",
                  border: "none",
                  padding: "11px 0",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ▶ Start Game ({lobbyPlayers.length} players)
              </button>
            )}
            {isHost && lobbyPlayers.length < 2 && (
              <p style={{ color: "#78716c", fontSize: 13 }}>
                Need at least 2 players to start
              </p>
            )}
            {!isHost && (
              <p style={{ color: "#78716c", fontSize: 13 }}>
                Waiting for host to start...
              </p>
            )}
          </div>
        </div>

        {/* Settings popup */}
        {showSettings && isHost && (
          <SettingsModal
            settings={settings}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
            playerCount={playerCount}
            setPlayerCount={setPlayerCount}
            maxPlayers={lobbyPlayers.length || playerCount}
          />
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // GAME OVER
  // ════════════════════════════════════════════════════════════
  if (gameState?.status === "gameover") {
    const ps = safePlayers(gameState);
    const alive = ps.filter((p) => !p.bankrupt);
    const winner =
      alive.length > 0
        ? alive.reduce((a, b) => (a.money > b.money ? a : b))
        : ps[0];
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(145deg,#14532d,#15803d)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia,serif",
          padding: 16,
        }}
      >
        <div
          style={{
            background: "#fefce8",
            borderRadius: 16,
            padding: "40px 36px",
            textAlign: "center",
            border: "4px solid gold",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            maxWidth: 380,
            width: "100%",
          }}
        >
          <div style={{ fontSize: 80 }}>🏆</div>
          <h2 style={{ fontSize: 28, color: "#14532d" }}>GAME OVER!</h2>
          {winner && (
            <>
              <p style={{ fontSize: 20 }}>
                {winner.token} Player {winner.id + 1}
                {winner.isAI ? " 🤖" : ""} wins!
              </p>
              <p style={{ color: "#333", fontWeight: "bold" }}>
                💰 ${winner.money.toLocaleString()}
              </p>
            </>
          )}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {ps
              .sort((a, b) => b.money - a.money)
              .map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    background: p.id === winner?.id ? "#dcfce7" : "#f5f5f4",
                    borderRadius: 8,
                    border:
                      p.id === winner?.id
                        ? "2px solid #14532d"
                        : "1px solid #e5e7eb",
                  }}
                >
                  {p.id === winner?.id && <span>🏆</span>}
                  <span style={{ fontSize: 20 }}>{p.token}</span>
                  <span
                    style={{ fontWeight: "bold", color: PLAYER_COLORS[p.id] }}
                  >
                    P{p.id + 1}
                    {p.isAI ? " 🤖" : ""}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontWeight: "bold",
                      color: "#111",
                    }}
                  >
                    ${p.money.toLocaleString()}
                  </span>
                  {p.bankrupt && (
                    <span style={{ fontSize: 11, color: "#dc2626" }}>💸</span>
                  )}
                </div>
              ))}
          </div>
          <button
            onClick={resetToLobby}
            style={{
              marginTop: 20,
              background: "#14532d",
              color: "#fff",
              border: "none",
              padding: "12px 32px",
              borderRadius: 8,
              fontSize: 15,
              cursor: "pointer",
              fontWeight: "bold",
              width: "100%",
            }}
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════
  if (
    !gameState ||
    !Array.isArray(gameState.players) ||
    gameState.players.length === 0
  ) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#14532d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "4px solid #86efac",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ color: "#86efac", fontSize: 18, fontFamily: "Georgia" }}>
          Joining game...
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // GAME BOARD
  // ════════════════════════════════════════════════════════════
  const rawPlayers = safePlayers(gameState);
  const displayPlayers = rawPlayers.map((p) => {
    if (!p) return p;
    const vis = visualPositions[p.id];
    return vis !== undefined ? { ...p, position: vis } : p;
  });
  const props = safeProps(gameState);
  const logArr = safeLog(gameState);
  const diceArr = safeDice(gameState);
  const isRolling = gameState.rolling === true;
  const cur = rawPlayers[gameState.currentPlayer];
  const me = rawPlayers[myIdx] || null;
  const modal = gameState.modal || null;
  const gs_s = safeSettings(gameState);

  // My properties for building panel
  const myProps = Object.entries(props).filter(
    ([, p]) => p && p.owner === myIdx,
  );


  const wealthSeries = wealthHistory.length
    ? wealthHistory
    : [
      {
        values: rawPlayers.map((pl, i) => ({
          id: i,
          net: (pl?.money || 0) + estimateAssetValueForPlayer(i, props),
          assets: estimateAssetValueForPlayer(i, props),
        })),
        event: "",
      },
    ];
  const seriesValues = wealthSeries.flatMap((pt) =>
    pt.values.map((v) => (wealthMode === "net" ? v.net : v.assets)),
  );
  const chartMin = Math.min(...seriesValues, 0);
  const chartMax = Math.max(...seriesValues, 1);

  const playerProbabilities = rawPlayers.map((pl, pid) => {
    if (!pl || pl.bankrupt) return { pid, chance: 0, progress: "Out" };
    let bestChance = 0;
    let bestProgress = "0/0";
    Object.entries(COLOR_GROUPS).forEach(([color, ids]) => {
      const owned = ids.filter((id) => props[id]?.owner === pid).length;
      const blocked = ids.filter(
        (id) => props[id] && props[id].owner !== pid,
      ).length;
      const unowned = ids.length - owned - blocked;
      const chance = clamp(
        (owned / ids.length) * 70 +
        (unowned / ids.length) * 20 -
        (blocked / ids.length) * 60,
      );
      if (chance > bestChance) {
        bestChance = chance;
        bestProgress = `${owned}/${ids.length} ${COLOR_LABELS[color] || "Set"}`;
      }
    });
    return { pid, chance: Math.round(bestChance), progress: bestProgress };
  });

  const riskByPlayer = rawPlayers.map((pl, pid) => {
    if (!pl || pl.bankrupt) return { pid, risk: 100, label: "Critical" };
    const cash = pl.money || 0;
    let risk = cash < 150 ? 60 : cash < 300 ? 45 : cash < 600 ? 25 : 10;
    const lookAhead = Array.from(
      { length: 8 },
      (_, i) => (pl.position + i + 1) % 40,
    );
    const maxUpcoming = Math.max(
      0,
      ...lookAhead.map((id) => {
        const prop = props[id];
        if (!prop || prop.owner === pid) return 0;
        return estimatePropertyRent(id, prop, props);
      }),
    );
    risk += Math.min(35, maxUpcoming * 0.12);
    const oppMono = Object.values(COLOR_GROUPS).filter((ids) => {
      const owners = ids
        .map((id) => props[id]?.owner)
        .filter((v) => v !== undefined);
      return owners.length === ids.length && owners[0] !== pid;
    }).length;
    risk += oppMono * 8;
    const assets = estimateAssetValueForPlayer(pid, props);
    if (assets < 400) risk += 8;
    const rounded = Math.round(clamp(risk));
    const label =
      rounded < 30
        ? "Low"
        : rounded < 55
          ? "Medium"
          : rounded < 75
            ? "High"
            : "Critical";
    return { pid, risk: rounded, label };
  });

  const colorSetInsights = Object.entries(COLOR_GROUPS)
    .map(([color, ids]) => {
      const owner = props[ids[0]]?.owner;
      const monopoly =
        owner !== undefined && ids.every((id) => props[id]?.owner === owner);
      if (!monopoly) return null;
      const rents = ids.map((id) => estimatePropertyRent(id, props[id], props));
      const incomePotential = rents.reduce((a, b) => a + b, 0);
      const upgrades = ids.reduce(
        (n, id) => n + (props[id]?.houses || 0) + (props[id]?.hotel ? 5 : 0),
        0,
      );
      return {
        color,
        owner,
        ids,
        incomePotential,
        upgrades,
        topRent: Math.max(...rents, 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.incomePotential - a.incomePotential);

  const dangerousZones = Object.entries(props)
    .map(([id, prop]) => ({
      id: +id,
      owner: prop?.owner,
      rent: estimatePropertyRent(+id, prop, props),
    }))
    .filter((z) => z.rent > 0)
    .sort((a, b) => b.rent - a.rent)
    .slice(0, 3);

  return (
    <div className="game-root">
      {/* ── Header ── */}
      <div
        style={{
          background: "#fefce8",
          borderRadius: 8,
          padding: "5px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "2px solid #a16207",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: "bold",
              letterSpacing: 2,
              color: "#14532d",
            }}
          >
            🎲 MONOPOLY
          </span>
          <span
            style={{
              fontSize: 10,
              background: "#14532d",
              color: "#fff",
              padding: "2px 7px",
              borderRadius: 10,
              fontFamily: "monospace",
            }}
          >
            {roomCode}
          </span>
          <span
            style={{
              fontSize: 10,
              background: "#1e40af",
              color: "#fff",
              padding: "2px 7px",
              borderRadius: 10,
            }}
          >
            {gs_s.gameMode === "classic"
              ? "⚔️ Classic"
              : gs_s.gameMode === "timed"
                ? `⏱ ${gs_s.timedMinutes}min`
                : `🎯 $${(gs_s.targetAmount || 10000).toLocaleString()}`}
          </span>
          <button
            onClick={() =>
              setLayoutFocus((prev) => (prev === "board" ? "panel" : "board"))
            }
            className="pill"
            style={{ padding: "2px 8px", fontSize: 10 }}
            title="Toggle board and side-panel emphasis"
          >
            {layoutFocus === "board" ? "🧩 Board Focus" : "📋 Panel Focus"}
          </button>
        </div>
        {/* Player chips */}
        <div
          style={{
            display: "flex",
            gap: 5,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {rawPlayers.map((p, i) =>
            p ? (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  opacity: p.bankrupt ? 0.4 : 1,
                  background:
                    gameState.currentPlayer === i
                      ? "#dcfce7"
                      : i === myIdx
                        ? "#fef9c3"
                        : "#f9f5e8",
                  border:
                    gameState.currentPlayer === i
                      ? "2px solid #14532d"
                      : i === myIdx
                        ? "2px solid #ca8a04"
                        : "2px solid #e5e7eb",
                  borderRadius: 6,
                  padding: "2px 7px",
                  transition: "background 0.3s",
                }}
              >
                <span style={{ fontSize: 14 }}>{p.token}</span>
                <div>
                  <div
                    style={{ fontSize: 9, fontWeight: "bold", color: p.color }}
                  >
                    P{i + 1}
                    {p.isAI ? " 🤖" : ""}
                    {i === myIdx ? " ★" : ""}
                  </div>
                  <div
                    style={{ fontSize: 9, color: "#111", fontWeight: "bold" }}
                  >
                    ${p.money.toLocaleString()}
                  </div>
                </div>
                {p.inJail && <span style={{ fontSize: 9 }}>🔒</span>}
                {(p.frozenTurns || 0) > 0 && (
                  <span className="frozen-badge">❄️{p.frozenTurns}</span>
                )}
                {(p.rentImmuneTurns || 0) > 0 && (
                  <span className="immune-badge">🛡️</span>
                )}
                {(p.jailFreeCards || 0) > 0 && (
                  <span style={{ fontSize: 9 }}>🃏×{p.jailFreeCards}</span>
                )}
                {p.bankrupt && <span style={{ fontSize: 9 }}>💸</span>}
              </div>
            ) : null,
          )}
          {gs_s.gameMode === "timed" && gameState.gameStartTime && (
            <GameTimer
              gameStartTime={gameState.gameStartTime}
              limitMinutes={gs_s.timedMinutes || 60}
              onExpire={() => {
                if (myIdx === 0) {
                  const log = safeLog(gsRef.current);
                  log.unshift("⏰ Time's up!");
                  pushState({
                    ...gsRef.current,
                    status: "gameover",
                    log: log.slice(0, 25),
                  });
                }
              }}
            />
          )}
        </div>
        <button
          onClick={resetToLobby}
          style={{
            background: "#dc2626",
            color: "#fff",
            border: "none",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Leave
        </button>
      </div>

      {/* ── Turn banner ── */}
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          fontWeight: "bold",
          color: isMyTurn ? "#86efac" : "#fca5a5",
          padding: "1px 0",
        }}
      >
        {isRolling
          ? `🎲 ${cur?.token || ""} P${(gameState.currentPlayer || 0) + 1}${cur?.isAI ? " 🤖" : ""} is rolling...`
          : isMyTurn
            ? "✅ YOUR TURN — Roll the dice!"
            : `⏳ ${cur?.token || ""} P${(gameState.currentPlayer || 0) + 1}${cur?.isAI ? " 🤖" : ""}'s turn...`}
      </div>

      {/* ── Sell-to-pay banner ── */}
      {sellToPay && sellToPay.playerId === myIdx && (
        <div
          style={{
            background: "#fee2e2",
            border: "2px solid #dc2626",
            borderRadius: 8,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: "bold", color: "#dc2626" }}>
            💸 You owe ${sellToPay.amount.toLocaleString()}! Sell properties to
            pay your debt:
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {myProps.map(([id]) => {
              const space = SPACES[+id];
              return (
                <button
                  key={id}
                  onClick={() => sellProperty(+id)}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Sell {space?.name} (${Math.floor((space?.price || 0) / 2)})
                </button>
              );
            })}
          </div>
          {myProps.length === 0 && (
            <button
              onClick={() => setSellToPay(null)}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Declare Bankruptcy
            </button>
          )}
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="game-layout">
        {/* Board */}
        <div className="board-wrap">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols.map((w) => `${w}px`).join(" "),
              gridTemplateRows: rows.map((h) => `${h}px`).join(" "),
              gap: 1,
              background: "#82b366",
              border: "3px solid #4d7c0f",
              borderRadius: 6,
              padding: 1,
            }}
          >
            {CELL_POSITIONS.map(({ id, gridRow, gridColumn }) => (
              <div key={id} style={{ gridRow, gridColumn, display: "flex" }}>
                <BoardCell
                  spaceId={id}
                  players={displayPlayers}
                  properties={props}
                  isSelected={selectedSpace === id}
                  onClick={() => {
                    // Toggle selection — any space is clickable for info
                    setSelectedSpace((prev) => (prev === id ? null : id));
                  }}
                  flashCell={flashCell}
                  bouncingPlayer={bouncingPlayer}
                />
              </div>
            ))}
            {/* Center */}
            <div
              style={{
                gridRow: "2/11",
                gridColumn: "2/11",
                background: "#c8e6c9",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                borderRadius: 4,
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: 5,
                  color: "#14532d",
                  fontFamily: "Times New Roman",
                  transform: "rotate(-35deg)",
                  userSelect: "none",
                }}
              >
                MONOPOLY
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#555",
                  background: "#fff8",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                🅿️ ${gameState.freePot || 0}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {diceArr.map((d, i) => (
                  <DieFace
                    key={i}
                    value={d}
                    shaking={isRolling}
                    landing={diceLanding && !isRolling}
                  />
                ))}
              </div>
              {gs_s.turnTimer > 0 && isMyTurn && (
                <div style={{ width: 100 }}>
                  <TurnTimer
                    turnStartTime={gameState.turnStartTime || Date.now()}
                    limit={gs_s.turnTimer}
                    onExpire={handleTimerExpire}
                    isMyTurn={isMyTurn}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Board-level popup */}
          <BoardPopup
            modal={modal}
            players={rawPlayers}
            myIdx={myIdx}
            isMyTurn={isMyTurn}
            onBuy={buyProperty}
            onPass={() => pushState({ ...gameState, modal: null })}
            onDismiss={dismissModal}
            onUseJailCard={handleUseJailCard}
            onPayJailFine={handlePayJailFine}
            onJailRoll={handleJailRoll}
            onSteal={handleSteal}
            onSwap={handleSwap}
            onBuildHouse={buildHouse}
            props={props}
            rawPlayers={rawPlayers}
          />
        </div>

        {/* Right panel */}
        <div
          className="right-panel"
          style={{ flex: layoutFocus === "board" ? "0 0 50%" : "0 0 50%" }}
        >
          <div className="strategy-panel">
            {/* Controls */}
            {me && !me.bankrupt && (
              <div
                style={{
                  background: "#fefce8",
                  border: "2px solid #a16207",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{me.token}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "bold",
                        color: me.color,
                        fontSize: 13,
                      }}
                    >
                      You (P{myIdx + 1})
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#111",
                        fontWeight: "bold",
                      }}
                    >
                      ${me.money.toLocaleString()}
                    </div>
                    {(me.jailFreeCards || 0) > 0 && (
                      <div style={{ fontSize: 10, color: "#7c3aed" }}>
                        🃏 Jail Free ×{me.jailFreeCards}
                      </div>
                    )}
                    {(me.doubleRentTurns || 0) > 0 && (
                      <div style={{ fontSize: 10, color: "#d97706" }}>
                        💰 Double rent ×{me.doubleRentTurns}
                      </div>
                    )}
                    {(me.rentImmuneTurns || 0) > 0 && (
                      <div style={{ fontSize: 10, color: "#16a34a" }}>
                        🛡️ Rent immune
                      </div>
                    )}
                    {(me.frozenTurns || 0) > 0 && (
                      <div style={{ fontSize: 10, color: "#0284c7" }}>
                        ❄️ Frozen {me.frozenTurns} turn(s)
                      </div>
                    )}
                  </div>
                  {me.inJail && (
                    <span
                      style={{
                        fontSize: 10,
                        background: "#fef08a",
                        padding: "2px 5px",
                        borderRadius: 4,
                      }}
                    >
                      🔒 JAIL
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={handleRoll}
                    disabled={
                      !isMyTurn || gameState.rolled || processing || !!sellToPay
                    }
                    style={{
                      background:
                        !isMyTurn || gameState.rolled || processing || sellToPay
                          ? "#e5e7eb"
                          : "#14532d",
                      color:
                        !isMyTurn || gameState.rolled || processing || sellToPay
                          ? "#9ca3af"
                          : "#fff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: 6,
                      fontSize: 13,
                      cursor:
                        !isMyTurn || gameState.rolled || processing || sellToPay
                          ? "default"
                          : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    🎲 Roll
                  </button>
                  <button
                    onClick={endTurn}
                    disabled={
                      !isMyTurn ||
                      !gameState.rolled ||
                      processing ||
                      !!sellToPay
                    }
                    style={{
                      background:
                        !isMyTurn ||
                          !gameState.rolled ||
                          processing ||
                          sellToPay
                          ? "#e5e7eb"
                          : "#dc2626",
                      color:
                        !isMyTurn ||
                          !gameState.rolled ||
                          processing ||
                          sellToPay
                          ? "#9ca3af"
                          : "#fff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: 6,
                      fontSize: 13,
                      cursor:
                        !isMyTurn ||
                          !gameState.rolled ||
                          processing ||
                          sellToPay
                          ? "default"
                          : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    End →
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Analytics Dashboard */}
            <div className="analytics-panel">
              <div className="analytics-title">
                📊 STRATEGY DASHBOARD (LIVE)
              </div>

              <div className="analytics-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: "bold",
                      color: "#0f766e",
                    }}
                  >
                    Wealth Growth
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className={`pill ${wealthMode === "net" ? "active" : ""}`}
                      onClick={() => setWealthMode("net")}
                      style={{ padding: "2px 8px", fontSize: 10 }}
                    >
                      Net Worth
                    </button>
                    <button
                      className={`pill ${wealthMode === "assets" ? "active" : ""}`}
                      onClick={() => setWealthMode("assets")}
                      style={{ padding: "2px 8px", fontSize: 10 }}
                    >
                      Assets
                    </button>
                  </div>
                </div>
                <svg
                  width="100%"
                  viewBox="0 0 300 110"
                  style={{
                    background: "#f8fafc",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {rawPlayers.map((p, pid) => {
                    if (!p) return null;
                    const pts = wealthSeries
                      .map((pt, idx) => {
                        const v = pt.values.find((x) => x.id === pid);
                        const value =
                          wealthMode === "net" ? v?.net || 0 : v?.assets || 0;
                        const x =
                          wealthSeries.length === 1
                            ? 10
                            : 10 + idx * (280 / (wealthSeries.length - 1));
                        const y =
                          100 -
                          ((value - chartMin) / (chartMax - chartMin || 1)) *
                          85;
                        return `${x},${y}`;
                      })
                      .join(" ");
                    return (
                      <polyline
                        key={pid}
                        points={pts}
                        fill="none"
                        stroke={PLAYER_COLORS[pid]}
                        strokeWidth="2.4"
                      />
                    );
                  })}
                  {wealthSeries.map((pt, idx) => {
                    if (!pt.event) return null;
                    const x =
                      wealthSeries.length === 1
                        ? 10
                        : 10 + idx * (280 / (wealthSeries.length - 1));
                    return (
                      <circle
                        key={`ev-${idx}`}
                        cx={x}
                        cy="12"
                        r="3"
                        fill="#f59e0b"
                      />
                    );
                  })}
                </svg>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
                  Orange dots mark big moments like monopoly swings,
                  bankruptcies, or heavy rent hits.
                </div>
              </div>

              <div className="analytics-card">
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#0f766e",
                    marginBottom: 6,
                  }}
                >
                  Monopoly Completion Chance
                </div>
                {playerProbabilities.map((p) => (
                  <div key={`prob-${p.pid}`} style={{ marginBottom: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                      }}
                    >
                      <span
                        style={{
                          color: PLAYER_COLORS[p.pid],
                          fontWeight: "bold",
                        }}
                      >
                        P{p.pid + 1}
                      </span>
                      <span>
                        {p.chance}% • {p.progress}
                      </span>
                    </div>
                    <div className="meter-track">
                      <div
                        style={{
                          width: `${p.chance}%`,
                          height: "100%",
                          background: PLAYER_COLORS[p.pid],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="analytics-card">
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#0f766e",
                    marginBottom: 6,
                  }}
                >
                  Bankruptcy Risk
                </div>
                {riskByPlayer.map((r) => {
                  const c =
                    r.risk < 30
                      ? "#16a34a"
                      : r.risk < 55
                        ? "#d97706"
                        : r.risk < 75
                          ? "#ea580c"
                          : "#dc2626";
                  return (
                    <div
                      key={`risk-${r.pid}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 5,
                        fontSize: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 34,
                          color: PLAYER_COLORS[r.pid],
                          fontWeight: "bold",
                        }}
                      >
                        P{r.pid + 1}
                      </span>
                      <div style={{ flex: 1 }} className="meter-track">
                        <div
                          style={{
                            width: `${r.risk}%`,
                            height: "100%",
                            background: c,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          color: c,
                          fontWeight: "bold",
                          minWidth: 52,
                          textAlign: "right",
                        }}
                      >
                        {r.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="analytics-card" style={{ marginBottom: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#0f766e",
                    marginBottom: 6,
                  }}
                >
                  Strongest Sets & Danger Zones
                </div>
                {colorSetInsights.length === 0 ? (
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    No complete monopoly set yet — trading and blocking are wide
                    open.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontSize: 10,
                    }}
                  >
                    {colorSetInsights.slice(0, 2).map((set, idx) => (
                      <div
                        key={`set-${idx}`}
                        style={{
                          padding: "4px 6px",
                          border: "1px solid #dbeafe",
                          borderRadius: 6,
                          background: "#f8fafc",
                        }}
                      >
                        <strong style={{ color: PLAYER_COLORS[set.owner] }}>
                          P{set.owner + 1}
                        </strong>{" "}
                        controls{" "}
                        <strong>{COLOR_LABELS[set.color] || "Color"}</strong> •
                        Potential ${set.incomePotential}/round • Upgrades{" "}
                        {set.upgrades}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: 10, color: "#475569" }}>
                  Danger zones:{" "}
                  {dangerousZones.length
                    ? dangerousZones
                      .map((z) => `${SPACES[z.id]?.name} ($${z.rent})`)
                      .join(" • ")
                    : "none yet"}
                </div>
              </div>
            </div>
          </div>

          <div className="details-panel">
            {/* My Properties panel */}
            {myProps.length > 0 && (
              <div
                style={{
                  background: "#fefce8",
                  border: "2px solid #a16207",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#14532d",
                    marginBottom: 6,
                    borderBottom: "1px solid #e7d9a0",
                    paddingBottom: 4,
                  }}
                >
                  🏠 Your Properties
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    maxHeight: 130,
                    overflowY: "auto",
                  }}
                >
                  {myProps.map(([id, prop]) => {
                    const space = SPACES[+id];
                    if (!space) return null;
                    const group = COLOR_GROUPS[space.color] || [];
                    const hasMonopoly =
                      space.type === "property" &&
                      group.every((sid) => props[sid]?.owner === myIdx);
                    // Only allow building from side panel if on that exact property
                    const playerOnThisProp = me && me.position === +id;
                    return (
                      <div
                        key={id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 10,
                          padding: "3px 6px",
                          borderRadius: 4,
                          background: hasMonopoly
                            ? `${space.color}22`
                            : "#f9f5e8",
                          border: `1px solid ${space.color || "#e5e7eb"}`,
                        }}
                      >
                        {space.color && (
                          <div
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: space.color,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {space.name}
                        </span>
                        {hasMonopoly && (
                          <span
                            style={{
                              fontSize: 9,
                              color: "#14532d",
                              fontWeight: "bold",
                            }}
                          >
                            MONO
                          </span>
                        )}
                        <span>
                          {prop.hotel
                            ? "🏨"
                            : prop.houses > 0
                              ? "🏠".repeat(prop.houses)
                              : ""}
                        </span>
                        {hasMonopoly &&
                          !prop.hotel &&
                          isMyTurn &&
                          playerOnThisProp && (
                            <button
                              onClick={() => buildHouse(+id)}
                              style={{
                                fontSize: 9,
                                background: "#14532d",
                                color: "#fff",
                                border: "none",
                                padding: "1px 6px",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                            >
                              +🏠
                            </button>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Properties */}
            <div
              style={{
                background: "#fefce8",
                border: "2px solid #a16207",
                borderRadius: 8,
                padding: 10,
                overflowY: "auto",
                maxHeight: 170,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: "bold",
                  borderBottom: "1px solid #e7d9a0",
                  paddingBottom: 4,
                  marginBottom: 6,
                }}
              >
                🗺️ All Properties
              </div>
              {Object.keys(props).length === 0 ? (
                <div
                  style={{
                    color: "#bbb",
                    fontSize: 11,
                    textAlign: "center",
                    padding: 8,
                  }}
                >
                  None sold yet
                </div>
              ) : (
                Object.entries(props).map(([id, prop]) => {
                  if (!prop) return null;
                  const space = SPACES[+id];
                  if (!space) return null;
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        padding: "2px 4px",
                        borderRadius: 3,
                        marginBottom: 2,
                        background: `${PLAYER_COLORS[prop.owner] || "#888"}18`,
                        border: `1px solid ${PLAYER_COLORS[prop.owner] || "#888"}44`,
                      }}
                    >
                      {space.color && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: space.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {space.name}
                      </span>
                      <span>{rawPlayers[prop.owner]?.token || "?"}</span>
                      {prop.hotel && <span>🏨</span>}
                      {!prop.hotel && (prop.houses || 0) > 0 && (
                        <span>{"🏠".repeat(prop.houses)}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Log */}
            <div
              style={{
                background: "#0f172a",
                borderRadius: 8,
                padding: 10,
                height: 100,
                overflowY: "auto",
                border: "2px solid #334155",
                flexShrink: 0,
              }}
            >
              {logArr.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    color: i === 0 ? "#86efac" : "#64748b",
                    fontSize: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {msg}
                </div>
              ))}
            </div>

            {/* Chat */}
            <div
              style={{
                background: "#1e293b",
                border: "2px solid #334155",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                minHeight: 160,
                maxHeight: 220,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: "5px 10px",
                  borderBottom: "1px solid #334155",
                  fontSize: 11,
                  fontWeight: "bold",
                  color: "#94a3b8",
                  letterSpacing: 1,
                }}
              >
                💬 CHAT
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "6px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                {chatMessages.length === 0 && (
                  <div
                    style={{
                      color: "#475569",
                      fontSize: 10,
                      textAlign: "center",
                      marginTop: 12,
                    }}
                  >
                    Say hi! 👋
                  </div>
                )}
                {chatMessages.map((msg, i) => {
                  const isMe = msg.id === myIdx;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: isMe ? "row-reverse" : "row",
                        alignItems: "flex-end",
                        gap: 3,
                      }}
                    >
                      <span style={{ fontSize: 12, flexShrink: 0 }}>
                        {msg.token}
                      </span>
                      <div
                        style={{
                          background: isMe ? "#14532d" : "#334155",
                          color: "#f1f5f9",
                          padding: "4px 8px",
                          borderRadius: isMe
                            ? "10px 10px 2px 10px"
                            : "10px 10px 10px 2px",
                          fontSize: 11,
                          maxWidth: "80%",
                          wordBreak: "break-word",
                          lineHeight: 1.4,
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div
                style={{
                  display: "flex",
                  borderTop: "1px solid #334155",
                  padding: 5,
                  gap: 4,
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendChat();
                  }}
                  placeholder="Type..."
                  maxLength={120}
                  style={{
                    flex: 1,
                    background: "#0f172a",
                    border: "1px solid #475569",
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: "#f1f5f9",
                    fontSize: 11,
                    outline: "none",
                  }}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim()}
                  style={{
                    background: chatInput.trim() ? "#14532d" : "#1e293b",
                    color: chatInput.trim() ? "#fff" : "#475569",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 13,
                    cursor: chatInput.trim() ? "pointer" : "default",
                    fontWeight: "bold",
                  }}
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ── Property Card Modal (triggered by clicking any board space) ── */}
      {selectedSpace !== null &&
        (() => {
          const selSpace = SPACES[selectedSpace];
          if (!selSpace) return null;
          const selProp = props[selectedSpace] ?? null;
          const mePlayer = rawPlayers[myIdx];
          // ── BUG FIX 1: buy only if physically on the space ──
          const playerIsOnSpace =
            mePlayer && mePlayer.position === selectedSpace;
          // ── BUG FIX 2: build only on the specific landed space ──
          const group = COLOR_GROUPS[selSpace.color] || [];
          const hasMonopoly =
            selSpace.type === "property" &&
            group.length > 0 &&
            group.every((id) => props[id]?.owner === myIdx);
          // Build only allowed on the exact space the player just landed on
          const isMyLandedProp =
            selProp && selProp.owner === myIdx && playerIsOnSpace;

          const handleCardBuild = (spaceId) => {
            // Extra guard: must be on this specific space
            if (!isMyLandedProp || !hasMonopoly || spaceId !== selectedSpace)
              return;
            buildHouse(spaceId);
          };

          const handleCardBuy = () => {
            // Must be on the space AND it must be unowned AND it must be my turn
            if (!isMyTurn || selProp || !playerIsOnSpace) return;
            setSelectedSpace(null);
            pushState({
              ...gameState,
              modal: { type: "buy", spaceId: selectedSpace, playerIdx: myIdx },
            });
          };

          return (
            <PropertyCardModal
              spaceId={selectedSpace}
              prop={selProp}
              players={rawPlayers}
              myIdx={myIdx}
              isMyTurn={isMyTurn}
              allProps={props}
              playerIsOnSpace={playerIsOnSpace}
              onClose={() => setSelectedSpace(null)}
              onBuild={isMyLandedProp && hasMonopoly ? handleCardBuild : null}
              onBuy={
                selSpace.price && !selProp && isMyTurn && playerIsOnSpace
                  ? handleCardBuy
                  : null
              }
            />
          );
        })()}
    </div>
  );
}
