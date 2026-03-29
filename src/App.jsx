import { useState, useEffect, useRef, useCallback } from "react";
import { ref, set, onValue, update, runTransaction } from "firebase/database";

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
  ROUND_EVENTS,
  PLAYER_COLORS,
  PLAYER_TOKENS,
  CELL_POSITIONS,
  DEFAULT_SETTINGS,
  COLOR_LABELS,
} from "./constants";

// ─── Utility helpers ─────────────────────────────────────────────────────────
import {
  generateCode,
  safePlayers,
  safeProps,
  safeLog,
  safeSettings,
  estimateAssetValueForPlayer,
  marketGroupKey,
  randomMarketModifiers,
  freshGameState,
  eligibleTransferPropertyIds,
  calculateMonopolyChance,
  calculateBankruptcyRisk,
  getColorSetInsights,
  getDangerousZones,
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
import BoardPopup from "./components/BoardPopup";
import TurnTimer from "./components/TurnTimer";
import GameTimer from "./components/GameTimer";
import LobbyView from "./components/LobbyView";
import WaitingView from "./components/WaitingView";
import GameOverView from "./components/GameOverView";
import ChatBox from "./components/ChatBox";
import GameHeader from "./components/GameHeader";
import TurnBanner from "./components/TurnBanner";
import BoardView from "./components/BoardView";
import SidePanelView from "./components/SidePanelView";
import { playSound } from "./soundManager";

import "./game.css";


const ROULETTE_OUTCOMES = [
  { label: "Reward $100", type: "reward", amount: 100 },
  { label: "Swap Property", type: "swap" },
  { label: "Reward $200", type: "reward", amount: 200 },
  { label: "Steal Property", type: "steal" },
  { label: "Reward $150", type: "reward", amount: 150 },
  { label: "Better Luck Next Time", type: "none" },
];

const PROPERTY_ACTION_TYPES = ["property", "railroad", "utility"];

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
  const [codeCopied, setCodeCopied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [audioSettings, setAudioSettings] = useState({
    masterVolume: 0.8,
    musicVolume: 0.5,
    effectsVolume: 0.9,
    muted: false,
  });
  const [tradeDraft, setTradeDraft] = useState({
    offerPropertyId: "",
    requestPropertyId: "",
    requestCash: 0,
  });
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const playerPositionsKey = gameState?.players
    ?.map((p) => `${p?.position ?? ""}`)
    .join(",");
  const latestLogEntry = gameState?.log?.[0] || "";

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  useEffect(() => {
    if (windowWidth >= 600 && mobileChatOpen) setMobileChatOpen(false);
  }, [windowWidth, mobileChatOpen]);

  useEffect(() => {
    const msg = latestLogEntry || "";
    if (!msg) return;
    if (/rolls|Auto-rolling/i.test(msg)) playSound("diceRoll", audioSettings);
    else if (/bought/i.test(msg)) playSound("purchase", audioSettings);
    else if (/rent/i.test(msg)) playSound("rent", audioSettings);
    else if (/BANKRUPT/i.test(msg)) playSound("bankrupt", audioSettings);
    else if (/Market shifted|Property Boom|Civic Audit|Build Subsidy/i.test(msg))
      playSound("event", audioSettings);
  }, [latestLogEntry, audioSettings]);

  const gsRef = useRef(null);
  const myIdxRef = useRef(null);
  const aiTimerRef = useRef(null);
  const prevRollingRef = useRef(false);
  const prevPositionsRef = useRef(null);
  const prevDiceRef = useRef([1, 1]);

  gsRef.current = gameState;
  myIdxRef.current = myIdx;


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

      if (data.rolling) setDiceLanding(false);
      if (Array.isArray(data.dice) && data.dice.length === 2) {
        prevDiceRef.current = data.dice;
      }
      setGameState(data);
      if (data.status === "playing" && screen === "waiting") setScreen("game");
    });
    return () => unsub();
  }, [roomCode, screen]);

  const isRollingActive = gameState?.rolling;
  useEffect(() => {
    const prevRolling = prevRollingRef.current;
    const currentRolling = isRollingActive;
    prevRollingRef.current = !!currentRolling;

    if (prevRolling === true && !currentRolling) {
      setDiceLanding(true);
      setTimeout(() => setDiceLanding(false), 800);
    }
  }, [isRollingActive]);

  useEffect(() => {
    if (!isLocalGame || aiChatMessages.length === 0) return;
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
  }, [isLocalGame, aiChatMessages]);

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

  // ── Sync settings for non-hosts ──
  useEffect(() => {
    if (gameState?.settings && !isHost) {
      setSettings(gameState.settings);
    }
  }, [gameState?.settings, isHost]);

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
  }, [playerPositionsKey, gameState?.status, gameState]);

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
  }, [screen, gameState?.turnStartTime, latestLogEntry, gameState]);

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

      if (modal.type === "roulette") {
        handleRouletteSpin();
        return;
      }

      if (modal.type === "steal") {
        const stealable = getEligibleStealable(props, curIdx);
        if (stealable.length && Math.random() < 0.75) {
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
        const mine = getEligibleSwapMine(props, curIdx);
        const theirs = getEligibleStealable(props, curIdx);
        if (mine.length && theirs.length && Math.random() < 0.75) {
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
    const STEP_MS = 250; // Slower, more deliberate movement
    let step = 0;
    const tick = () => {
      if (step >= steps) {
        setFlashCell(null);
        setBouncingPlayer(playerId);
        setTimeout(() => setBouncingPlayer(null), 800);
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
    setTimeout(tick, 100);
  };

  // ── pushState — works for local AI games and Firebase multiplayer ──
  const isLocalGameRef = useRef(false);
  isLocalGameRef.current = isLocalGame;

  const pushState = useCallback(
    (nextState) => {
      const safe = {
        ...nextState,
        properties:
          nextState.properties && typeof nextState.properties === "object"
            ? nextState.properties
            : {},
        log: Array.isArray(nextState.log) ? nextState.log : [],
        players: Array.isArray(nextState.players) ? nextState.players : [],
        rolling: nextState.rolling ?? false,
      };
      if (isLocalGameRef.current) {
        // Local AI game: update state directly
        setGameState(prev => {
          const nextDice = nextState.dice || prev?.dice || [1, 1];
          return {
            ...prev,
            ...safe,
            dice: nextDice,
            version: (prev?.version ?? 0) + 1
          };
        });
        return Promise.resolve(true);
      }

      const baseVersion = gsRef.current?.version ?? 0;
      const stateRef = ref(db, `games/${roomCode}/state`);
      return runTransaction(
        stateRef,
        (current) => {
          const currentVersion = current?.version ?? 0;
          if (current && currentVersion !== baseVersion) return;
          const nextDice = nextState.dice || current?.dice || [1, 1];
          return {
            ...current,
            ...safe,
            dice: nextDice,
            version: currentVersion + 1,
          };
        },
        { applyLocally: true },
      ).then((res) => res.committed);
    },
    [roomCode],
  );

  const isMyTurn = gameState && myIdx === gameState.currentPlayer;

  // ── Rent calculation ──
  const calcRent = (space, prop, props, dice) => {
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
    const marketKey = marketGroupKey(space);
    const marketMod = marketKey
      ? gsRef.current?.marketModifiers?.[marketKey] || 1
      : 1;
    rent = Math.max(1, Math.round(rent * marketMod));
    // Double rent effect on owner
    const owner = safePlayers(gsRef.current)[prop.owner];
    if ((owner?.doubleRentTurns || 0) > 0) rent *= 2;
    return rent;
  };

  const runRoundEvent = (players, props, freePot, log) => {
    const evt = ROUND_EVENTS[Math.floor(Math.random() * ROUND_EVENTS.length)];
    const nextPlayers = players.map((p) => ({ ...p }));
    let nextFreePot = freePot || 0;

    if (evt.type === "all_bonus") {
      nextPlayers.forEach((p, idx) => {
        if (!p || p.bankrupt) return;
        nextPlayers[idx] = { ...p, money: p.money + evt.amount };
      });
    } else if (evt.type === "all_fee_to_pot") {
      nextPlayers.forEach((p, idx) => {
        if (!p || p.bankrupt) return;
        nextPlayers[idx] = { ...p, money: p.money - evt.amount };
        nextFreePot += evt.amount;
      });
    } else if (evt.type === "builders_bonus") {
      const ownersWithBuilds = new Set(
        Object.entries(props)
          .filter(([, pr]) => pr && ((pr.houses || 0) > 0 || pr.hotel))
          .map(([, pr]) => pr.owner),
      );
      ownersWithBuilds.forEach((ownerId) => {
        const p = nextPlayers[ownerId];
        if (!p || p.bankrupt) return;
        nextPlayers[ownerId] = { ...p, money: p.money + evt.amount };
      });
    }

    log.unshift(`${evt.title} ${evt.text}`);
    return { nextPlayers, nextFreePot };
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
    // Ensure property-related UI from a previous selection does not remain open
    // when resolving non-property tiles (especially corners).
    setSelectedSpace(null);

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

      // Lock visual positions for anyone who teleported (e.g. via Cards)
      finalPlayers.forEach((p, i) => {
        const old = players[i];
        if (old && p && old.position !== p.position) {
          setVisualPositions((prev) => ({ ...prev, [p.id]: old.position }));
        }
      });

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
    } else if (space.type === "roulette") {
      log.unshift(`${player.token} landed on Roulette! 🎡`);
      finishTurn(
        players,
        undefined,
        undefined,
        { type: "roulette", options: ROULETTE_OUTCOMES },
        false,
      );
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
        const stealable = Object.entries(props).filter(([, p]) => p && p.owner !== curIdx);
        if (!stealable.length) {
          finishTurn(players, undefined, undefined, { type: "notify", title: "Nothing to Steal!", text: "No opponent properties exist yet. The board is wide open!" }, false);
        } else {
          finishTurn(players, undefined, undefined, { type: "steal" }, false);
        }
      } else if (specialEffect?.type === "swap") {
        const stealable = Object.entries(props).filter(([, p]) => p && p.owner !== curIdx);
        const mine = Object.entries(props).filter(([, p]) => p && p.owner === curIdx);
        if (!stealable.length || !mine.length) {
          finishTurn(players, undefined, undefined, { type: "notify", title: "Nothing to Swap!", text: "Both players need properties to swap. Come back later!" }, false);
        } else {
          finishTurn(players, undefined, undefined, { type: "swap" }, false);
        }
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
    } else if (PROPERTY_ACTION_TYPES.includes(space.type)) {
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
        const rent = calcRent(space, prop, props, gs.dice);
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
        // Own property
        const group = COLOR_GROUPS[space.color] || [];
        const hasMonopoly =
          space.type === "property" &&
          group.every((id) => props[id]?.owner === curIdx);
          
        log.unshift(`🏠 ${player.token} rests on their own property (${space.name}).`);

        if (!player.isAI) {
          finishTurn(null, undefined, undefined, null, false);
          // Only auto-open the card if the player has a monopoly and could potentially build
          if (hasMonopoly) {
            setTimeout(() => setSelectedSpace(spaceId), 350);
          }
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
    setVisualPositions((prev) => ({ ...prev, [player.id]: oldPos }));
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
    pushState({ ...gs, rolling: true, dice: [d1, d2], log: log.slice(0, 25) });
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
    pushState({ ...gs, rolling: true, dice: [d1, d2], log: log.slice(0, 25) });

    setTimeout(() => {
      if (newDC === 3) {
        log.unshift(`${player.token} rolled 3 doubles — Jail! 🔒`);
        players[gs.currentPlayer] = {
          ...player,
          position: 10,
          inJail: true,
          jailTurns: 0,
        };
        setVisualPositions((prev) => ({ ...prev, [player.id]: player.position }));
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
        pushState({ ...gs, rolling: true, dice: [d1, d2], log: log.slice(0, 25) });
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
    pushState({ ...gs, rolling: true, dice: [d1, d2], log: log.slice(0, 25) });
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
    const settings = safeSettings(gs);
    const wrappedRound = next <= gs.currentPlayer;
    const nextTurnCount = (gs.turnCount || 1) + 1;
    let nextPlayers = players.map((p) => (p ? { ...p } : p));
    let nextFreePot = gs.freePot || 0;
    let marketModifiers = gs.marketModifiers || randomMarketModifiers();

    if (wrappedRound && settings.dynamicMarket) {
      marketModifiers = randomMarketModifiers();
      log.unshift("📉 Market shifted this round. Property rents were re-priced!");
    }

    if (
      wrappedRound &&
      settings.eventRounds &&
      nextTurnCount % Math.max(2, settings.eventInterval || 4) === 0
    ) {
      const outcome = runRoundEvent(nextPlayers, safeProps(gs), nextFreePot, log);
      nextPlayers = outcome.nextPlayers;
      nextFreePot = outcome.nextFreePot;
    }

    log.unshift(`▶ Player ${next + 1}${isAI ? " 🤖" : ""}'s turn`);
    pushState({
      ...gs,
      players: nextPlayers,
      currentPlayer: next,
      rolled: false,
      doubleCount: 0,
      rolling: false,
      freePot: nextFreePot,
      marketModifiers,
      turnCount: nextTurnCount,
      log: log.slice(0, 25),
      turnStartTime: Date.now(),
      modal: null,
    }).then((committed) => {
      if (!committed) {
        // Transaction failed due to version mismatch — retry with latest state
        setTimeout(() => advanceTurn(gsRef.current), 200);
      } else {
        setProcessing(false);
      }
    });
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
    if (gameState.modal.source === "roulette") {
      advanceTurn({ ...gameState, modal: null });
      return;
    }
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

  const getEligibleStealable = (props, curIdx) =>
    eligibleTransferPropertyIds(props, (p) => p.owner !== curIdx);

  const getEligibleSwapMine = (props, curIdx) =>
    eligibleTransferPropertyIds(props, (p) => p.owner === curIdx);

  const handleSteal = (targetSpaceId) => {
    const gs = gsRef.current;
    const props = safeProps(gs);
    if (!getEligibleStealable(props, myIdx).includes(targetSpaceId)) return;
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
    if (
      !getEligibleSwapMine(props, myIdx).includes(mySpaceId) ||
      !getEligibleStealable(props, myIdx).includes(theirSpaceId)
    )
      return;
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

  const handleRouletteSpin = () => {
    const gs = gsRef.current;
    if (!gs?.modal || gs.modal.type !== "roulette") return;
    
    // Phase 1: Start Spinning
    if (!gs.modal.isSpinning && gs.modal.targetIdx === undefined) {
      const targetIdx = Math.floor(Math.random() * ROULETTE_OUTCOMES.length);
      pushState({ 
        ...gs, 
        modal: { ...gs.modal, isSpinning: true, targetIdx } 
      });
      return;
    }

    // Phase 2: Animation finished, apply result
    const curIdx = gs.currentPlayer;
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const props = safeProps(gs);
    const player = players[curIdx];
    if (!player) return;
    
    const log = safeLog(gs);
    const targetIdx = gs.modal.targetIdx;
    const outcome = ROULETTE_OUTCOMES[targetIdx];

    if (outcome.type === "reward") {
      players[curIdx] = { ...player, money: player.money + outcome.amount };
      log.unshift(`🎡 ${player.token} spun Roulette: ${outcome.label}`);
      const next = { ...gs, players, modal: { type: "notify", title: "Roulette Reward!", text: `You won $${outcome.amount}!` }, log: log.slice(0, 25) };
      pushState(next).then(() => setTimeout(() => {
        const gs2 = gsRef.current;
        pushState({ ...gs2, modal: null }).then(() => advanceTurn({ ...gs2, modal: null }));
      }, 1500));
      return;
    }

    if (outcome.type === "none") {
      log.unshift(`🎡 ${player.token} spun Roulette: Better Luck Next Time.`);
      const next = { ...gs, modal: { type: "notify", title: "Better Luck Next Time", text: "No reward this spin." }, log: log.slice(0, 25) };
      pushState(next).then(() => setTimeout(() => {
        const gs2 = gsRef.current;
        pushState({ ...gs2, modal: null }).then(() => advanceTurn({ ...gs2, modal: null }));
      }, 1500));
      return;
    }

    const mine = getEligibleSwapMine(props, curIdx);
    const theirs = getEligibleStealable(props, curIdx);
    if (!theirs.length || (outcome.type === "swap" && !mine.length)) {
      log.unshift(`🎡 ${player.token} landed on ${outcome.label} but has no targets.`);
      const next = { ...gs, modal: { type: "notify", title: "Insufficient Properties", text: "No eligible properties to perform this action." }, log: log.slice(0, 25) };
      pushState(next).then(() => setTimeout(() => {
        const gs2 = gsRef.current;
        pushState({ ...gs2, modal: null }).then(() => advanceTurn({ ...gs2, modal: null }));
      }, 1500));
      return;
    }

    log.unshift(`🎡 ${player.token} spun Roulette: ${outcome.label}`);
    pushState({ ...gs, modal: { type: outcome.type, source: "roulette" }, log: log.slice(0, 25) });
  };

  // ── Create / Join ──
  const createGame = useCallback(async () => {
    let code = "";
    let created = false;
    for (let attempt = 0; attempt < 8 && !created; attempt++) {
      const candidate = generateCode();
      const result = await runTransaction(
        ref(db, `games/${candidate}`),
        (current) => {
          if (current) return;
          return {
            lobby: {
              0: { id: 0, token: PLAYER_TOKENS[0], color: PLAYER_COLORS[0] },
            },
            state: {
              version: 0,
              hostPlayerCount: playerCount,
              status: "waiting",
              properties: {},
              players: [],
              log: [],
              dice: [1, 1],
              rolling: false,
            },
          };
        },
        { applyLocally: false },
      );
      if (result.committed) {
        code = candidate;
        created = true;
      }
    }

    if (!created) {
      setError("Could not create room right now. Please try again.");
      return;
    }

    setRoomCode(code);
    setIsHost(true);
    setMyIdx(0);
    myIdxRef.current = 0;
    setScreen("waiting");
  }, [playerCount]);

  const joinGame = useCallback(async (optionalCode) => {
    const code = (typeof optionalCode === "string" ? optionalCode : joinCode)
      .toUpperCase()
      .trim();
    if (code.length < 4) {
      setError("Enter a valid room code");
      return;
    }
    setError("");

    let reservedIdx = -1;
    const result = await runTransaction(
      ref(db, `games/${code}`),
      (current) => {
        if (!current) return current;

        const lobbyCount = current.lobby ? Object.keys(current.lobby).length : 0;
        const maxPlayers = current.state?.hostPlayerCount || 2;
        if (lobbyCount >= maxPlayers) return;

        const aiIndices = current.state?.settings?.aiPlayers || [];
        let idx = -1;
        for (let i = 0; i < maxPlayers; i++) {
          if (!current.lobby?.[i] && !aiIndices.includes(i)) {
            idx = i;
            break;
          }
        }
        if (idx === -1) return;

        reservedIdx = idx;
        return {
          ...current,
          lobby: {
            ...(current.lobby || {}),
            [idx]: { id: idx, token: PLAYER_TOKENS[idx], color: PLAYER_COLORS[idx] },
          },
        };
      },
      { applyLocally: false },
    );

    if (!result.snapshot.exists()) {
      setError("Room not found!");
      return;
    }
    if (!result.committed || reservedIdx === -1) {
      setError("No available slots (Room is full or remaining slots are AI)");
      return;
    }

    setMyIdx(reservedIdx);
    myIdxRef.current = reservedIdx;
    setRoomCode(code);
    setIsHost(false);
    setScreen("waiting");
  }, [joinCode]);

  const startGame = useCallback(async (count) => {
    const aiP = settings.aiPlayers || [];
    const aiConfigs = {};
    aiP.forEach((idx) => {
      aiConfigs[idx] = { difficulty: aiDifficulty, personality: aiPersonality };
    });
    const gs = freshGameState(count, settings, aiP, aiConfigs);
    await set(ref(db, `games/${roomCode}/state`), gs);
    setScreen("game");
  }, [settings, aiDifficulty, aiPersonality, roomCode]);

  const startAIGame = useCallback(() => {
    const totalPlayers = 1 + aiOpponentCount; // human is P0
    const aiPlayerIndices = Array.from(
      { length: aiOpponentCount },
      (_, i) => i + 1,
    );
    const aiConfigs = {};
    aiPlayerIndices.forEach((idx) => {
      const personalities = ["aggressive", "conservative", "monopolist", "random"];
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
    setAiChatMessages([
      { id: -1, token: "🤖", text: "I am your AI advisor. Ask me about builds, trades, or risk.", ts: Date.now() },
    ]);
    prevPositionsRef.current = null;
    setGameState(gs);
    setScreen("game");
  }, [aiOpponentCount, aiDifficulty]);

  // ── URL Routing — Handle /ROOMCODE or /AI deep-linking ──
  useEffect(() => {
    const path = window.location.pathname.slice(1).toUpperCase();
    if (path === "AI") {
      startAIGame();
    } else if (path && path.length >= 4 && path.length <= 6) {
      joinGame(path);
    }
  }, [joinGame, startAIGame]); // Sync with functions

  // Sync state to URL
  useEffect(() => {
    const currentPath = window.location.pathname.slice(1).toUpperCase();
    if (isLocalGame) {
      if (currentPath !== "AI") window.history.pushState({}, "", "/AI");
    } else {
      if (roomCode && roomCode !== currentPath) {
        window.history.pushState({}, "", `/${roomCode}`);
      } else if (!roomCode && currentPath) {
        window.history.pushState({}, "", "/");
      }
    }
  }, [roomCode, isLocalGame]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || myIdx === null) return;
    setChatInput("");
    const me = safePlayers(gsRef.current)[myIdx];
    const token = me?.token || PLAYER_TOKENS[myIdx] || "?";

    if (isLocalGame) {
      const now = Date.now();
      const mine = { id: myIdx, token, text, ts: now };
      const advice = getAIAdvisorReply(text);
      const aiToken = safePlayers(gsRef.current).find((p) => p?.isAI && !p.bankrupt)?.token || "🤖";
      const aiMsg = { id: -1, token: aiToken, text: advice, ts: now + 1 };
      setAiChatMessages((prev) => [...prev, mine, aiMsg]);
      return;
    }

    const msgId = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    await update(ref(db, `games/${roomCode}/chat`), {
      [msgId]: { id: myIdx, token, text, ts: Date.now() },
    });
  };

  const getAIAdvisorReply = (input) => {
    const t = input.toLowerCase();
    const me = safePlayers(gsRef.current)[myIdx];
    if (!me) return "Focus on cash flow first, then build on monopolies.";
    const mySet = Object.entries(COLOR_GROUPS)
      .map(([color, ids]) => ({ color, ids, own: ids.filter((id) => safeProps(gsRef.current)[id]?.owner === myIdx).length }))
      .sort((a, b) => b.own - a.own)[0];

    if (t.includes("why") && t.includes("buy")) {
      return `I buy to deny monopolies and compound rent. Your best set is ${COLOR_LABELS[mySet?.color] || "a color group"} (${mySet?.own || 0}/${mySet?.ids?.length || 0}).`;
    }
    if (t.includes("build") || t.includes("house")) {
      return me.money > 350
        ? "Yes—build on your strongest color set to multiply rent pressure."
        : "Not yet. Keep a $300-$400 safety buffer before building.";
    }
    if (t.includes("trade") || t.includes("deal")) {
      return "Offer properties that don't complete enemy sets; ask for cash plus a strategic color.";
    }
    return "Tip: prioritize completing one color set, then build evenly to keep rent pressure high.";
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
    setAiChatMessages([]);
  };

  const submitTradeOffer = () => {
    const gs = gsRef.current;
    if (!gs || !isLocalGame) return;
    const offerId = Number(tradeDraft.offerPropertyId);
    const reqId = Number(tradeDraft.requestPropertyId);
    const askCash = Number(tradeDraft.requestCash || 0);
    const props = safeProps(gs);
    const players = safePlayers(gs).map((p) => ({ ...p }));
    const me = players[myIdx];
    const aiId = players.find((p) => p?.isAI && !p.bankrupt)?.id;
    if (!me || aiId === undefined) return;
    if (!props[offerId] || props[offerId].owner !== myIdx) return;

    let valueGiven = (SPACES[offerId]?.price || 0);
    let valueReceived = askCash;
    if (!Number.isNaN(reqId) && props[reqId] && props[reqId].owner === aiId) {
      valueReceived += SPACES[reqId]?.price || 0;
    }

    const aiAccepts = valueReceived * 0.9 <= valueGiven;
    if (!aiAccepts) {
      setAiChatMessages((prev) => [
        ...prev,
        { id: -1, token: players[aiId].token, text: "I reject this deal—value is too low for me.", ts: Date.now() },
      ]);
      return;
    }

    const newProps = { ...props, [offerId]: { ...props[offerId], owner: aiId } };
    if (!Number.isNaN(reqId) && props[reqId] && props[reqId].owner === aiId) {
      newProps[reqId] = { ...props[reqId], owner: myIdx };
    }
    if (askCash > 0 && players[aiId].money >= askCash) {
      players[aiId].money -= askCash;
      players[myIdx].money += askCash;
    }
    const log = safeLog(gs);
    log.unshift(`🤝 Trade accepted: ${players[myIdx].token} traded ${SPACES[offerId]?.name}`);
    pushState({ ...gs, players, properties: newProps, log: log.slice(0, 25) });
    setTradeDraft({ offerPropertyId: "", requestPropertyId: "", requestCash: 0 });
  };

  const baseBoardSize = 550;
  const isPhone = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1024;
  const horizontalPadding = isPhone ? 0 : isTablet ? 32 : 60;
  const widthRatio = isPhone || isTablet ? 1 : 0.6; // Increased from 0.5 to 0.6
  const targetBoardWidth = Math.max(280, (windowWidth - horizontalPadding) * widthRatio);
  const maxByHeight = Math.max(280, windowHeight * (isPhone ? 0.95 : 0.85)); // Increased height allowance
  const boardPixelSize = Math.min(targetBoardWidth, maxByHeight);
  const adaptiveScale = boardPixelSize / baseBoardSize;
  
  const boardScale = isPhone
    ? adaptiveScale
    : isTablet
      ? Math.min(0.95, adaptiveScale)
      : Math.min(1.4, adaptiveScale);
  const CORNER = Math.round(68 * boardScale),
    CELL = Math.round(46 * boardScale);
  const cols = [CORNER, ...Array(9).fill(CELL), CORNER];
  const rows = [CORNER, ...Array(9).fill(CELL), CORNER];

  // ════════════════════════════════════════════════════════════
  // LOBBY
  // ════════════════════════════════════════════════════════════
  if (screen === "lobby") {
    return (
      <LobbyView
        lobbyMode={lobbyMode}
        setLobbyMode={setLobbyMode}
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
        createGame={createGame}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
        joinGame={joinGame}
        error={error}
        aiOpponentCount={aiOpponentCount}
        setAiOpponentCount={setAiOpponentCount}
        aiDifficulty={aiDifficulty}
        setAiDifficulty={setAiDifficulty}
        startAIGame={startAIGame}
      />
    );
  }

  // ════════════════════════════════════════════════════════════
  // WAITING
  // ════════════════════════════════════════════════════════════
  if (screen === "waiting") {
    return (
      <WaitingView
        gameState={gameState}
        playerCount={playerCount}
        lobbyPlayers={lobbyPlayers}
        settings={settings}
        roomCode={roomCode}
        codeCopied={codeCopied}
        setCodeCopied={setCodeCopied}
        myIdx={myIdx}
        isHost={isHost}
        setShowSettings={setShowSettings}
        showSettings={showSettings}
        setSettings={setSettings}
        setPlayerCount={setPlayerCount}
        startGame={startGame}
        db={db}
        update={update}
        ref={ref}
      />
    );
  }

  // ════════════════════════════════════════════════════════════
  // GAME OVER
  // ════════════════════════════════════════════════════════════
  if (gameState?.status === "gameover") {
    return <GameOverView gameState={gameState} resetToLobby={resetToLobby} />;
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
      <div className="screen-overlay flex-column flex-center align-center gap-16">
        <div className="spinner" />
        <div className="text-md text-success weight-bold">
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
  const diceArr = (gameState?.dice && Array.isArray(gameState.dice) && gameState.dice.length === 2)
    ? gameState.dice
    : (prevDiceRef.current || [1, 1]);
  const isRolling = gameState.rolling === true;
  const cur = rawPlayers[gameState.currentPlayer];
  const me = rawPlayers[myIdx] || null;
  const modal = gameState.modal || null;
  const gs_s = safeSettings(gameState);
  const displayedChat = isLocalGame ? aiChatMessages : chatMessages;

  // My properties for building panel
  const myProps = Object.entries(props).filter(
    ([, p]) => p && p.owner === myIdx,
  );
  const eligibleStealTargets = getEligibleStealable(props, myIdx);
  const eligibleSwapMine = getEligibleSwapMine(props, myIdx);

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
      const chance = calculateMonopolyChance(pl, pid, color, ids, props, rawPlayers);
      const owned = ids.filter((id) => props[id]?.owner === pid).length;
      if (chance > bestChance) {
        bestChance = chance;
        bestProgress = `${owned}/${ids.length} ${COLOR_LABELS[color] || "Set"}`;
      }
    });
    return { pid, chance: Math.round(bestChance), progress: bestProgress };
  });

  const myGroupChances = Object.entries(COLOR_GROUPS)
    .map(([color, ids]) => {
      const me = rawPlayers[myIdx];
      if (!me) return null;
      return {
        color,
        label: COLOR_LABELS[color] || "Set",
        chance: calculateMonopolyChance(me, myIdx, color, ids, props, rawPlayers),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.chance - a.chance)
    .slice(0, 3);

  const riskByPlayer = rawPlayers.map((pl, pid) => {
    if (!pl || pl.bankrupt) return { pid, risk: 100, label: "Critical" };
    const rounded = calculateBankruptcyRisk(pl, pid, props);
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

  const colorSetInsights = getColorSetInsights(props);
  const dangerousZones = getDangerousZones(props);

  return (
    <div className="game-root">
      {/* ── Header ── */}
      <GameHeader
        roomCode={roomCode}
        codeCopied={codeCopied}
        setCodeCopied={setCodeCopied}
        gs_s={gs_s}
        gameState={gameState}
        rawPlayers={rawPlayers}
        myIdx={myIdx}
        resetToLobby={resetToLobby}
        layoutFocus={layoutFocus}
        setLayoutFocus={setLayoutFocus}
      />

      {/* ── Turn banner ── */}
      <TurnBanner
        isRolling={isRolling}
        cur={cur}
        gameState={gameState}
        isMyTurn={isMyTurn}
      />

      {/* ── Sell-to-pay banner ── */}
      {sellToPay && sellToPay.playerId === myIdx && (
        <div className="debt-banner">
          <span className="text-md weight-bold text-danger">
            💸 You owe ${sellToPay.amount.toLocaleString()}! Sell properties to
            pay your debt:
          </span>
          <div className="flex-gap-6 flex-wrap">
            {myProps.map(([id]) => {
              const space = SPACES[+id];
              return (
                <button
                  key={id}
                  className="btn btn-danger text-xs"
                  onClick={() => sellProperty(+id)}
                >
                  Sell {space?.name} (${Math.floor((space?.price || 0) / 2)})
                </button>
              );
            })}
          </div>
          {myProps.length === 0 && (
            <button
              className="btn btn-danger text-xs"
              onClick={() => setSellToPay(null)}
            >
              Declare Bankruptcy
            </button>
          )}
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="game-layout">
        {/* Board */}
        <BoardView
          cols={cols}
          rows={rows}
          displayPlayers={displayPlayers}
          props={props}
          selectedSpace={selectedSpace}
          setSelectedSpace={setSelectedSpace}
          flashCell={flashCell}
          bouncingPlayer={bouncingPlayer}
          gameState={gameState}
          diceArr={diceArr}
          isRolling={isRolling}
          diceLanding={diceLanding}
          gs_s={gs_s}
          isMyTurn={isMyTurn}
          handleTimerExpire={handleTimerExpire}
          modal={modal}
          rawPlayers={rawPlayers}
          myIdx={myIdx}
          buyProperty={buyProperty}
          pushState={pushState}
          dismissModal={dismissModal}
          handleUseJailCard={handleUseJailCard}
          handlePayJailFine={handlePayJailFine}
          handleJailRoll={handleJailRoll}
          handleSteal={handleSteal}
          handleSwap={handleSwap}
          buildHouse={buildHouse}
          handleRouletteSpin={handleRouletteSpin}
          eligibleStealTargets={eligibleStealTargets}
          eligibleSwapMine={eligibleSwapMine}
        />

        {/* Right panel */}
        <SidePanelView
          me={me}
          myIdx={myIdx}
          isMyTurn={isMyTurn}
          gameState={gameState}
          processing={processing}
          sellToPay={sellToPay}
          handleRoll={handleRoll}
          endTurn={endTurn}
          rawPlayers={rawPlayers}
          wealthSeries={wealthSeries}
          wealthMode={wealthMode}
          setWealthMode={setWealthMode}
          chartMin={chartMin}
          chartMax={chartMax}
          myGroupChances={myGroupChances}
          playerProbabilities={playerProbabilities}
          riskByPlayer={riskByPlayer}
          colorSetInsights={colorSetInsights}
          dangerousZones={dangerousZones}
          myProps={myProps}
          props={props}
          buildHouse={buildHouse}
          isLocalGame={isLocalGame}
          tradeDraft={tradeDraft}
          setTradeDraft={setTradeDraft}
          submitTradeOffer={submitTradeOffer}
          audioSettings={audioSettings}
          setAudioSettings={setAudioSettings}
          logArr={logArr}
          displayedChat={displayedChat}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendChat={sendChat}
          chatEndRef={chatEndRef}
          isPhone={isPhone}
        />

        {isPhone && (
          <>
            <button
              className="chat-fab"
              onClick={() => setMobileChatOpen((prev) => !prev)}
            >
              {mobileChatOpen ? "✕" : "💬"}
            </button>

            {mobileChatOpen && (
              <ChatBox
                isLocalGame={isLocalGame}
                displayedChat={displayedChat}
                myIdx={myIdx}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChat={sendChat}
                chatEndRef={chatEndRef}
                isMobile
              />
            )}
          </>
        )}

        {/* ── Property Card Modal (triggered by clicking any board space) ── */}
        {selectedSpace !== null &&
          (() => {
            const selSpace = SPACES[selectedSpace];
            if (!selSpace) return null;
            const selProp = props[selectedSpace] ?? null;
            const mePlayer = rawPlayers[myIdx];
            const playerIsOnSpace = mePlayer && mePlayer.position === selectedSpace;
            const group = COLOR_GROUPS[selSpace.color] || [];
            const hasMonopoly = selSpace.type === "property" && group.length > 0 && group.every((id) => props[id]?.owner === myIdx);
            const isMyLandedProp = selProp && selProp.owner === myIdx && playerIsOnSpace;

            const handleCardBuild = (spaceId) => {
              if (!isMyLandedProp || !hasMonopoly || spaceId !== selectedSpace) return;
              buildHouse(spaceId);
            };

            const handleCardBuy = () => {
              if (!PROPERTY_ACTION_TYPES.includes(selSpace.type)) return;
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
                onBuy={PROPERTY_ACTION_TYPES.includes(selSpace.type) && selSpace.price && !selProp && isMyTurn && playerIsOnSpace ? handleCardBuy : null}
              />
            );
          })()}
      </div>
    </div>
  );
}
