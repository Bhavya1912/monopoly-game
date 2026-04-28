import { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue, update, runTransaction } from "firebase/database";
import { db } from "../services/firebase";
import {
  generateCode,
  safePlayers,
  freshGameState,
} from "../utils";
import {
  PLAYER_COLORS,
  PLAYER_TOKENS,
  DEFAULT_SETTINGS,
} from "../constants";

export function useGameRoom() {
  const [screen, setScreen] = useState("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [myIdx, setMyIdx] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [isLocalGame, setIsLocalGame] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [error, setError] = useState("");

  const [processing, setProcessing] = useState(false);

  const myIdxRef = useRef(null);
  const localVersionRef = useRef(0);
  const isLocalGameRef = useRef(false);

  useEffect(() => {
    myIdxRef.current = myIdx;
  }, [myIdx]);

  useEffect(() => {
    isLocalGameRef.current = isLocalGame;
  }, [isLocalGame]);

  // Firebase: game state
  useEffect(() => {
    if (!roomCode || screen === "lobby" || isLocalGame) return;
    const gameRef = ref(db, `games/${roomCode}/state`);
    const unsub = onValue(gameRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();

      // Normalize data
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

      localVersionRef.current = data.version || 0;
      setGameState(data);
      if (data.status === "playing" && screen === "waiting") setScreen("game");
    });
    return () => unsub();
  }, [roomCode, screen, isLocalGame]);

  // Firebase: lobby
  useEffect(() => {
    if (!roomCode || screen !== "waiting" || isLocalGame) return;
    const lobbyRef = ref(db, `games/${roomCode}/lobby`);
    const unsub = onValue(lobbyRef, (snap) => {
      if (snap.exists())
        setLobbyPlayers(Object.values(snap.val()).filter(Boolean));
    });
    return () => unsub();
  }, [roomCode, screen, isLocalGame]);

  // Firebase: chat
  useEffect(() => {
    if (!roomCode || screen === "lobby" || isLocalGame) return;
    const chatRef = ref(db, `games/${roomCode}/chat`);
    const unsub = onValue(chatRef, (snap) => {
      if (snap.exists()) {
        const msgs = Object.values(snap.val()).sort((a, b) => a.ts - b.ts);
        setChatMessages(msgs);
      } else setChatMessages([]);
    });
    return () => unsub();
  }, [roomCode, screen, isLocalGame]);

  const pushState = useCallback(
    (nextStateOrUpdater) => {
      if (isLocalGameRef.current) {
        setGameState((prev) => {
          const next =
            typeof nextStateOrUpdater === "function"
              ? nextStateOrUpdater(prev)
              : nextStateOrUpdater;
          const safe = {
            ...next,
            properties: next.properties && typeof next.properties === "object" ? next.properties : {},
            log: Array.isArray(next.log) ? next.log : [],
            players: Array.isArray(next.players) ? next.players : [],
            rolling: next.rolling ?? false,
          };
          const nextDice = next.dice || prev?.dice || [1, 1];
          const newVersion = (prev?.version ?? 0) + 1;
          localVersionRef.current = newVersion;
          return { ...prev, ...safe, dice: nextDice, version: newVersion };
        });
        return Promise.resolve(true);
      }

      const baseVersion = localVersionRef.current;
      const stateRef = ref(db, `games/${roomCode}/state`);
      return runTransaction(
        stateRef,
        (current) => {
          if (!current) return current;
          const currentVersion = current.version ?? 0;

          let next;
          if (typeof nextStateOrUpdater === "function") {
            next = nextStateOrUpdater(current);
          } else {
            if (currentVersion !== baseVersion) return; // Conflict
            next = nextStateOrUpdater;
          }

          const safe = {
            ...next,
            properties: next.properties && typeof next.properties === "object" ? next.properties : {},
            log: Array.isArray(next.log) ? next.log : [],
            players: Array.isArray(next.players) ? next.players : [],
            rolling: next.rolling ?? false,
          };

          const nextDice = next.dice || current.dice || [1, 1];
          return { ...current, ...safe, dice: nextDice, version: currentVersion + 1 };
        },
        { applyLocally: true },
      ).then((res) => {
        if (res.committed && res.snapshot.exists()) {
          localVersionRef.current = res.snapshot.val().version;
        }
        return res.committed;
      });
    },
    [roomCode],
  );

  const createGame = useCallback(async (playerCount) => {
    let code = "";
    let created = false;
    for (let attempt = 0; attempt < 8 && !created; attempt++) {
      const candidate = generateCode();
      const result = await runTransaction(
        ref(db, `games/${candidate}`),
        (current) => {
          if (current) return;
          return {
            lobby: { 0: { id: 0, token: PLAYER_TOKENS[0], color: PLAYER_COLORS[0] } },
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
    setScreen("waiting");
  }, []);

  const joinGame = useCallback(async (codeToJoin) => {
    if (!codeToJoin) {
      setError("Please enter a room code");
      return;
    }
    const code = codeToJoin.toUpperCase().trim();
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
            ...current.lobby,
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
      setError("No available slots");
      return;
    }

    setMyIdx(reservedIdx);
    setRoomCode(code);
    setIsHost(false);
    setScreen("waiting");
  }, []);

  const startGame = async (count, settings, aiDifficulty, aiPersonality) => {
    const aiP = settings.aiPlayers || [];
    const aiConfigs = {};
    aiP.forEach((idx) => {
      aiConfigs[idx] = { difficulty: aiDifficulty, personality: aiPersonality };
    });
    const gs = freshGameState(count, settings, aiP, aiConfigs);
    const stateRef = ref(db, `games/${roomCode}/state`);
    await runTransaction(stateRef, (current) => {
      if (current?.status === "playing" && current.version > 0) return;
      return gs;
    });
    setScreen("game");
  };

  const startAIGame = (aiOpponentCount, aiDifficulty) => {
    const totalPlayers = 1 + aiOpponentCount;
    const aiPlayerIndices = Array.from({ length: aiOpponentCount }, (_, i) => i + 1);
    const aiConfigs = {};
    aiPlayerIndices.forEach((idx) => {
      const personalities = ["aggressive", "conservative", "monopolist", "random"];
      aiConfigs[idx] = {
        difficulty: aiDifficulty,
        personality: personalities[(idx - 1) % personalities.length],
      };
    });
    const gs = freshGameState(totalPlayers, { ...DEFAULT_SETTINGS }, [...aiPlayerIndices], aiConfigs);
    setMyIdx(0);
    setIsLocalGame(true);
    setAiChatMessages([
      { id: -1, token: "🤖", text: "I am your AI advisor. Ask me about builds, trades, or risk.", ts: Date.now() },
    ]);
    setGameState(gs);
    setScreen("game");
  };

  const sendChat = async (chatInput, setChatInput) => {
    const text = chatInput.trim();
    if (!text || myIdx === null) return;
    setChatInput("");
    const me = safePlayers(gameState)[myIdx];
    const token = me?.token || PLAYER_TOKENS[myIdx] || "?";

    if (isLocalGame) {
      // Logic for AI advisor moved to controller or kept here?
      // For now, just add to local messages
      const now = Date.now();
      const mine = { id: myIdx, token, text, ts: now };
      setAiChatMessages((prev) => [...prev, mine]);
      return;
    }

    const msgId = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    await update(ref(db, `games/${roomCode}/chat`), {
      [msgId]: { id: myIdx, token, text, ts: Date.now() },
    });
  };

  // Update URL and handle initial load
  useEffect(() => {
    if (roomCode) {
      const url = new URL(globalThis.location.href);
      if (url.pathname !== `/${roomCode}`) {
        url.pathname = `/${roomCode}`;
        globalThis.history.pushState({ roomCode }, "", url);
      }
    } else {
      // Check if we should auto-join from URL on mount
      const path = globalThis.location.pathname.replace("/", "").toUpperCase();
      if (path?.length >= 4 && !roomCode) { // Using >= 4 as valid room codes can be length 4+ (e.g. from generateCode)
        setTimeout(() => joinGame(path), 0);
      } else if (!path && globalThis.location.pathname !== "/") {
        globalThis.history.replaceState({}, "", "/");
      }
    }
  }, [roomCode, joinGame]);

  // Handle back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = globalThis.location.pathname.replace("/", "").toUpperCase();
      if (!path) {
        setRoomCode("");
        setScreen("lobby");
      }
    };
    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, []);

  return {
    screen, setScreen,
    roomCode, setRoomCode,
    myIdx, setMyIdx,
    isHost, setIsHost,
    gameState, setGameState,
    isLocalGame, setIsLocalGame,
    lobbyPlayers, setLobbyPlayers,
    chatMessages, setChatMessages,
    aiChatMessages, setAiChatMessages,
    error, setError,
    processing, setProcessing,
    pushState,
    createGame,
    joinGame,
    startGame,
    startAIGame,
    sendChat,
  };
}
