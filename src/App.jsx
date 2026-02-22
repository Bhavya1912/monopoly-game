import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCzd09dkugQ8DMNO-3xKEl-DDzpKS66iFw",
  authDomain: "monopoly-game-1a36c.firebaseapp.com",
  databaseURL: "https://monopoly-game-1a36c-default-rtdb.firebaseio.com",
  projectId: "monopoly-game-1a36c",
  storageBucket: "monopoly-game-1a36c.firebasestorage.app",
  messagingSenderId: "817558285705",
  appId: "1:817558285705:web:efe8bcbf7a6ec093a64558",
  measurementId: "G-5W3KBDW4LT"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ── Constants ─────────────────────────────────────────────────────────────────
const SPACES = [
  { id: 0,  name: "GO",                 type: "go",          color: null,      price: null },
  { id: 1,  name: "Mediterranean Ave",  type: "property",    color: "#8B4513", price: 60,  rent: [2,10,30,90,160,250],       houseCost: 50 },
  { id: 2,  name: "Community Chest",    type: "community",   color: null,      price: null },
  { id: 3,  name: "Baltic Ave",         type: "property",    color: "#8B4513", price: 60,  rent: [4,20,60,180,320,450],      houseCost: 50 },
  { id: 4,  name: "Income Tax",         type: "tax",         color: null,      price: null, amount: 200 },
  { id: 5,  name: "Reading Railroad",   type: "railroad",    color: null,      price: 200, rent: [25,50,100,200] },
  { id: 6,  name: "Oriental Ave",       type: "property",    color: "#87CEEB", price: 100, rent: [6,30,90,270,400,550],      houseCost: 50 },
  { id: 7,  name: "Chance",             type: "chance",      color: null,      price: null },
  { id: 8,  name: "Vermont Ave",        type: "property",    color: "#87CEEB", price: 100, rent: [6,30,90,270,400,550],      houseCost: 50 },
  { id: 9,  name: "Connecticut Ave",    type: "property",    color: "#87CEEB", price: 120, rent: [8,40,100,300,450,600],     houseCost: 50 },
  { id: 10, name: "Jail",               type: "jail",        color: null,      price: null },
  { id: 11, name: "St. Charles Place",  type: "property",    color: "#FF69B4", price: 140, rent: [10,50,150,450,625,750],    houseCost: 100 },
  { id: 12, name: "Electric Company",   type: "utility",     color: null,      price: 150, rent: [] },
  { id: 13, name: "States Ave",         type: "property",    color: "#FF69B4", price: 140, rent: [10,50,150,450,625,750],    houseCost: 100 },
  { id: 14, name: "Virginia Ave",       type: "property",    color: "#FF69B4", price: 160, rent: [12,60,180,500,700,900],    houseCost: 100 },
  { id: 15, name: "Pennsylvania RR",    type: "railroad",    color: null,      price: 200, rent: [25,50,100,200] },
  { id: 16, name: "St. James Place",    type: "property",    color: "#FFA500", price: 180, rent: [14,70,200,550,750,950],    houseCost: 100 },
  { id: 17, name: "Community Chest",    type: "community",   color: null,      price: null },
  { id: 18, name: "Tennessee Ave",      type: "property",    color: "#FFA500", price: 180, rent: [14,70,200,550,750,950],    houseCost: 100 },
  { id: 19, name: "New York Ave",       type: "property",    color: "#FFA500", price: 200, rent: [16,80,220,600,800,1000],   houseCost: 100 },
  { id: 20, name: "Free Parking",       type: "freeparking", color: null,      price: null },
  { id: 21, name: "Kentucky Ave",       type: "property",    color: "#FF0000", price: 220, rent: [18,90,250,700,875,1050],   houseCost: 150 },
  { id: 22, name: "Chance",             type: "chance",      color: null,      price: null },
  { id: 23, name: "Indiana Ave",        type: "property",    color: "#FF0000", price: 220, rent: [18,90,250,700,875,1050],   houseCost: 150 },
  { id: 24, name: "Illinois Ave",       type: "property",    color: "#FF0000", price: 240, rent: [20,100,300,750,925,1100],  houseCost: 150 },
  { id: 25, name: "B&O Railroad",       type: "railroad",    color: null,      price: 200, rent: [25,50,100,200] },
  { id: 26, name: "Atlantic Ave",       type: "property",    color: "#DAA520", price: 260, rent: [22,110,330,800,975,1150],  houseCost: 150 },
  { id: 27, name: "Ventnor Ave",        type: "property",    color: "#DAA520", price: 260, rent: [22,110,330,800,975,1150],  houseCost: 150 },
  { id: 28, name: "Water Works",        type: "utility",     color: null,      price: 150, rent: [] },
  { id: 29, name: "Marvin Gardens",     type: "property",    color: "#DAA520", price: 280, rent: [24,120,360,850,1025,1200], houseCost: 150 },
  { id: 30, name: "Go To Jail",         type: "gotojail",    color: null,      price: null },
  { id: 31, name: "Pacific Ave",        type: "property",    color: "#228B22", price: 300, rent: [26,130,390,900,1100,1275], houseCost: 200 },
  { id: 32, name: "North Carolina Ave", type: "property",    color: "#228B22", price: 300, rent: [26,130,390,900,1100,1275], houseCost: 200 },
  { id: 33, name: "Community Chest",    type: "community",   color: null,      price: null },
  { id: 34, name: "Pennsylvania Ave",   type: "property",    color: "#228B22", price: 320, rent: [28,150,450,1000,1200,1400],houseCost: 200 },
  { id: 35, name: "Short Line RR",      type: "railroad",    color: null,      price: 200, rent: [25,50,100,200] },
  { id: 36, name: "Chance",             type: "chance",      color: null,      price: null },
  { id: 37, name: "Park Place",         type: "property",    color: "#00008B", price: 350, rent: [35,175,500,1100,1300,1500],houseCost: 200 },
  { id: 38, name: "Luxury Tax",         type: "tax",         color: null,      price: null, amount: 75 },
  { id: 39, name: "Boardwalk",          type: "property",    color: "#00008B", price: 400, rent: [50,200,600,1400,1700,2000],houseCost: 200 },
];

const COLOR_GROUPS = {};
SPACES.forEach(s => {
  if (s.type === "property" && s.color) {
    if (!COLOR_GROUPS[s.color]) COLOR_GROUPS[s.color] = [];
    COLOR_GROUPS[s.color].push(s.id);
  }
});

const CHANCE_CARDS = [
  { text: "Advance to GO! Collect $200",              action: (p) => ({ ...p, position: 0, money: p.money + 200 }) },
  { text: "Bank pays you a dividend of $50",           action: (p) => ({ ...p, money: p.money + 50 }) },
  { text: "Go back 3 spaces",                          action: (p) => ({ ...p, position: (p.position - 3 + 40) % 40 }) },
  { text: "Go directly to Jail!",                      action: (p) => ({ ...p, position: 10, inJail: true, jailTurns: 0 }) },
  { text: "Speeding fine — pay $15",                   action: (p) => ({ ...p, money: p.money - 15 }) },
  { text: "Building loan matures — collect $150",     action: (p) => ({ ...p, money: p.money + 150 }) },
  { text: "Won crossword competition — collect $100", action: (p) => ({ ...p, money: p.money + 100 }) },
];

const COMMUNITY_CARDS = [
  { text: "Bank error in your favor — collect $200", action: (p) => ({ ...p, money: p.money + 200 }) },
  { text: "Doctor's fees — pay $50",                  action: (p) => ({ ...p, money: p.money - 50 }) },
  { text: "From sale of stock — collect $50",         action: (p) => ({ ...p, money: p.money + 50 }) },
  { text: "Go to Jail! Do not pass GO.",              action: (p) => ({ ...p, position: 10, inJail: true, jailTurns: 0 }) },
  { text: "Holiday fund matures — receive $100",      action: (p) => ({ ...p, money: p.money + 100 }) },
  { text: "Income tax refund — collect $20",          action: (p) => ({ ...p, money: p.money + 20 }) },
  { text: "Life insurance matures — collect $100",    action: (p) => ({ ...p, money: p.money + 100 }) },
  { text: "Pay hospital fees of $100",                action: (p) => ({ ...p, money: p.money - 100 }) },
  { text: "Pay school fees of $50",                   action: (p) => ({ ...p, money: p.money - 50 }) },
  { text: "Consultancy fee — receive $25",            action: (p) => ({ ...p, money: p.money + 25 }) },
];

const PLAYER_COLORS = ["#E74C3C", "#3498DB", "#27AE60", "#F39C12"];
const PLAYER_TOKENS = ["🎩", "🚢", "🏎️", "🐶"];

// Pre-computed board grid positions (never changes)
const CELL_POSITIONS = [];
for (let i = 0; i <= 10; i++)  CELL_POSITIONS.push({ id: i,  gridRow: 11, gridColumn: 11 - i });
for (let i = 11; i <= 19; i++) CELL_POSITIONS.push({ id: i,  gridRow: 11 - (i - 10), gridColumn: 1 });
for (let i = 20; i <= 30; i++) CELL_POSITIONS.push({ id: i,  gridRow: 1,  gridColumn: i - 19 });
for (let i = 31; i <= 39; i++) CELL_POSITIONS.push({ id: i,  gridRow: i - 29, gridColumn: 11 });

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function freshGameState(playerCount) {
  return {
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: i, money: 1500, position: 0,
      color: PLAYER_COLORS[i], token: PLAYER_TOKENS[i],
      inJail: false, jailTurns: 0, bankrupt: false,
    })),
    properties: {},
    currentPlayer: 0,
    dice: [1, 1],
    rolled: false,
    doubleCount: 0,
    freePot: 0,
    log: ["🎲 Game started! Player 1's turn."],
    modal: null,
    status: "playing",
    hostPlayerCount: playerCount,
  };
}

// Safe helpers — never crash on null/undefined from Firebase
function safePlayers(gs) { return Array.isArray(gs?.players) ? gs.players : []; }
function safeProps(gs)   { return gs?.properties && typeof gs.properties === "object" ? gs.properties : {}; }
function safeLog(gs)     { return Array.isArray(gs?.log) ? gs.log : []; }
function safeDice(gs)    { return Array.isArray(gs?.dice) ? gs.dice : [1, 1]; }

// ── Board Cell ────────────────────────────────────────────────────────────────
function BoardCell({ spaceId, players, properties, isSelected, onClick }) {
  const space = SPACES[spaceId];
  if (!space) return <div style={{ width: "100%", height: "100%" }} />;

  const safeP = Array.isArray(players) ? players : [];
  const safeQ = properties && typeof properties === "object" ? properties : {};
  const prop = safeQ[spaceId];
  const here = safeP.filter(p => p && p.position === spaceId && !p.bankrupt);

  const bg =
    space.type === "go"          ? "#bbf7d0" :
    space.type === "jail"        ? "#fef9c3" :
    space.type === "gotojail"    ? "#fee2e2" :
    space.type === "freeparking" ? "#dcfce7" :
    space.type === "chance"      ? "#ffedd5" :
    space.type === "community"   ? "#dbeafe" :
    space.type === "tax"         ? "#fce7f3" :
    space.type === "railroad"    ? "#f5f5f5" :
    space.type === "utility"     ? "#ecfdf5" : "#ffffff";

  const shortName = space.name
    .replace(/ Avenue$/i, "").replace(/ Ave$/i, "")
    .replace(/ Place$/i, "").replace(/ Gardens$/i, "")
    .replace("Pennsylvania", "PA").replace("North Carolina", "NC")
    .replace("Reading Railroad", "Reading RR");

  return (
    <div onClick={onClick} style={{
      width: "100%", height: "100%", boxSizing: "border-box", background: bg,
      border: isSelected ? "2px solid #fbbf24" : "1px solid #9ca3af",
      cursor: "pointer", position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 1,
      boxShadow: isSelected ? "inset 0 0 6px rgba(251,191,36,0.6)" : "none",
    }}>
      {space.type === "property" && space.color && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 7, background: space.color }} />
      )}
      <div style={{
        fontSize: 6, fontWeight: 700, textAlign: "center", lineHeight: 1.2,
        marginTop: space.type === "property" ? 8 : 0, color: "#1f2937", padding: "0 1px",
      }}>{shortName}</div>
      {space.price && <div style={{ fontSize: 5.5, color: "#6b7280" }}>${space.price}</div>}
      {prop && <div style={{ fontSize: 8 }}>{prop.hotel ? "🏨" : "🏠".repeat(prop.houses || 0)}</div>}
      {here.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
          {here.map(p => <span key={p.id} style={{ fontSize: 11, lineHeight: 1 }}>{p.token}</span>)}
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]       = useState("lobby");
  const [playerCount, setPlayerCount] = useState(2);
  const [roomCode, setRoomCode]   = useState("");
  const [joinCode, setJoinCode]   = useState("");
  const [myIdx, setMyIdx]         = useState(null);
  const [isHost, setIsHost]       = useState(false);
  const [gameState, setGameState] = useState(null);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [error, setError]         = useState("");
  const [processing, setProcessing] = useState(false);

  const gsRef   = useRef(null);
  const myIdxRef = useRef(null);
  gsRef.current   = gameState;
  myIdxRef.current = myIdx;

  // ── Listen to game state ──
  useEffect(() => {
    if (!roomCode || screen === "lobby") return;
    const gameRef = ref(db, `games/${roomCode}/state`);
    const unsub = onValue(gameRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        // Ensure properties is always an object, never null
        if (data.properties == null) data.properties = {};
        if (!Array.isArray(data.log)) data.log = [];
        if (!Array.isArray(data.dice)) data.dice = [1, 1];
        if (!Array.isArray(data.players)) data.players = [];
        setGameState(data);
        if (data.status === "playing" && screen === "waiting") {
          setScreen("game");
        }
      }
    });
    return () => unsub();
  }, [roomCode, screen]);

  // ── Listen to lobby ──
  useEffect(() => {
    if (!roomCode || screen !== "waiting") return;
    const lobbyRef = ref(db, `games/${roomCode}/lobby`);
    const unsub = onValue(lobbyRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.values(data).filter(Boolean);
        setLobbyPlayers(list);
      }
    });
    return () => unsub();
  }, [roomCode, screen]);

  // ── Create game ──
  const createGame = async () => {
    const code = generateCode();
    setRoomCode(code);
    setIsHost(true);
    setMyIdx(0);
    myIdxRef.current = 0;
    await set(ref(db, `games/${code}`), {
      lobby: { 0: { id: 0, token: PLAYER_TOKENS[0], color: PLAYER_COLORS[0] } },
      state: { hostPlayerCount: playerCount, status: "waiting", properties: {}, players: [], log: [], dice: [1,1] },
    });
    setScreen("waiting");
  };

  // ── Join game ──
  const joinGame = async () => {
    const code = joinCode.toUpperCase().trim();
    if (code.length < 4) { setError("Enter a valid room code"); return; }
    setError("");
    const snap = await get(ref(db, `games/${code}`));
    if (!snap.exists()) { setError("Room not found! Check the code."); return; }
    const data = snap.val();
    const lobbyCount = data.lobby ? Object.keys(data.lobby).length : 0;
    const maxPlayers = data.state?.hostPlayerCount || 2;
    if (lobbyCount >= maxPlayers) { setError("Room is full!"); return; }
    const idx = lobbyCount;
    setMyIdx(idx);
    myIdxRef.current = idx;
    setRoomCode(code);
    setIsHost(false);
    await update(ref(db, `games/${code}/lobby`), {
      [idx]: { id: idx, token: PLAYER_TOKENS[idx], color: PLAYER_COLORS[idx] }
    });
    setScreen("waiting");
  };

  // ── Start game ──
  const startGame = async (count) => {
    const state = freshGameState(count);
    await set(ref(db, `games/${roomCode}/state`), state);
    setScreen("game");
  };

  const forceStart = () => startGame(lobbyPlayers.length);

  // ── Push state ──
  const pushState = (newState) => {
    // Always ensure properties is a plain object before pushing
    const safe = {
      ...newState,
      properties: newState.properties && typeof newState.properties === "object" ? newState.properties : {},
      log: Array.isArray(newState.log) ? newState.log : [],
      dice: Array.isArray(newState.dice) ? newState.dice : [1,1],
      players: Array.isArray(newState.players) ? newState.players : [],
    };
    return set(ref(db, `games/${roomCode}/state`), safe);
  };

  // ── Game helpers ──
  const isMyTurn = gameState && myIdx === gameState.currentPlayer;

  const calcRent = (space, prop, props, dice) => {
    const safeProps2 = props && typeof props === "object" ? props : {};
    if (space.type === "railroad") {
      const count = Object.entries(safeProps2).filter(([k, v]) =>
        v && v.owner === prop.owner && SPACES[+k]?.type === "railroad"
      ).length;
      return space.rent[Math.min(count - 1, 3)];
    }
    if (space.type === "utility") {
      const count = Object.entries(safeProps2).filter(([k, v]) =>
        v && v.owner === prop.owner && SPACES[+k]?.type === "utility"
      ).length;
      const diceArr = Array.isArray(dice) ? dice : [1,1];
      return (diceArr[0] + diceArr[1]) * (count === 2 ? 10 : 4);
    }
    const group = COLOR_GROUPS[space.color] || [];
    const monopoly = group.every(id => safeProps2[id]?.owner === prop.owner);
    if (prop.hotel) return space.rent[5];
    if ((prop.houses || 0) > 0) return space.rent[prop.houses];
    if (monopoly) return space.rent[0] * 2;
    return space.rent[0];
  };

  const doSpaceAction = (spaceId, player, gs, props, isDouble) => {
    const space = SPACES[spaceId];
    if (!space) { pushState({ ...gs, rolled: true }); setProcessing(false); return; }
    const players = safePlayers(gs).map(p => ({ ...p }));
    const log = safeLog(gs);
    const curIdx = gs.currentPlayer;

    const finish = (updPlayers, updProps, updFP, modal, forceEnd) => {
      pushState({
        ...gs,
        players: updPlayers || players,
        properties: updProps !== undefined ? updProps : props,
        freePot: updFP !== undefined ? updFP : (gs.freePot || 0),
        rolled: forceEnd ? true : !isDouble,
        modal: modal || null,
        log,
      }).then(() => setProcessing(false));
    };

    if (space.type === "go" || space.type === "jail") {
      finish(null, undefined, undefined, null, false);
    } else if (space.type === "gotojail") {
      log.unshift(`${player.token} — Go To Jail! 🔒`);
      players[curIdx] = { ...player, position: 10, inJail: true, jailTurns: 0 };
      finish(players, undefined, undefined, null, true);
    } else if (space.type === "tax") {
      log.unshift(`${player.token} pays ${space.name}: $${space.amount}`);
      players[curIdx] = { ...player, money: player.money - space.amount };
      finish(players, undefined, (gs.freePot || 0) + space.amount, null, false);
    } else if (space.type === "freeparking") {
      const pot = gs.freePot || 0;
      log.unshift(`${player.token} collects Free Parking: $${pot}!`);
      players[curIdx] = { ...player, money: player.money + pot };
      finish(players, undefined, 0, null, false);
    } else if (space.type === "chance") {
      const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
      log.unshift(`❓ Chance: ${card.text}`);
      players[curIdx] = card.action(player);
      finish(players, undefined, undefined, { type: "card", title: "❓ Chance!", text: card.text }, false);
    } else if (space.type === "community") {
      const card = COMMUNITY_CARDS[Math.floor(Math.random() * COMMUNITY_CARDS.length)];
      log.unshift(`📋 Community: ${card.text}`);
      players[curIdx] = card.action(player);
      finish(players, undefined, undefined, { type: "card", title: "📋 Community Chest!", text: card.text }, false);
    } else if (space.type === "property" || space.type === "railroad" || space.type === "utility") {
      const prop = props[spaceId];
      if (!prop) {
        finish(null, undefined, undefined, { type: "buy", spaceId, playerIdx: curIdx }, false);
      } else if (prop.owner !== curIdx) {
        const rent = calcRent(space, prop, props, gs.dice);
        log.unshift(`${player.token} pays $${rent} rent to ${players[prop.owner]?.token || "?"}`);
        players[curIdx] = { ...player, money: player.money - rent };
        if (players[prop.owner]) {
          players[prop.owner] = { ...players[prop.owner], money: players[prop.owner].money + rent };
        }
        if (players[curIdx].money < 0) {
          log.unshift(`${player.token} is BANKRUPT! 💸`);
          players[curIdx] = { ...players[curIdx], bankrupt: true };
        }
        finish(players, undefined, undefined, null, false);
      } else {
        finish(null, undefined, undefined, null, false);
      }
    } else {
      finish(null, undefined, undefined, null, false);
    }
  };

  const doMove = (player, steps, gs, props, isDouble) => {
    const players = safePlayers(gs).map(p => ({ ...p }));
    const oldPos = player.position;
    const newPos = (oldPos + steps) % 40;
    let updPlayer = { ...player, position: newPos };
    const log = safeLog(gs);

    if (oldPos + steps >= 40) {
      updPlayer.money += 200;
      log.unshift(`${player.token} passed GO — +$200!`);
    }
    players[gs.currentPlayer] = updPlayer;
    log.unshift(`${player.token} → ${SPACES[newPos].name}`);
    const newGs = { ...gs, players, log: log.slice(0, 25) };
    doSpaceAction(newPos, updPlayer, newGs, props, isDouble);
  };

  const handleRoll = () => {
    if (!isMyTurn || gameState.rolled || processing) return;
    setProcessing(true);

    const gs = { ...gsRef.current };
    const players = safePlayers(gs).map(p => ({ ...p }));
    const props = safeProps(gs);
    const player = players[gs.currentPlayer];
    if (!player || player.bankrupt) {
      advanceTurn(gs);
      return;
    }

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const isDouble = d1 === d2;
    const newDC = isDouble ? (gs.doubleCount || 0) + 1 : 0;
    const log = safeLog(gs);
    log.unshift(`${player.token} rolls ${d1}+${d2}=${d1+d2}${isDouble ? " 🎲 Doubles!" : ""}`);

    if (player.inJail) {
      if (isDouble) {
        log.unshift(`${player.token} escapes jail with doubles!`);
        const freed = { ...player, inJail: false, jailTurns: 0 };
        players[gs.currentPlayer] = freed;
        doMove(freed, d1 + d2, { ...gs, players, dice: [d1,d2], doubleCount: 0, log: log.slice(0,25) }, props, false);
      } else {
        const newJT = (player.jailTurns || 0) + 1;
        if (newJT >= 3) {
          log.unshift(`${player.token} pays $50 fine — out of jail`);
          const freed = { ...player, inJail: false, jailTurns: 0, money: player.money - 50 };
          players[gs.currentPlayer] = freed;
          doMove(freed, d1 + d2, { ...gs, players, dice: [d1,d2], log: log.slice(0,25) }, props, false);
        } else {
          log.unshift(`${player.token} still in jail (${newJT}/3)`);
          players[gs.currentPlayer] = { ...player, jailTurns: newJT };
          pushState({ ...gs, players, dice: [d1,d2], rolled: true, log: log.slice(0,25) })
            .then(() => setProcessing(false));
        }
      }
      return;
    }

    if (newDC === 3) {
      log.unshift(`${player.token} rolled 3 doubles — Jail! 🔒`);
      players[gs.currentPlayer] = { ...player, position: 10, inJail: true, jailTurns: 0 };
      pushState({ ...gs, players, dice: [d1,d2], rolled: true, doubleCount: 0, log: log.slice(0,25) })
        .then(() => setProcessing(false));
      return;
    }

    doMove(player, d1 + d2, { ...gs, players, dice: [d1,d2], doubleCount: newDC, log: log.slice(0,25) }, props, isDouble);
  };

  const advanceTurn = (gs) => {
    const players = safePlayers(gs);
    const active = players.filter(p => p && !p.bankrupt);
    if (active.length <= 1) {
      pushState({ ...gs, status: "gameover" }).then(() => setProcessing(false));
      return;
    }
    let next = (gs.currentPlayer + 1) % players.length;
    while (players[next]?.bankrupt) next = (next + 1) % players.length;
    const log = safeLog(gs);
    log.unshift(`▶ Player ${next + 1}'s turn`);
    pushState({ ...gs, currentPlayer: next, rolled: false, doubleCount: 0, log: log.slice(0,25) })
      .then(() => setProcessing(false));
  };

  const endTurn = () => {
    if (!isMyTurn || !gameState.rolled || processing) return;
    setProcessing(true);
    advanceTurn(gsRef.current);
  };

  const dismissModal = () => {
    if (!isMyTurn || !gameState?.modal) return;
    pushState({ ...gameState, modal: null });
  };

  const buyProperty = () => {
    if (!isMyTurn || !gameState?.modal) return;
    const { spaceId, playerIdx } = gameState.modal;
    const space = SPACES[spaceId];
    const players = safePlayers(gameState).map(p => ({ ...p }));
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
      properties: { ...props, [spaceId]: { owner: playerIdx, houses: 0, hotel: false } },
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
    const players = safePlayers(gs).map(p => ({ ...p }));
    const player = players[myIdx];
    const group = COLOR_GROUPS[space.color] || [];
    if (!group.every(id => props[id]?.owner === myIdx)) { return; }
    if (prop.hotel) return;
    const cost = space.houseCost || 100;
    if (player.money < cost) return;
    players[myIdx] = { ...player, money: player.money - cost };
    const log = safeLog(gs);
    let newProp;
    if ((prop.houses || 0) >= 4) {
      newProp = { ...prop, houses: 0, hotel: true };
      log.unshift(`${player.token} built a 🏨 hotel on ${space.name}!`);
    } else {
      newProp = { ...prop, houses: (prop.houses || 0) + 1 };
      log.unshift(`${player.token} built a 🏠 house on ${space.name}!`);
    }
    pushState({ ...gs, players, properties: { ...props, [spaceId]: newProp }, log: log.slice(0,25) });
  };

  const payJailFine = () => {
    if (!isMyTurn) return;
    const gs = gsRef.current;
    const players = safePlayers(gs).map(p => ({ ...p }));
    const player = players[myIdx];
    if (!player || player.money < 50) return;
    players[myIdx] = { ...player, money: player.money - 50, inJail: false, jailTurns: 0 };
    const log = safeLog(gs);
    log.unshift(`${player.token} paid $50 jail fine`);
    pushState({ ...gs, players, log: log.slice(0,25) });
  };

  // ── Grid dims ──
  const CORNER = 68, CELL = 46;
  const cols = [CORNER, ...Array(9).fill(CELL), CORNER];
  const rows = [CORNER, ...Array(9).fill(CELL), CORNER];

  // ── LOBBY ─────────────────────────────────────────────────────────────────────
  if (screen === "lobby") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg,#14532d,#166534,#15803d)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Georgia', serif",
      }}>
        <div style={{
          background: "#fefce8", borderRadius: 16, padding: "40px 48px",
          textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          border: "4px solid #a16207", maxWidth: 420, width: "90%",
        }}>
          <div style={{ fontSize: 72, marginBottom: 4 }}>🎲</div>
          <h1 style={{ margin: "0 0 4px", fontSize: 36, letterSpacing: 4, color: "#14532d" }}>MONOPOLY</h1>
          <p style={{ color: "#78716c", fontSize: 13, marginBottom: 28 }}>Online Multiplayer</p>

          <div style={{ marginBottom: 24, padding: 20, background: "#f0fdf4", borderRadius: 10, border: "2px solid #bbf7d0" }}>
            <h3 style={{ margin: "0 0 10px", color: "#14532d", fontSize: 16 }}>🏠 Create a Game</h3>
            <p style={{ fontSize: 12, color: "#555", margin: "0 0 10px" }}>Number of Players</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
              {[2, 3, 4].map(n => (
                <button key={n} onClick={() => setPlayerCount(n)} style={{
                  width: 48, height: 48, borderRadius: "50%", fontSize: 18, fontWeight: "bold",
                  border: playerCount === n ? "3px solid #14532d" : "2px solid #d4c89a",
                  background: playerCount === n ? "#14532d" : "#fff",
                  color: playerCount === n ? "#fff" : "#333", cursor: "pointer",
                }}>{n}</button>
              ))}
            </div>
            <button onClick={createGame} style={{
              background: "#14532d", color: "#fff", border: "none", padding: "12px 0",
              borderRadius: 8, fontSize: 15, fontWeight: "bold", cursor: "pointer", width: "100%",
            }}>Create Game →</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#d6d3d1" }} />
            <span style={{ color: "#a8a29e", fontSize: 12 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#d6d3d1" }} />
          </div>

          <div style={{ padding: 20, background: "#eff6ff", borderRadius: 10, border: "2px solid #bfdbfe" }}>
            <h3 style={{ margin: "0 0 10px", color: "#1e40af", fontSize: 16 }}>🔗 Join a Game</h3>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && joinGame()}
              placeholder="Enter room code"
              maxLength={6}
              style={{
                width: "100%", padding: "10px 14px", fontSize: 20, textAlign: "center",
                border: "2px solid #93c5fd", borderRadius: 8, boxSizing: "border-box",
                fontFamily: "monospace", letterSpacing: 6, marginBottom: 10,
                outline: "none", fontWeight: "bold",
              }}
            />
            {error && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 8px" }}>{error}</p>}
            <button onClick={joinGame} style={{
              background: "#1e40af", color: "#fff", border: "none", padding: "12px 0",
              borderRadius: 8, fontSize: 15, fontWeight: "bold", cursor: "pointer", width: "100%",
            }}>Join Game →</button>
          </div>
        </div>
      </div>
    );
  }

  // ── WAITING ROOM ──────────────────────────────────────────────────────────────
  if (screen === "waiting") {
    const maxPlayers = gameState?.hostPlayerCount || playerCount;
    return (
      <div style={{
        minHeight: "100vh", background: "linear-gradient(145deg,#14532d,#166534)",
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif",
      }}>
        <div style={{
          background: "#fefce8", borderRadius: 16, padding: "40px 48px",
          textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          border: "4px solid #a16207", maxWidth: 400, width: "90%",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⏳</div>
          <h2 style={{ color: "#14532d", margin: "0 0 6px", fontSize: 22 }}>Waiting for Players</h2>
          <p style={{ color: "#78716c", fontSize: 13, marginBottom: 20 }}>
            {lobbyPlayers.length} / {maxPlayers} players joined
          </p>

          <div style={{ background: "#14532d", borderRadius: 10, padding: "14px 24px", marginBottom: 24 }}>
            <p style={{ color: "#86efac", fontSize: 11, margin: "0 0 4px", letterSpacing: 2 }}>ROOM CODE — share with friends</p>
            <div style={{ color: "#fff", fontSize: 40, fontWeight: 900, letterSpacing: 10, fontFamily: "monospace" }}>
              {roomCode}
            </div>
          </div>

          {Array.from({ length: maxPlayers }, (_, i) => {
            const p = lobbyPlayers[i];
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px", borderRadius: 8, marginBottom: 6,
                background: p ? "#f0fdf4" : "#f5f5f4",
                border: p ? "2px solid #bbf7d0" : "2px dashed #d6d3d1",
              }}>
                <span style={{ fontSize: 22 }}>{p ? PLAYER_TOKENS[i] : "⬜"}</span>
                <span style={{ fontWeight: "bold", color: p ? PLAYER_COLORS[i] : "#a8a29e", fontSize: 14 }}>
                  {p ? `Player ${i + 1}${i === myIdx ? " (You)" : ""}` : "Waiting..."}
                </span>
                {p && <span style={{ marginLeft: "auto", color: "#16a34a", fontSize: 12 }}>✓</span>}
              </div>
            );
          })}

          <div style={{ marginTop: 16 }}>
            {isHost && lobbyPlayers.length >= 2 ? (
              <button onClick={forceStart} style={{
                background: "#14532d", color: "#fff", border: "none", padding: "12px 0",
                borderRadius: 8, fontSize: 15, fontWeight: "bold", cursor: "pointer", width: "100%",
              }}>▶ Start Game ({lobbyPlayers.length} players)</button>
            ) : (
              <p style={{ color: "#78716c", fontSize: 13 }}>
                {isHost ? "Need at least 2 players to start" : "Waiting for host to start..."}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── GAME OVER ─────────────────────────────────────────────────────────────────
  if (gameState?.status === "gameover") {
    const players = safePlayers(gameState);
    const winner = players.length > 0 ? players.reduce((a, b) => (a.money > b.money ? a : b)) : null;
    return (
      <div style={{
        minHeight: "100vh", background: "linear-gradient(145deg,#14532d,#15803d)",
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif",
      }}>
        <div style={{
          background: "#fefce8", borderRadius: 16, padding: 48, textAlign: "center",
          border: "4px solid gold", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontSize: 80 }}>🏆</div>
          <h2 style={{ fontSize: 32, color: "#14532d" }}>GAME OVER!</h2>
          {winner && <p style={{ fontSize: 20 }}>{winner.token} Player {winner.id + 1} wins!</p>}
          {winner && <p style={{ color: "#666" }}>Wealth: ${winner.money.toLocaleString()}</p>}
          <button onClick={() => { setScreen("lobby"); setGameState(null); setRoomCode(""); setMyIdx(null); }} style={{
            marginTop: 20, background: "#14532d", color: "#fff", border: "none",
            padding: "12px 32px", borderRadius: 8, fontSize: 15, cursor: "pointer", fontWeight: "bold",
          }}>Back to Lobby</button>
        </div>
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────────
  if (!gameState || !Array.isArray(gameState.players) || gameState.players.length === 0) {
    return (
      <div style={{
        minHeight: "100vh", background: "#14532d",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>🎲</div>
        <div style={{ color: "#86efac", fontSize: 20, fontFamily: "Georgia" }}>Loading game...</div>
        <div style={{ color: "#6ee7b7", fontSize: 12 }}>Connecting to room {roomCode}</div>
      </div>
    );
  }

  // ── GAME BOARD ────────────────────────────────────────────────────────────────
  const players = safePlayers(gameState);
  const props   = safeProps(gameState);
  const logArr  = safeLog(gameState);
  const diceArr = safeDice(gameState);
  const cur     = players[gameState.currentPlayer];
  const me      = players[myIdx] || null;
  const modal   = gameState.modal || null;
  const selSpace = selectedSpace !== null ? SPACES[selectedSpace] : null;
  const selProp  = selectedSpace !== null ? props[selectedSpace] : null;

  return (
    <div style={{
      minHeight: "100vh", background: "#14532d",
      fontFamily: "Georgia, serif", display: "flex", flexDirection: "column",
      padding: 8, boxSizing: "border-box", gap: 8,
    }}>
      {/* Header */}
      <div style={{
        background: "#fefce8", borderRadius: 8, padding: "6px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        border: "2px solid #a16207", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 2, color: "#14532d" }}>🎲 MONOPOLY</span>
          <span style={{ fontSize: 10, background: "#14532d", color: "#fff", padding: "2px 8px", borderRadius: 10, fontFamily: "monospace" }}>
            {roomCode}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {players.map((p, i) => p ? (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 4, opacity: p.bankrupt ? 0.4 : 1,
              background: gameState.currentPlayer === i ? "#dcfce7" : i === myIdx ? "#fef9c3" : "transparent",
              border: gameState.currentPlayer === i ? "2px solid #14532d" : i === myIdx ? "2px solid #ca8a04" : "2px solid transparent",
              borderRadius: 6, padding: "2px 8px",
            }}>
              <span style={{ fontSize: 15 }}>{p.token}</span>
              <div>
                <div style={{ fontSize: 9, fontWeight: "bold", color: p.color }}>P{i+1}{i===myIdx?" ★":""}</div>
                <div style={{ fontSize: 9 }}>${p.money.toLocaleString()}</div>
              </div>
              {p.inJail && <span style={{ fontSize: 9 }}>🔒</span>}
              {p.bankrupt && <span style={{ fontSize: 9 }}>💸</span>}
            </div>
          ) : null)}
        </div>
        <button onClick={() => { setScreen("lobby"); setGameState(null); setRoomCode(""); }} style={{
          background: "#dc2626", color: "#fff", border: "none", padding: "3px 10px",
          borderRadius: 4, fontSize: 11, cursor: "pointer",
        }}>Leave</button>
      </div>

      {/* Turn banner */}
      <div style={{
        textAlign: "center", fontSize: 13, fontWeight: "bold", padding: 2,
        color: isMyTurn ? "#86efac" : "#fca5a5",
      }}>
        {isMyTurn ? "✅ YOUR TURN — Roll the dice!" : `⏳ Waiting for ${cur?.token || "?"} Player ${(gameState.currentPlayer || 0) + 1}...`}
      </div>

      {/* Board + panel */}
      <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "flex-start" }}>
        {/* Board */}
        <div style={{
          display: "grid",
          gridTemplateColumns: cols.map(w => `${w}px`).join(" "),
          gridTemplateRows: rows.map(h => `${h}px`).join(" "),
          gap: 1, background: "#82b366",
          border: "3px solid #4d7c0f", borderRadius: 6, padding: 1, flexShrink: 0,
        }}>
          {CELL_POSITIONS.map(({ id, gridRow, gridColumn }) => (
            <div key={id} style={{ gridRow, gridColumn, display: "flex" }}>
              <BoardCell
                spaceId={id}
                players={players}
                properties={props}
                isSelected={selectedSpace === id}
                onClick={() => setSelectedSpace(selectedSpace === id ? null : id)}
              />
            </div>
          ))}
          {/* Center */}
          <div style={{
            gridRow: "2/11", gridColumn: "2/11",
            background: "#c8e6c9", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 4,
          }}>
            <div style={{
              fontSize: 20, fontWeight: 900, letterSpacing: 5, color: "#14532d",
              fontFamily: "Times New Roman", transform: "rotate(-35deg)", userSelect: "none",
            }}>MONOPOLY</div>
            <div style={{ fontSize: 11, color: "#555", background: "#fff8", padding: "2px 8px", borderRadius: 4 }}>
              🅿️ ${gameState.freePot || 0}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {diceArr.map((d, i) => (
                <div key={i} style={{
                  width: 34, height: 34, background: "#fff", border: "2px solid #444",
                  borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
                }}>
                  {["","⚀","⚁","⚂","⚃","⚄","⚅"][d] || "⚀"}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 200, maxWidth: 240 }}>
          {/* Controls */}
          {me && !me.bankrupt && (
            <div style={{ background: "#fefce8", border: "2px solid #a16207", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 26 }}>{me.token}</span>
                <div>
                  <div style={{ fontWeight: "bold", color: me.color, fontSize: 13 }}>You (P{myIdx+1})</div>
                  <div style={{ fontSize: 12 }}>${me.money.toLocaleString()}</div>
                </div>
                {me.inJail && <span style={{ fontSize: 10, background: "#fef08a", padding: "2px 5px", borderRadius: 4 }}>🔒 JAIL</span>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={handleRoll} disabled={!isMyTurn || gameState.rolled || processing} style={{
                  background: (!isMyTurn || gameState.rolled || processing) ? "#e5e7eb" : "#14532d",
                  color: (!isMyTurn || gameState.rolled || processing) ? "#9ca3af" : "#fff",
                  border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 13,
                  cursor: (!isMyTurn || gameState.rolled || processing) ? "default" : "pointer", fontWeight: "bold",
                }}>🎲 Roll</button>
                <button onClick={endTurn} disabled={!isMyTurn || !gameState.rolled || processing} style={{
                  background: (!isMyTurn || !gameState.rolled || processing) ? "#e5e7eb" : "#dc2626",
                  color: (!isMyTurn || !gameState.rolled || processing) ? "#9ca3af" : "#fff",
                  border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 13,
                  cursor: (!isMyTurn || !gameState.rolled || processing) ? "default" : "pointer", fontWeight: "bold",
                }}>End →</button>
                {me.inJail && isMyTurn && (
                  <button onClick={payJailFine} style={{
                    background: "#d97706", color: "#fff", border: "none",
                    padding: "8px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                  }}>Pay $50</button>
                )}
              </div>
            </div>
          )}

          {/* Selected space */}
          {selSpace && (
            <div style={{ background: "#fefce8", border: "2px solid #a16207", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 12 }}>{selSpace.name}</strong>
                <button onClick={() => setSelectedSpace(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
              {selSpace.type === "property" && selSpace.color && (
                <div style={{ height: 10, background: selSpace.color, borderRadius: 3, margin: "6px 0" }} />
              )}
              {selSpace.price && <div style={{ fontSize: 11, color: "#555" }}>Price: ${selSpace.price}</div>}
              {selProp && (
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  <div>Owner: {players[selProp.owner]?.token} P{selProp.owner + 1}</div>
                  <div>{selProp.hotel ? "🏨 Hotel" : `🏠 ×${selProp.houses || 0}`}</div>
                </div>
              )}
              {selSpace.type === "property" && selProp?.owner === myIdx && isMyTurn && (
                <button onClick={() => buildHouse(selectedSpace)} style={{
                  marginTop: 8, background: "#15803d", color: "#fff", border: "none",
                  padding: "6px 0", borderRadius: 4, fontSize: 11, cursor: "pointer", width: "100%",
                }}>Build House (${selSpace.houseCost})</button>
              )}
            </div>
          )}

          {/* Property list */}
          <div style={{
            background: "#fefce8", border: "2px solid #a16207",
            borderRadius: 8, padding: 10, overflowY: "auto", maxHeight: 220,
          }}>
            <div style={{ fontSize: 11, fontWeight: "bold", borderBottom: "1px solid #e7d9a0", paddingBottom: 4, marginBottom: 6 }}>
              Properties
            </div>
            {Object.keys(props).length === 0
              ? <div style={{ color: "#bbb", fontSize: 11, textAlign: "center", padding: 8 }}>None yet</div>
              : Object.entries(props).map(([id, prop]) => {
                  if (!prop) return null;
                  const space = SPACES[+id];
                  if (!space) return null;
                  return (
                    <div key={id} onClick={() => setSelectedSpace(+id)} style={{
                      display: "flex", alignItems: "center", gap: 4, fontSize: 10,
                      padding: "2px 4px", borderRadius: 3, cursor: "pointer", marginBottom: 2,
                      background: `${PLAYER_COLORS[prop.owner] || "#888"}18`,
                      border: `1px solid ${PLAYER_COLORS[prop.owner] || "#888"}44`,
                    }}>
                      {space.color && <div style={{ width: 8, height: 8, borderRadius: "50%", background: space.color, flexShrink: 0 }} />}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{space.name}</span>
                      <span>{players[prop.owner]?.token || "?"}</span>
                      {prop.hotel && <span>🏨</span>}
                      {!prop.hotel && (prop.houses || 0) > 0 && <span>{"🏠".repeat(prop.houses)}</span>}
                    </div>
                  );
                })
            }
          </div>

          {/* Log */}
          <div style={{
            background: "#0f172a", borderRadius: 8, padding: 10,
            height: 160, overflowY: "auto", border: "2px solid #334155",
          }}>
            {logArr.map((msg, i) => (
              <div key={i} style={{ color: i === 0 ? "#86efac" : "#64748b", fontSize: 10, lineHeight: 1.5 }}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
        }}>
          <div style={{
            background: "#fefce8", borderRadius: 14, padding: 28, maxWidth: 320, width: "90%",
            border: "3px solid #a16207", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", textAlign: "center",
          }}>
            {modal.type === "buy" && (() => {
              const space = SPACES[modal.spaceId];
              const p = players[modal.playerIdx];
              const isMe = modal.playerIdx === myIdx;
              if (!space || !p) return <div>Loading...</div>;
              return (
                <>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🏠</div>
                  <h3 style={{ color: "#14532d", margin: "0 0 8px", fontSize: 18 }}>{space.name}</h3>
                  {space.color && <div style={{ height: 12, background: space.color, borderRadius: 4, margin: "6px 0" }} />}
                  <div style={{ fontSize: 14, margin: "8px 0" }}>Price: <strong>${space.price}</strong></div>
                  <div style={{ fontSize: 12, color: "#78716c", marginBottom: 16 }}>
                    {isMe ? `Your balance: $${p.money.toLocaleString()}` : `${p.token} P${p.id+1} is deciding...`}
                  </div>
                  {isMe ? (
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                      <button onClick={buyProperty} disabled={p.money < space.price} style={{
                        background: p.money >= space.price ? "#14532d" : "#9ca3af",
                        color: "#fff", border: "none", padding: "10px 22px",
                        borderRadius: 6, fontSize: 14, fontWeight: "bold",
                        cursor: p.money >= space.price ? "pointer" : "default",
                      }}>Buy ✓</button>
                      <button onClick={dismissModal} style={{
                        background: "#dc2626", color: "#fff", border: "none",
                        padding: "10px 22px", borderRadius: 6, fontSize: 14, cursor: "pointer", fontWeight: "bold",
                      }}>Pass ✗</button>
                    </div>
                  ) : (
                    <p style={{ color: "#78716c", fontSize: 13 }}>Waiting for their decision...</p>
                  )}
                </>
              );
            })()}
            {modal.type === "card" && (
              <>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{modal.title?.startsWith("❓") ? "❓" : "📋"}</div>
                <h3 style={{ color: "#14532d", margin: "0 0 12px" }}>{modal.title}</h3>
                <p style={{ fontSize: 15, fontStyle: "italic", color: "#292524" }}>"{modal.text}"</p>
                {isMyTurn
                  ? <button onClick={dismissModal} style={{
                      marginTop: 16, background: "#14532d", color: "#fff", border: "none",
                      padding: "10px 26px", borderRadius: 6, fontSize: 14, cursor: "pointer", fontWeight: "bold",
                    }}>OK</button>
                  : <p style={{ color: "#78716c", fontSize: 13, marginTop: 12 }}>Waiting for current player...</p>
                }
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
