import React, { useState, useEffect, useRef } from "react";
import { ref, runTransaction } from "firebase/database";
import { db } from "./services/firebase";

// ─── Data constants ──────────────────────────────────────────────────────────
import {
  DEFAULT_SETTINGS,
  SPACES,
  COLOR_GROUPS,
  COLOR_LABELS,
} from "./constants";

// ─── Utility helpers ─────────────────────────────────────────────────────────
import {
  safePlayers,
  safeProps,
  safeLog,
  safeSettings,
  getColorSetInsights,
  getDangerousZones,
  calculateBankruptcyRisk,
  calculateMonopolyChance,
} from "./utils";

// ─── Components ──────────────────────────────────────────────────────────────
import LobbyView from "./components/LobbyView";
import WaitingView from "./components/WaitingView";
import GameOverView from "./components/GameOverView";

import GameHeader from "./components/GameHeader";
import TurnBanner from "./components/TurnBanner";
import BoardView from "./components/BoardView";
import SidePanelView from "./components/SidePanelView";
import PropertyCardModal from "./components/PropertyCardModal";
import { playSound } from "./soundManager";

// ─── Hooks & Engine ──────────────────────────────────────────────────────────
import { useGameRoom } from "./hooks/useGameRoom";
import { useAIController } from "./hooks/useAIController";
import { useWealthTracker } from "./hooks/useWealthTracker";
import * as Engine from "./game/engine";

import "./game.css";

export default function App() {
  // ── Modular State & Logic ──
  const room = useGameRoom();
  const {
    screen, setScreen,
    roomCode, setRoomCode,
    myIdx, setMyIdx,
    isHost,
    gameState, setGameState,
    isLocalGame, setIsLocalGame,
    lobbyPlayers,
    chatMessages,
    aiChatMessages,
    error,
    processing, setProcessing,
    pushState,
    createGame,
    joinGame,
    startGame,
    startAIGame,
    sendChat,
  } = room;

  // ── UI State ──
  const [lobbyMode, setLobbyMode] = useState("multiplayer");
  const [playerCount, setPlayerCount] = useState(2);
  const [joinCode, setJoinCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [showSettings, setShowSettings] = useState(false);
  const [chatInput, setChatInput] = useState("");
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
  const [flashCell, setFlashCell] = useState(null);
  const [bouncingPlayer, setBouncingPlayer] = useState(null);
  const [visualPositions, setVisualPositions] = useState({});
  const [sellToPay, setSellToPay] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [wealthMode, setWealthMode] = useState("net");
  const [layoutFocus, setLayoutFocus] = useState("board");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [diceLanding, setDiceLanding] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [aiOpponentCount, setAiOpponentCount] = useState(1);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiPersonality] = useState("aggressive");

  const chatEndRef = useRef(null);
  const prevRollingRef = useRef(false);
  const prevPositionsRef = useRef(null);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const { wealthHistory } = useWealthTracker(gameState, screen);

  // ── Derived Strategy Data (Moved to top to follow Rules of Hooks) ──
  const rawPlayers = safePlayers(gameState);
  const props = safeProps(gameState);

  const colorSetInsights = React.useMemo(() => getColorSetInsights(props), [props]);
  const dangerousZones = React.useMemo(() => getDangerousZones(props), [props]);
  const myProps = React.useMemo(() => Object.entries(props).filter(([, p]) => p?.owner === myIdx), [props, myIdx]);

  const riskByPlayer = React.useMemo(() => {
    return rawPlayers.map((p, idx) => {
      if (!p || p.bankrupt) return { pid: idx, risk: 0, label: "None" };
      const risk = calculateBankruptcyRisk(p, idx, props);
      let label = "Low";
      if (risk > 30) label = "Moderate";
      if (risk > 55) label = "High";
      if (risk > 75) label = "CRITICAL";
      return { pid: idx, risk, label };
    });
  }, [rawPlayers, props]);

  const getPlayerProgress = React.useCallback((p, pid) => {
    let bestChance = 0;
    let progress = "Starting";
    Object.entries(COLOR_GROUPS).forEach(([color, ids]) => {
      const chance = calculateMonopolyChance(p, pid, color, ids, props, rawPlayers);
      if (chance > bestChance) {
        bestChance = chance;
        const owned = ids.filter(id => props[id]?.owner === pid).length;
        progress = `${owned}/${ids.length} ${COLOR_LABELS[color] || ""}`;
      }
    });
    return { chance: bestChance, progress };
  }, [props, rawPlayers]);

  const playerProbabilities = React.useMemo(() => {
    return rawPlayers.map((p, pid) => {
      if (!p || p.bankrupt) return { pid, chance: 0, progress: "None" };
      const { chance, progress } = getPlayerProgress(p, pid);
      return { pid, chance, progress };
    });
  }, [rawPlayers, getPlayerProgress]);

  const myGroupChances = React.useMemo(() => {
    const me = rawPlayers[myIdx];
    if (myIdx === null || !me) return [];
    return Object.entries(COLOR_GROUPS).map(([color, ids]) => {
      const chance = calculateMonopolyChance(me, myIdx, color, ids, props, rawPlayers);
      return { label: COLOR_LABELS[color], chance };
    }).filter(g => g.chance > 10).sort((a, b) => b.chance - a.chance).slice(0, 3);
  }, [rawPlayers, props, myIdx]);

  const displayPlayers = rawPlayers.map((p) => {
    if (p) {
      const vis = visualPositions[p.id];
      if (vis !== undefined) return { ...p, position: vis };
      return p;
    }
    return p;
  });

  // ── AI Controller ──
  // Note: We need to pass the actions needed by the AI
  const aiActions = {
    pushState,
    advanceTurn: () => advanceTurn(gameState),
    doMoveAndAction: (...args) => doMoveAndAction(...args),
    handleRouletteSpin: () => handleRouletteSpin(),
    handleJailRoll: () => handleJailRoll(),
    handleRoll: () => handleRoll(),
  };

  const handlePayJailFine = () => {
    pushState((gs) => {
      const cur = { ...gs };
      const player = cur.players[cur.currentPlayer];
      if (player.money < 50 || !player.inJail) return cur;
      player.money -= 50;
      player.inJail = false;
      player.jailTurns = 0;
      cur.modal = null;
      const log = safeLog(cur);
      log.unshift(`${player.token} paid $50 to leave jail.`);
      cur.log = log.slice(0, 25);
      return cur;
    });
  };

  const handleUseJailCard = () => {
    pushState((gs) => {
      const cur = { ...gs };
      const player = cur.players[cur.currentPlayer];
      if (!player.jailFreeCards || !player.inJail) return cur;
      player.jailFreeCards -= 1;
      player.inJail = false;
      player.jailTurns = 0;
      cur.modal = null;
      const log = safeLog(cur);
      log.unshift(`${player.token} used a Get Out of Jail Free card!`);
      cur.log = log.slice(0, 25);
      return cur;
    });
  };

  const handleJailRoll = (strat) => {
    if (strat === "pay") return handlePayJailFine();
    if (strat === "card") return handleUseJailCard();

    setProcessing(true);
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const isDouble = d1 === d2;

    pushState((gs) => {
      const cur = { ...gs };
      const player = cur.players[cur.currentPlayer];
      if (!player.inJail) return cur;

      const log = safeLog(cur);

      if (isDouble) {
        log.unshift(`${player.token} rolled ${d1}+${d2} and ESCAPED jail!`);
        player.inJail = false;
        player.jailTurns = 0;
        cur.modal = null;
        setTimeout(() => doMoveAndAction(cur.currentPlayer, d1 + d2, d1, d2, false), 900);
      } else {
        player.jailTurns = (player.jailTurns || 0) + 1;
        if (player.jailTurns >= 3) {
          log.unshift(`${player.token} rolled ${d1}+${d2}. Max jail turns! Paid $50 fine.`);
          player.money -= 50;
          player.inJail = false;
          player.jailTurns = 0;
          cur.modal = null;
          setTimeout(() => doMoveAndAction(cur.currentPlayer, d1 + d2, d1, d2, false), 900);
        } else {
          log.unshift(`${player.token} rolled ${d1}+${d2}. Stayed in jail.`);
          cur.modal = null;
          cur.rolled = true;
          setTimeout(() => setProcessing(false), 900);
        }
      }
      cur.rolling = true;
      cur.dice = [d1, d2];
      cur.log = log.slice(0, 25);
      return cur;
    });
    setTimeout(() => pushState((c) => ({ ...c, rolling: false })), 900);
  };

  useAIController(gameState, myIdx, processing, aiActions);

  // ── Derived State ──
  const latestLogEntry = gameState?.log?.[0] || "";
  const isMyTurn = gameState && myIdx === gameState.currentPlayer;
  const isRollingActive = gameState?.rolling;
  const playerPositionsKey = gameState?.players?.map((p) => `${p?.position ?? ""}`).join(",");

  // ── Effects ──
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth >= 600 && mobileChatOpen) setMobileChatOpen(false);
  }, [windowWidth, mobileChatOpen]);

  useEffect(() => {
    if (!latestLogEntry) return;
    if (/rolls|Auto-rolling/i.test(latestLogEntry)) playSound("diceRoll", audioSettings);
    else if (/bought/i.test(latestLogEntry)) playSound("purchase", audioSettings);
    else if (/rent/i.test(latestLogEntry)) playSound("rent", audioSettings);
    else if (/BANKRUPT/i.test(latestLogEntry)) playSound("bankrupt", audioSettings);
    else if (/Market shifted|Property Boom|Civic Audit|Build Subsidy/i.test(latestLogEntry))
      playSound("event", audioSettings);
  }, [latestLogEntry, audioSettings]);

  useEffect(() => {
    const prevRolling = prevRollingRef.current;
    prevRollingRef.current = !!isRollingActive;
    if (prevRolling === true && !isRollingActive) {
      setDiceLanding(true);
      setTimeout(() => setDiceLanding(false), 800);
    }
  }, [isRollingActive]);

  useEffect(() => {
    if (!isLocalGame || aiChatMessages.length === 0) return;
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
  }, [isLocalGame, aiChatMessages]);

  useEffect(() => {
    if (gameState?.settings && !isHost) setSettings(gameState.settings);
  }, [gameState?.settings, isHost]);

  useEffect(() => {
    if (gameState?.modal) setSelectedSpace(null);
  }, [gameState?.modal]);

  // Position animation logic
  useEffect(() => {
    if (!gameState) return;
    const players = safePlayers(gameState);
    if (!players.length) return;
    if (prevPositionsRef.current === null) {
      const seed = {};
      players.forEach((p) => { if (p) seed[p.id] = p.position; });
      prevPositionsRef.current = seed;
      return;
    }
    players.forEach((p) => {
      if (!p || p.bankrupt) return;
      const prev = prevPositionsRef.current[p.id];
      if (prev !== undefined && prev !== p.position) {
        let steps = p.position - prev;
        if (steps < 0 && steps >= -12) {
          // Backward movement (like "Go back 3 spaces")
        } else if (steps < 0) {
          // Wrapped around the board forwards
          steps = 40 - prev + p.position;
        }
        prevPositionsRef.current[p.id] = p.position;
        animateSteps(p.id, prev, steps);
      }
    });
  }, [playerPositionsKey, gameState?.status, gameState]);

  const animateSteps = (playerId, from, steps) => {
    const STEP_MS = 250;
    const absSteps = Math.abs(steps);
    const dir = steps < 0 ? -1 : 1;
    let step = 0;

    // Instantly lock visual position so it doesn't teleport to destination before tick begins
    setVisualPositions((prev) => ({ ...prev, [playerId]: from }));

    const tick = () => {
      if (step >= absSteps) {
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
      let curPos = (from + (step + 1) * dir) % 40;
      if (curPos < 0) curPos += 40;
      setFlashCell(curPos);
      setVisualPositions((prev) => ({ ...prev, [playerId]: curPos }));
      step++;
      setTimeout(tick, STEP_MS);
    };
    setTimeout(tick, 100);
  };

  // ── Game Handlers ──
  const handleSteal = (propId) => {
    pushState((gs) => {
      const cur = { ...gs };
      const props = safeProps(cur);
      if (!props[propId]) return cur;
      const oldOwner = props[propId].owner;
      props[propId] = { ...props[propId], owner: cur.currentPlayer };
      const log = safeLog(cur);
      log.unshift(`${rawPlayers[cur.currentPlayer]?.token} stole ${SPACES[propId]?.name} from ${rawPlayers[oldOwner]?.token}! 🎰`);
      cur.properties = props;
      cur.log = log.slice(0, 25);
      cur.modal = null;
      cur.rolled = true;
      return cur;
    }).then(() => setProcessing(false));
  };

  const handleSwap = (myPropId, theirPropId) => {
    pushState((gs) => {
      const cur = { ...gs };
      const props = safeProps(cur);
      if (!props[myPropId] || !props[theirPropId]) return cur;
      const myIdx = cur.currentPlayer;
      const theirIdx = props[theirPropId].owner;
      props[myPropId] = { ...props[myPropId], owner: theirIdx };
      props[theirPropId] = { ...props[theirPropId], owner: myIdx };
      const log = safeLog(cur);
      log.unshift(`${rawPlayers[myIdx]?.token} swapped ${SPACES[myPropId]?.name} for ${SPACES[theirPropId]?.name}! 🎰`);
      cur.properties = props;
      cur.log = log.slice(0, 25);
      cur.modal = null;
      cur.rolled = true;
      return cur;
    }).then(() => setProcessing(false));
  };

  const buildHouse = (spaceId) => {
    pushState((gs) => {
      const cur = { ...gs };
      const props = safeProps(cur);
      const player = cur.players[cur.currentPlayer];
      const space = SPACES[spaceId];
      if (!space || player.money < space.houseCost) return cur;

      const prop = props[spaceId];
      if (!prop || prop.owner !== cur.currentPlayer) return cur;

      player.money -= space.houseCost;
      if (prop.houses < 4) {
        prop.houses = (prop.houses || 0) + 1;
      } else {
        prop.houses = 0;
        prop.hotel = true;
      }
      const log = safeLog(cur);
      log.unshift(`${player.token} built on ${space.name}! 🏠`);
      cur.properties = { ...props, [spaceId]: { ...prop } };
      cur.log = log.slice(0, 25);
      return cur;
    });
  };

  const submitTradeOffer = (draft) => {
    const log = safeLog(gameState);
    log.unshift(`📢 Trade offer submitted: ${SPACES[draft.offerPropertyId]?.name || "Cash"} for ${SPACES[draft.requestPropertyId]?.name || "Cash"}`);
    pushState({ log: log.slice(0, 25) });
  };

  const advanceTurn = (current) => {
    const update = Engine.advanceTurn(current || gameState);
    pushState(update).then(() => setProcessing(false));
  };

  const doSpaceAction = (pos, player, gs, props, isDouble) => {
    setSelectedSpace(null);
    const update = Engine.getSpaceActionUpdate(pos, player, gs, isDouble);

    // Additional UI side effects (teleport visual lock)
    if (update.players) {
      update.players.forEach((p, i) => {
        const old = gs.players[i];
        if (old && p && old.position !== p.position) {
          setVisualPositions((prev) => ({ ...prev, [p.id]: old.position }));
        }
      });
    }

    pushState(update).then(() => setProcessing(false));
  };

  const doMoveAndAction = (pid, steps, d1, d2, isDouble) => {
    // Lock visual position to prevent jumping to destination before animation starts
    const currentP = gameState?.players?.[pid];
    if (currentP) {
      setVisualPositions((prev) => ({ ...prev, [pid]: currentP.position }));
    }

    pushState((current) => {
      const players = safePlayers(current).map((p) => ({ ...p }));
      const player = players[pid];
      if (!player || player.bankrupt) return;
      const oldPos = player.position;
      const newPos = (oldPos + steps) % 40;
      const log = safeLog(current);
      if (newPos < oldPos && newPos !== 0) { player.money += 200; log.unshift(`${player.token} passed GO — +$200!`); }
      player.position = newPos;
      players[pid] = player;
      return { players, doubleCount: isDouble ? (current.doubleCount || 0) + 1 : 0, log: log.slice(0, 25), rolling: false, dice: [d1, d2], turnStartTime: Date.now() };
    }).then((committed) => {
      if (committed) {
        setTimeout(() => {
          const latest = gameStateRef.current;
          if (!latest) return;
          const upP = safePlayers(latest)[pid];
          doSpaceAction(upP.position, upP, latest, safeProps(latest), isDouble);
        }, steps * 250 + 400);
      } else setProcessing(false);
    });
  };

  const handleRoll = () => {
    const activePlayerIdx = gameState.currentPlayer;
    const players = safePlayers(gameState);
    const activePlayer = players[activePlayerIdx];
    const canControl = activePlayerIdx === myIdx || (activePlayer?.isAI && (isHost || isLocalGame));

    if (!canControl || gameState.rolled || processing) return;

    if (activePlayer.inJail) { pushState({ ...gameState, modal: { type: "jail" } }); return; }

    setProcessing(true);
    const d1 = Math.ceil(Math.random() * 6), d2 = Math.ceil(Math.random() * 6);
    const isDouble = d1 === d2;
    const log = safeLog(gameState);
    log.unshift(`${activePlayer.token} rolls ${d1}+${d2}=${d1 + d2}${isDouble ? " 🎲 Doubles!" : ""}`);
    pushState({ ...gameState, rolling: true, dice: [d1, d2], log: log.slice(0, 25) });
    setTimeout(() => {
      if (isDouble && (gameState.doubleCount || 0) === 2) {
        const log = safeLog(gameState);
        log.unshift(`${activePlayer.token} rolled 3 doubles and GOES TO JAIL! 🚔`);
        pushState((gs) => {
          const cur = { ...gs };
          const p = cur.players[activePlayerIdx];
          p.position = 10;
          p.inJail = true;
          p.jailTurns = 0;
          cur.doubleCount = 0;
          cur.rolled = true;
          cur.rolling = false;
          cur.log = log.slice(0, 25);
          return cur;
        }).then(() => setProcessing(false));
        return;
      }
      doMoveAndAction(activePlayerIdx, d1 + d2, d1, d2, isDouble);
    }, 1100);
  };

  const handleRouletteSpin = () => {
    const modal = gameStateRef.current?.modal;
    if (modal?.type !== "roulette") return;

    // If already spinning, this might be a call to apply the outcome after animation
    if (modal.isSpinning) {
      const targetIdx = modal.targetIdx;
      const outcome = modal.options[targetIdx];

      pushState((gs) => {
        const cur = { ...gs };
        // Safety check: ensure we are still on the same modal and it's still spinning
        if (cur.modal?.type !== "roulette" || !cur.modal?.isSpinning) return cur;

        const player = { ...cur.players[cur.currentPlayer] };
        const log = safeLog(cur);

        if (outcome.type === "reward") {
          player.money += outcome.amount;
          log.unshift(`${player.token} won $${outcome.amount} from the Roulette! 🎰`);
          cur.players = cur.players.map((p, i) => i === cur.currentPlayer ? player : p);
          cur.modal = null;
          cur.rolled = true;
        } else if (outcome.type === "steal") {
          const stealTargets = Object.entries(safeProps(cur))
            .filter(([, p]) => p && p.owner !== cur.currentPlayer)
            .map(([id]) => +id);
          log.unshift(`${player.token} can steal a property! 🎰`);
          cur.modal = { type: "steal", triggerType: "roulette" };
          if (stealTargets.length === 0) {
            cur.modal = null;
            cur.rolled = true;
          }
        } else if (outcome.type === "swap") {
          log.unshift(`${player.token} can swap a property! 🎰`);
          cur.modal = { type: "swap", triggerType: "roulette" };
        } else {
          log.unshift(`${player.token} got Better Luck Next Time! 🎰`);
          cur.modal = null;
          cur.rolled = true;
        }

        cur.log = log.slice(0, 25);
        return cur;
      }).then(() => setProcessing(false));
      return;
    }

    // Starting a new spin
    const outcomes = modal.options;
    if (!outcomes?.length) return;

    const targetIdx = Math.floor(Math.random() * outcomes.length);

    setProcessing(true);
    pushState((gs) => ({
      ...gs,
      modal: { ...gs.modal, isSpinning: true, targetIdx },
    }));

    // Safety fallback: if for some reason the animation doesn't trigger onComplete, apply anyway
    // We use a longer timeout (5s) than the 4s animation
    setTimeout(() => {
      const latest = gameStateRef.current;
      if (latest?.modal?.type === "roulette" && latest.modal.isSpinning) {
        handleRouletteSpin();
      }
    }, 5500);
  };

  const buyProperty = (spaceId) => {
    if (!isMyTurn || gameState.rolling) return;
    setSelectedSpace(null);
    pushState((current) => {
      const gs = { ...current };
      const player = gs.players[gs.currentPlayer];
      const space = SPACES[spaceId];
      if (!space || player.money < space.price) return gs;

      const props = safeProps(gs);
      if (props[spaceId]?.owner !== undefined) return gs; // already bought

      gs.players[gs.currentPlayer].money -= space.price;
      gs.properties = { ...props, [spaceId]: { owner: gs.currentPlayer, houses: 0, hotel: false } };

      const log = safeLog(gs);
      log.unshift(`${player.token} bought ${space.name} for $${space.price}`);
      gs.log = log.slice(0, 25);
      gs.modal = null;
      return gs;
    }).then(() => setProcessing(false));
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

  // ── Render Helpers ──
  const baseBoardSize = 550;
  const isPhone = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1024;
  let boardScale = 1;
  if (isPhone) {
    boardScale = windowWidth / baseBoardSize;
  } else if (isTablet) {
    boardScale = Math.min(0.95, windowWidth / baseBoardSize);
  }
  const CORNER = Math.round(68 * boardScale), CELL = Math.round(46 * boardScale);
  const cols = [CORNER, ...new Array(9).fill(CELL), CORNER];
  const rows = [CORNER, ...new Array(9).fill(CELL), CORNER];

  if (screen === "lobby") return <LobbyView lobbyMode={lobbyMode} setLobbyMode={setLobbyMode} playerCount={playerCount} setPlayerCount={setPlayerCount} createGame={() => createGame(playerCount)} joinCode={joinCode} setJoinCode={setJoinCode} joinGame={joinGame} error={error} aiOpponentCount={aiOpponentCount} setAiOpponentCount={setAiOpponentCount} aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty} startAIGame={() => startAIGame(aiOpponentCount, aiDifficulty)} />;
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
        startGame={() => startGame(playerCount, settings, aiDifficulty, aiPersonality)}
        db={db}
        ref={ref}
        runTransaction={runTransaction}
      />
    );
  }
  if (gameState?.status === "gameover") return <GameOverView gameState={gameState} resetToLobby={resetToLobby} />;
  if (!gameState?.players?.length) return <div className="screen-overlay flex-column flex-center align-center">Joining...</div>;

  return (
    <div className="game-root">
      <GameHeader roomCode={roomCode} codeCopied={codeCopied} setCodeCopied={setCodeCopied} gs_s={safeSettings(gameState)} gameState={gameState} rawPlayers={rawPlayers} myIdx={myIdx} resetToLobby={resetToLobby} layoutFocus={layoutFocus} setLayoutFocus={setLayoutFocus} />
      <TurnBanner isRolling={isRollingActive} cur={rawPlayers[gameState.currentPlayer]} gameState={gameState} isMyTurn={isMyTurn} />

      {sellToPay && sellToPay.playerId === myIdx && (
        <div className="debt-banner">
          <span className="text-md weight-bold text-danger">💸 You owe ${sellToPay.amount.toLocaleString()}!</span>
          {/* Sell buttons... */}
        </div>
      )}

      <div className="game-layout">
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
          diceArr={gameState.dice} 
          isRolling={isRollingActive} 
          diceLanding={diceLanding} 
          gs_s={safeSettings(gameState)} 
          isMyTurn={isMyTurn} 
          handleTimerExpire={() => { }} 
          modal={gameState.modal} 
          rawPlayers={rawPlayers} 
          myIdx={myIdx} 
          buyProperty={buyProperty} 
          pushState={pushState} 
          dismissModal={() => pushState((gs) => ({ ...gs, modal: null }))} 
          handleUseJailCard={handleUseJailCard} 
          handlePayJailFine={handlePayJailFine} 
          handleJailRoll={handleJailRoll} 
          handleSteal={handleSteal} 
          handleSwap={handleSwap} 
          buildHouse={buildHouse} 
          handleRouletteSpin={handleRouletteSpin} 
          eligibleStealTargets={[]} 
          eligibleSwapMine={[]} 
        />
        <SidePanelView 
          me={rawPlayers[myIdx]} 
          myIdx={myIdx} 
          isMyTurn={isMyTurn} 
          gameState={gameState} 
          processing={processing} 
          sellToPay={sellToPay} 
          handleRoll={handleRoll} 
          endTurn={() => advanceTurn(gameState)} 
          rawPlayers={rawPlayers} 
          wealthSeries={wealthHistory} 
          wealthMode={wealthMode} 
          setWealthMode={setWealthMode} 
          chartMin={0} 
          chartMax={10000} 
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
          logArr={safeLog(gameState)} 
          displayedChat={isLocalGame ? aiChatMessages : chatMessages} 
          chatInput={chatInput} 
          setChatInput={setChatInput} 
          sendChat={() => sendChat(chatInput, setChatInput)} 
          chatEndRef={chatEndRef} 
          isPhone={isPhone} 
        />

        {selectedSpace !== null && (
          <PropertyCardModal spaceId={selectedSpace} prop={props[selectedSpace]} players={rawPlayers} myIdx={myIdx} isMyTurn={isMyTurn} allProps={props} playerIsOnSpace={rawPlayers[myIdx]?.position === selectedSpace} onClose={() => setSelectedSpace(null)} onBuild={null} onBuy={() => buyProperty(selectedSpace)} />
        )}
      </div>
    </div>
  );
}
