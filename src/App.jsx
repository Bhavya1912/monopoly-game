import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update } from "firebase/database";

// ── Firebase Setup ────────────────────────────────────────────────────────────
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

// ── Game Data ─────────────────────────────────────────────────────────────────
const SPACES = [
  { id: 0,  name: "GO",                 type: "go",          color: null,      price: null },
  { id: 1,  name: "Mediterranean Ave",  type: "property",    color: "#8B4513", price: 60,  rent: [2,10,30,90,160,250],      houseCost: 50 },
  { id: 2,  name: "Community Chest",    type: "community",   color: null,      price: null },
  { id: 3,  name: "Baltic Ave",         type: "property",    color: "#8B4513", price: 60,  rent: [4,20,60,180,320,450],     houseCost: 50 },
  { id: 4,  name: "Income Tax",         type: "tax",         color: null,      price: null, amount: 200 },
  { id: 5,  name: "Reading Railroad",   type: "railroad",    color: null,      price: 200, rent: [25,50,100,200] },
  { id: 6,  name: "Oriental Ave",       type: "property",    color: "#87CEEB", price: 100, rent: [6,30,90,270,400,550],     houseCost: 50 },
  { id: 7,  name: "Chance",             type: "chance",      color: null,      price: null },
  { id: 8,  name: "Vermont Ave",        type: "property",    color: "#87CEEB", price: 100, rent: [6,30,90,270,400,550],     houseCost: 50 },
  { id: 9,  name: "Connecticut Ave",    type: "property",    color: "#87CEEB", price: 120, rent: [8,40,100,300,450,600],    houseCost: 50 },
  { id: 10, name: "Jail",               type: "jail",        color: null,      price: null },
  { id: 11, name: "St. Charles Place",  type: "property",    color: "#FF69B4", price: 140, rent: [10,50,150,450,625,750],   houseCost: 100 },
  { id: 12, name: "Electric Company",   type: "utility",     color: null,      price: 150, rent: [] },
  { id: 13, name: "States Ave",         type: "property",    color: "#FF69B4", price: 140, rent: [10,50,150,450,625,750],   houseCost: 100 },
  { id: 14, name: "Virginia Ave",       type: "property",    color: "#FF69B4", price: 160, rent: [12,60,180,500,700,900],   houseCost: 100 },
  { id: 15, name: "Pennsylvania RR",    type: "railroad",    color: null,      price: 200, rent: [25,50,100,200] },
  { id: 16, name: "St. James Place",    type: "property",    color: "#FFA500", price: 180, rent: [14,70,200,550,750,950],   houseCost: 100 },
  { id: 17, name: "Community Chest",    type: "community",   color: null,      price: null },
  { id: 18, name: "Tennessee Ave",      type: "property",    color: "#FFA500", price: 180, rent: [14,70,200,550,750,950],   houseCost: 100 },
  { id: 19, name: "New York Ave",       type: "property",    color: "#FFA500", price: 200, rent: [16,80,220,600,800,1000],  houseCost: 100 },
  { id: 20, name: "Free Parking",       type: "freeparking", color: null,      price: null },
  { id: 21, name: "Kentucky Ave",       type: "property",    color: "#FF0000", price: 220, rent: [18,90,250,700,875,1050],  houseCost: 150 },
  { id: 22, name: "Chance",             type: "chance",      color: null,      price: null },
  { id: 23, name: "Indiana Ave",        type: "property",    color: "#FF0000", price: 220, rent: [18,90,250,700,875,1050],  houseCost: 150 },
  { id: 24, name: "Illinois Ave",       type: "property",    color: "#FF0000", price: 240, rent: [20,100,300,750,925,1100], houseCost: 150 },
  { id: 25, name: "B&O Railroad",       type: "railroad",    color: null,      price: 200, rent: [25,50,100,200] },
  { id: 26, name: "Atlantic Ave",       type: "property",    color: "#DAA520", price: 260, rent: [22,110,330,800,975,1150], houseCost: 150 },
  { id: 27, name: "Ventnor Ave",        type: "property",    color: "#DAA520", price: 260, rent: [22,110,330,800,975,1150], houseCost: 150 },
  { id: 28, name: "Water Works",        type: "utility",     color: null,      price: 150, rent: [] },
  { id: 29, name: "Marvin Gardens",     type: "property",    color: "#DAA520", price: 280, rent: [24,120,360,850,1025,1200],houseCost: 150 },
  { id: 30, name: "Go To Jail",         type: "gotojail",    color: null,      price: null },
  { id: 31, name: "Pacific Ave",        type: "property",    color: "#228B22", price: 300, rent: [26,130,390,900,1100,1275],houseCost: 200 },
  { id: 32, name: "North Carolina Ave", type: "property",    color: "#228B22", price: 300, rent: [26,130,390,900,1100,1275],houseCost: 200 },
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
  { text: "Bank error in your favor — collect $200",  action: (p) => ({ ...p, money: p.money + 200 }) },
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

// Board cell grid positions (11×11 grid, 1-indexed)
const CELL_POSITIONS = (() => {
  const pos = {};
  for (let i = 0; i <= 10; i++)  pos[i]  = { gridRow: 11, gridColumn: 11 - i };
  for (let i = 11; i <= 19; i++) pos[i]  = { gridRow: 11 - (i - 10), gridColumn: 1 };
  for (let i = 20; i <= 30; i++) pos[i]  = { gridRow: 1, gridColumn: i - 19 };
  for (let i = 31; i <= 39; i++) pos[i]  = { gridRow: i - 29, gridColumn: 11 };
  return pos;
})();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initGameState(playerCount) {
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

// ── Board Cell ────────────────────────────────────────────────────────────────
function BoardCell({ spaceId, players, properties, isSelected, onClick }) {
  const space = SPACES[spaceId];
  if (!space) return <div style={{ width: "100%", height: "100%" }} />;
  const prop = properties ? properties[spaceId] : null;
  const here = (players || []).filter(p => p.position === spaceId && !p.bankrupt);

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
      width: "100%", height: "100%", boxSizing: "border-box",
      background: bg,
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
      {prop && (
        <div style={{ fontSize: 8 }}>
          {prop.hotel ? "🏨" : "🏠".repeat(prop.houses || 0)}
        </div>
      )}
      {here.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
          {here.map(p => <span key={p.id} style={{ fontSize: 11, lineHeight: 1 }}>{p.token}</span>)}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("lobby"); // lobby | waiting | game
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [myPlayerIdx, setMyPlayerIdx] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const gsRef = useRef(null);
  gsRef.current = gameState;
  const myIdxRef = useRef(null);
  myIdxRef.current = myPlayerIdx;

  // ── Listen to game state from Firebase ──
  useEffect(() => {
    if (!roomCode || screen === "lobby") return;
    const gameRef = ref(db, `games/${roomCode}/state`);
    const unsub = onValue(gameRef, (snap) => {
      if (snap.exists()) {
        setGameState(snap.val());
      }
    });
    return () => unsub();
  }, [roomCode, screen]);

  // ── Listen to lobby players ──
  useEffect(() => {
    if (!roomCode || screen !== "waiting") return;
    const lobbyRef = ref(db, `games/${roomCode}/lobby`);
    const unsub = onValue(lobbyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const players = Object.values(data);
        setLobbyPlayers(players);
        // Auto-start when enough players joined
        if (isHost && players.length === (gsRef.current?.hostPlayerCount || playerCount)) {
          startGame(players.length);
        }
      }
    });
    return () => unsub();
  }, [roomCode, screen, isHost]);

  // ── Create Game ──
  const createGame = async () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setMyPlayerIdx(0);
    myIdxRef.current = 0;

    // Init the game slot in Firebase with host player count
    await set(ref(db, `games/${code}`), {
      lobby: { 0: { id: 0, token: PLAYER_TOKENS[0], color: PLAYER_COLORS[0], name: "Player 1 (You)" } },
      state: { hostPlayerCount: playerCount, status: "waiting" },
    });

    setScreen("waiting");
  };

  // ── Join Game ──
  const joinGame = async () => {
    if (joinCode.length < 4) { setError("Enter a valid room code"); return; }
    const code = joinCode.toUpperCase().trim();
    setError("");

    const snap = await get(ref(db, `games/${code}`));
    if (!snap.exists()) { setError("Room not found! Check the code."); return; }

    const data = snap.val();
    const lobbyCount = data.lobby ? Object.keys(data.lobby).length : 0;
    const maxPlayers = data.state?.hostPlayerCount || 2;

    if (lobbyCount >= maxPlayers) { setError("Room is full!"); return; }

    const myIdx = lobbyCount;
    setMyPlayerIdx(myIdx);
    myIdxRef.current = myIdx;
    setRoomCode(code);
    setIsHost(false);

    await update(ref(db, `games/${code}/lobby`), {
      [myIdx]: { id: myIdx, token: PLAYER_TOKENS[myIdx], color: PLAYER_COLORS[myIdx], name: `Player ${myIdx + 1}` }
    });

    setScreen("waiting");
  };

  // ── Start Game (host only, called when lobby is full) ──
  const startGame = async (count) => {
    const state = initGameState(count);
    await set(ref(db, `games/${roomCode}/state`), state);
    setScreen("game");
  };

  // ── Manual start for host (if they want to start early) ──
  const forceStart = async () => {
    await startGame(lobbyPlayers.length);
  };

  // ── Watch for game start (non-host players) ──
  useEffect(() => {
    if (screen !== "waiting" || isHost) return;
    const stateRef2 = ref(db, `games/${roomCode}/state/status`);
    const unsub = onValue(stateRef2, (snap) => {
      if (snap.exists() && snap.val() === "playing") {
        setScreen("game");
      }
    });
    return () => unsub();
  }, [screen, isHost, roomCode]);

  // ── Push state to Firebase ──
  const pushState = async (newState) => {
    await set(ref(db, `games/${roomCode}/state`), newState);
  };

  // ── Game Logic ──
  const isMyTurn = gameState && myPlayerIdx === gameState.currentPlayer;

  const handleRoll = () => {
    if (!isMyTurn || gameState.rolled || processing) return;
    setProcessing(true);

    const gs = { ...gsRef.current };
    const players = gs.players.map(p => ({ ...p }));
    const properties = { ...gs.properties };
    const player = players[gs.currentPlayer];
    if (!player || player.bankrupt) { advanceTurn(gs); return; }

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const isDouble = d1 === d2;
    const newDC = isDouble ? gs.doubleCount + 1 : 0;
    const log = [
      `${player.token} rolls ${d1}+${d2}=${d1 + d2}${isDouble ? " 🎲 Doubles!" : ""}`,
      ...gs.log,
    ].slice(0, 25);

    if (player.inJail) {
      if (isDouble) {
        const freed = { ...player, inJail: false, jailTurns: 0 };
        players[gs.currentPlayer] = freed;
        const newGs = { ...gs, players, dice: [d1, d2], doubleCount: 0, log: [`${player.token} escapes jail with doubles!`, ...gs.log].slice(0,25) };
        doMove(freed, d1 + d2, newGs, properties, false);
      } else {
        const newJT = player.jailTurns + 1;
        if (newJT >= 3) {
          const freed = { ...player, inJail: false, jailTurns: 0, money: player.money - 50 };
          players[gs.currentPlayer] = freed;
          const newGs = { ...gs, players, dice: [d1, d2], log: [`${player.token} pays $50 jail fine`, ...gs.log].slice(0,25) };
          doMove(freed, d1 + d2, newGs, properties, false);
        } else {
          players[gs.currentPlayer] = { ...player, jailTurns: newJT };
          pushState({ ...gs, players, dice: [d1, d2], rolled: true, log: [`${player.token} still in jail (${newJT}/3)`, ...gs.log].slice(0,25) });
          setProcessing(false);
        }
      }
      return;
    }

    if (newDC === 3) {
      players[gs.currentPlayer] = { ...player, position: 10, inJail: true, jailTurns: 0 };
      pushState({ ...gs, players, dice: [d1, d2], rolled: true, doubleCount: 0, log: [`${player.token} rolled 3 doubles — Jail! 🔒`, ...gs.log].slice(0,25) });
      setProcessing(false);
      return;
    }

    const newGs = { ...gs, players, dice: [d1, d2], doubleCount: newDC, log };
    doMove(player, d1 + d2, newGs, properties, isDouble);
  };

  const doMove = (player, steps, gs, properties, isDouble) => {
    const players = gs.players.map(p => ({ ...p }));
    const oldPos = player.position;
    const newPos = (oldPos + steps) % 40;
    let updPlayer = { ...player, position: newPos };
    let log = [...gs.log];

    if (newPos < oldPos || oldPos + steps >= 40) {
      updPlayer.money += 200;
      log = [`${player.token} passed GO — +$200!`, ...log].slice(0, 25);
    }

    players[gs.currentPlayer] = updPlayer;
    const space = SPACES[newPos];
    log = [`${player.token} → ${space.name}`, ...log].slice(0, 25);

    const newGs = { ...gs, players, log };
    doSpaceAction(newPos, updPlayer, newGs, properties, isDouble);
  };

  const doSpaceAction = (spaceId, player, gs, properties, isDouble) => {
    const space = SPACES[spaceId];
    if (!space) { pushState({ ...gs, rolled: true }); setProcessing(false); return; }

    const players = gs.players.map(p => ({ ...p }));
    let log = [...gs.log];

    const finish = (updPlayers, updProps, updFP, modal, forceEnd) => {
      const finalState = {
        ...gs,
        players: updPlayers || players,
        properties: updProps !== undefined ? updProps : properties,
        freePot: updFP !== undefined ? updFP : gs.freePot,
        rolled: forceEnd ? true : !isDouble,
        modal: modal || null,
        log,
      };
      pushState(finalState);
      setProcessing(false);
    };

    if (space.type === "go" || space.type === "jail") {
      finish(null, undefined, undefined, null, false);

    } else if (space.type === "gotojail") {
      log = [`${player.token} — Go To Jail! 🔒`, ...log].slice(0, 25);
      players[gs.currentPlayer] = { ...player, position: 10, inJail: true, jailTurns: 0 };
      finish(players, undefined, undefined, null, true);

    } else if (space.type === "tax") {
      log = [`${player.token} pays ${space.name}: $${space.amount}`, ...log].slice(0, 25);
      players[gs.currentPlayer] = { ...player, money: player.money - space.amount };
      finish(players, undefined, gs.freePot + space.amount, null, false);

    } else if (space.type === "freeparking") {
      log = [`${player.token} collects Free Parking: $${gs.freePot}!`, ...log].slice(0, 25);
      players[gs.currentPlayer] = { ...player, money: player.money + gs.freePot };
      finish(players, undefined, 0, null, false);

    } else if (space.type === "chance") {
      const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
      log = [`❓ Chance: ${card.text}`, ...log].slice(0, 25);
      players[gs.currentPlayer] = card.action(player);
      finish(players, undefined, undefined, { type: "card", title: "❓ Chance!", text: card.text }, false);

    } else if (space.type === "community") {
      const card = COMMUNITY_CARDS[Math.floor(Math.random() * COMMUNITY_CARDS.length)];
      log = [`📋 Community: ${card.text}`, ...log].slice(0, 25);
      players[gs.currentPlayer] = card.action(player);
      finish(players, undefined, undefined, { type: "card", title: "📋 Community Chest!", text: card.text }, false);

    } else if (space.type === "property" || space.type === "railroad" || space.type === "utility") {
      const prop = properties[spaceId];
      if (!prop) {
        finish(null, undefined, undefined, { type: "buy", spaceId, playerIdx: gs.currentPlayer }, false);
      } else if (prop.owner !== gs.currentPlayer) {
        const rent = calcRent(space, prop, properties, gs.dice);
        log = [`${player.token} pays $${rent} rent to ${gs.players[prop.owner]?.token}`, ...log].slice(0, 25);
        players[gs.currentPlayer] = { ...player, money: player.money - rent };
        players[prop.owner] = { ...gs.players[prop.owner], money: gs.players[prop.owner].money + rent };
        if (players[gs.currentPlayer].money < 0) {
          log = [`${player.token} is BANKRUPT! 💸`, ...log].slice(0, 25);
          players[gs.currentPlayer] = { ...players[gs.currentPlayer], bankrupt: true };
        }
        finish(players, undefined, undefined, null, false);
      } else {
        finish(null, undefined, undefined, null, false);
      }
    } else {
      finish(null, undefined, undefined, null, false);
    }
  };

  const calcRent = (space, prop, properties, dice) => {
    if (space.type === "railroad") {
      const count = Object.entries(properties).filter(([k, v]) =>
        v.owner === prop.owner && SPACES[+k]?.type === "railroad"
      ).length;
      return space.rent[Math.min(count - 1, 3)];
    }
    if (space.type === "utility") {
      const count = Object.entries(properties).filter(([k, v]) =>
        v.owner === prop.owner && SPACES[+k]?.type === "utility"
      ).length;
      return (dice[0] + dice[1]) * (count === 2 ? 10 : 4);
    }
    const group = COLOR_GROUPS[space.color] || [];
    const monopoly = group.every(id => properties[id]?.owner === prop.owner);
    if (prop.hotel) return space.rent[5];
    if ((prop.houses || 0) > 0) return space.rent[prop.houses];
    if (monopoly) return space.rent[0] * 2;
    return space.rent[0];
  };

  const dismissModal = () => {
    if (!isMyTurn || !gameState.modal) return;
    pushState({ ...gameState, modal: null });
  };

  const buyProperty = () => {
    if (!isMyTurn || !gameState.modal) return;
    const { spaceId, playerIdx } = gameState.modal;
    const space = SPACES[spaceId];
    const players = gameState.players.map(p => ({ ...p }));
    const player = players[playerIdx];
    if (!player || player.money < space.price) {
      pushState({ ...gameState, modal: null });
      return;
    }
    players[playerIdx] = { ...player, money: player.money - space.price };
    const properties = { ...gameState.properties, [spaceId]: { owner: playerIdx, houses: 0, hotel: false } };
    const log = [`${player.token} bought ${space.name} for $${space.price}`, ...gameState.log].slice(0, 25);
    pushState({ ...gameState, players, properties, modal: null, log });
  };

  const buildHouse = (spaceId) => {
    if (!isMyTurn) return;
    const gs = gsRef.current;
    const space = SPACES[spaceId];
    if (!space) return;
    const prop = gs.properties[spaceId];
    if (!prop || prop.owner !== myPlayerIdx) return;
    const player = gs.players[myPlayerIdx];
    const group = COLOR_GROUPS[space.color] || [];
    const hasMonopoly = group.every(id => gs.properties[id]?.owner === myPlayerIdx);
    if (!hasMonopoly) return;
    if (prop.hotel) return;
    const cost = space.houseCost || 100;
    if (player.money < cost) return;

    const players = gs.players.map(p => ({ ...p }));
    players[myPlayerIdx] = { ...player, money: player.money - cost };
    let newProp;
    let logMsg;
    if ((prop.houses || 0) >= 4) {
      newProp = { ...prop, houses: 0, hotel: true };
      logMsg = `${player.token} built a 🏨 hotel on ${space.name}!`;
    } else {
      newProp = { ...prop, houses: (prop.houses || 0) + 1 };
      logMsg = `${player.token} built a 🏠 house on ${space.name}!`;
    }
    const properties = { ...gs.properties, [spaceId]: newProp };
    const log = [logMsg, ...gs.log].slice(0, 25);
    pushState({ ...gs, players, properties, log });
  };

  const payJailFine = () => {
    if (!isMyTurn) return;
    const gs = gsRef.current;
    const players = gs.players.map(p => ({ ...p }));
    const player = players[myPlayerIdx];
    if (player.money < 50) return;
    players[myPlayerIdx] = { ...player, money: player.money - 50, inJail: false, jailTurns: 0 };
    const log = [`${player.token} paid $50 jail fine`, ...gs.log].slice(0, 25);
    pushState({ ...gs, players, log });
  };

  const advanceTurn = (gs) => {
    const active = gs.players.filter(p => !p.bankrupt);
    if (active.length === 1) {
      pushState({ ...gs, status: "gameover", rolled: true });
      setProcessing(false);
      return;
    }
    let next = (gs.currentPlayer + 1) % gs.players.length;
    while (gs.players[next]?.bankrupt) next = (next + 1) % gs.players.length;
    const log = [`▶ Player ${next + 1}'s turn`, ...gs.log].slice(0, 25);
    pushState({ ...gs, currentPlayer: next, rolled: false, doubleCount: 0, log });
    setProcessing(false);
  };

  const endTurn = () => {
    if (!isMyTurn || !gameState.rolled || processing) return;
    setProcessing(true);
    advanceTurn(gsRef.current);
  };

  // ── Grid sizes ──
  const CORNER = 68, CELL = 46;
  const cols = [CORNER, ...Array(9).fill(CELL), CORNER];
  const rows = [CORNER, ...Array(9).fill(CELL), CORNER];

  // ── LOBBY SCREEN ──────────────────────────────────────────────────────────────
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
          <p style={{ color: "#78716c", fontSize: 13, marginBottom: 32 }}>Online Multiplayer</p>

          {/* Create Game */}
          <div style={{ marginBottom: 28, padding: 20, background: "#f0fdf4", borderRadius: 10, border: "2px solid #bbf7d0" }}>
            <h3 style={{ margin: "0 0 12px", color: "#14532d", fontSize: 16 }}>🏠 Create a Game</h3>
            <p style={{ fontSize: 12, color: "#555", margin: "0 0 12px" }}>Number of Players</p>
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
              background: "#14532d", color: "#fff", border: "none", padding: "12px 32px",
              borderRadius: 8, fontSize: 15, fontWeight: "bold", cursor: "pointer", width: "100%",
              letterSpacing: 1,
            }}>Create Game →</button>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#d6d3d1" }} />
            <span style={{ color: "#a8a29e", fontSize: 12 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#d6d3d1" }} />
          </div>

          {/* Join Game */}
          <div style={{ padding: 20, background: "#eff6ff", borderRadius: 10, border: "2px solid #bfdbfe" }}>
            <h3 style={{ margin: "0 0 12px", color: "#1e40af", fontSize: 16 }}>🔗 Join a Game</h3>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && joinGame()}
              placeholder="Enter room code (e.g. XK7R2M)"
              maxLength={6}
              style={{
                width: "100%", padding: "10px 14px", fontSize: 18, textAlign: "center",
                border: "2px solid #93c5fd", borderRadius: 8, boxSizing: "border-box",
                fontFamily: "monospace", letterSpacing: 4, marginBottom: 10,
                outline: "none", fontWeight: "bold",
              }}
            />
            {error && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 8px" }}>{error}</p>}
            <button onClick={joinGame} style={{
              background: "#1e40af", color: "#fff", border: "none", padding: "12px 32px",
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
        minHeight: "100vh",
        background: "linear-gradient(145deg,#14532d,#166534)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Georgia, serif",
      }}>
        <div style={{
          background: "#fefce8", borderRadius: 16, padding: "40px 48px",
          textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          border: "4px solid #a16207", maxWidth: 400, width: "90%",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⏳</div>
          <h2 style={{ color: "#14532d", margin: "0 0 6px", fontSize: 24 }}>Waiting for Players</h2>
          <p style={{ color: "#78716c", fontSize: 13, marginBottom: 20 }}>
            {lobbyPlayers.length}/{maxPlayers} players joined
          </p>

          {/* Room Code */}
          <div style={{
            background: "#14532d", borderRadius: 10, padding: "16px 24px", marginBottom: 24,
          }}>
            <p style={{ color: "#86efac", fontSize: 11, margin: "0 0 6px", letterSpacing: 2 }}>ROOM CODE</p>
            <div style={{
              color: "#fff", fontSize: 36, fontWeight: 900, letterSpacing: 8,
              fontFamily: "monospace",
            }}>{roomCode}</div>
            <p style={{ color: "#86efac", fontSize: 11, margin: "6px 0 0" }}>Share this code with your friends</p>
          </div>

          {/* Players */}
          <div style={{ marginBottom: 20 }}>
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
                    {p ? `Player ${i + 1}${i === myPlayerIdx ? " (You)" : ""}` : "Waiting..."}
                  </span>
                  {p && <span style={{ marginLeft: "auto", color: "#16a34a", fontSize: 12 }}>✓ Connected</span>}
                </div>
              );
            })}
          </div>

          {isHost && lobbyPlayers.length >= 2 && (
            <button onClick={forceStart} style={{
              background: "#14532d", color: "#fff", border: "none", padding: "12px 32px",
              borderRadius: 8, fontSize: 15, fontWeight: "bold", cursor: "pointer", width: "100%",
            }}>Start Game Now ({lobbyPlayers.length} players)</button>
          )}
          {!isHost && (
            <p style={{ color: "#78716c", fontSize: 13 }}>Waiting for host to start the game...</p>
          )}
        </div>
      </div>
    );
  }

  // ── GAME OVER ─────────────────────────────────────────────────────────────────
  if (gameState?.status === "gameover") {
    const winner = gameState.players.reduce((a, b) => a.money > b.money ? a : b);
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
          <h2 style={{ fontSize: 34, color: "#14532d", margin: "8px 0" }}>GAME OVER!</h2>
          <p style={{ fontSize: 22 }}>{winner.token} Player {winner.id + 1} wins!</p>
          <p style={{ color: "#666" }}>Wealth: ${winner.money.toLocaleString()}</p>
          <button onClick={() => { setScreen("lobby"); setGameState(null); setRoomCode(""); setMyPlayerIdx(null); }} style={{
            marginTop: 20, background: "#14532d", color: "#fff", border: "none",
            padding: "12px 32px", borderRadius: 8, fontSize: 15, cursor: "pointer", fontWeight: "bold",
          }}>Back to Lobby</button>
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ───────────────────────────────────────────────────────────────
  if (!gameState || screen !== "game") {
    return (
      <div style={{ minHeight: "100vh", background: "#14532d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#fff", fontSize: 20 }}>Loading game...</div>
      </div>
    );
  }

  const cur = gameState.players[gameState.currentPlayer];
  const me = gameState.players[myPlayerIdx];
  const selSpace = selectedSpace !== null ? SPACES[selectedSpace] : null;
  const selProp  = selectedSpace !== null ? gameState.properties[selectedSpace] : null;
  const modal = gameState.modal;

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
          {gameState.players.map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 4, opacity: p.bankrupt ? 0.4 : 1,
              background: gameState.currentPlayer === p.id ? "#dcfce7" : p.id === myPlayerIdx ? "#fef9c3" : "transparent",
              border: gameState.currentPlayer === p.id ? "2px solid #14532d" : p.id === myPlayerIdx ? "2px solid #ca8a04" : "2px solid transparent",
              borderRadius: 6, padding: "2px 8px",
            }}>
              <span style={{ fontSize: 15 }}>{p.token}</span>
              <div>
                <div style={{ fontSize: 9, fontWeight: "bold", color: p.color }}>
                  P{p.id + 1}{p.id === myPlayerIdx ? " ★" : ""}
                </div>
                <div style={{ fontSize: 9 }}>${p.money.toLocaleString()}</div>
              </div>
              {p.inJail && <span style={{ fontSize: 9 }}>🔒</span>}
              {p.bankrupt && <span style={{ fontSize: 9 }}>💸</span>}
            </div>
          ))}
        </div>
        <button onClick={() => { setScreen("lobby"); setGameState(null); setRoomCode(""); }} style={{
          background: "#dc2626", color: "#fff", border: "none", padding: "3px 10px",
          borderRadius: 4, fontSize: 11, cursor: "pointer",
        }}>Leave</button>
      </div>

      {/* Turn indicator */}
      <div style={{
        textAlign: "center", padding: "4px",
        color: isMyTurn ? "#86efac" : "#fca5a5",
        fontSize: 13, fontWeight: "bold",
      }}>
        {isMyTurn ? "✅ YOUR TURN" : `⏳ Waiting for ${cur?.token} Player ${gameState.currentPlayer + 1}...`}
      </div>

      {/* Main */}
      <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "flex-start" }}>
        {/* Board */}
        <div style={{
          display: "grid",
          gridTemplateColumns: cols.map(w => `${w}px`).join(" "),
          gridTemplateRows: rows.map(h => `${h}px`).join(" "),
          gap: 1, background: "#82b366",
          border: "3px solid #4d7c0f", borderRadius: 6, padding: 1, flexShrink: 0,
        }}>
          {Object.entries(CELL_POSITIONS).map(([id, { gridRow, gridColumn }]) => (
            <div key={id} style={{ gridRow, gridColumn, display: "flex" }}>
              <BoardCell
                spaceId={+id}
                players={gameState.players}
                properties={gameState.properties}
                isSelected={selectedSpace === +id}
                onClick={() => setSelectedSpace(selectedSpace === +id ? null : +id)}
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
              🅿️ ${gameState.freePot}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {gameState.dice.map((d, i) => (
                <div key={i} style={{
                  width: 34, height: 34, background: "#fff",
                  border: "2px solid #444", borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
                }}>
                  {["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][d]}
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
                  <div style={{ fontWeight: "bold", color: me.color, fontSize: 13 }}>
                    You (Player {myPlayerIdx + 1})
                  </div>
                  <div style={{ fontSize: 12 }}>${me.money.toLocaleString()}</div>
                </div>
                {me.inJail && <span style={{ fontSize: 11, background: "#fef08a", padding: "2px 6px", borderRadius: 4 }}>🔒 JAIL</span>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={handleRoll}
                  disabled={!isMyTurn || gameState.rolled || processing}
                  style={{
                    background: (!isMyTurn || gameState.rolled || processing) ? "#e5e7eb" : "#14532d",
                    color: (!isMyTurn || gameState.rolled || processing) ? "#9ca3af" : "#fff",
                    border: "none", padding: "8px 14px", borderRadius: 6,
                    fontSize: 13, cursor: (!isMyTurn || gameState.rolled || processing) ? "default" : "pointer",
                    fontWeight: "bold",
                  }}
                >🎲 Roll</button>
                <button
                  onClick={endTurn}
                  disabled={!isMyTurn || !gameState.rolled || processing}
                  style={{
                    background: (!isMyTurn || !gameState.rolled || processing) ? "#e5e7eb" : "#dc2626",
                    color: (!isMyTurn || !gameState.rolled || processing) ? "#9ca3af" : "#fff",
                    border: "none", padding: "8px 14px", borderRadius: 6,
                    fontSize: 13, cursor: (!isMyTurn || !gameState.rolled || processing) ? "default" : "pointer",
                    fontWeight: "bold",
                  }}
                >End →</button>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 12 }}>{selSpace.name}</strong>
                <button onClick={() => setSelectedSpace(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              {selSpace.type === "property" && selSpace.color && (
                <div style={{ height: 10, background: selSpace.color, borderRadius: 3, margin: "6px 0" }} />
              )}
              {selSpace.price && <div style={{ fontSize: 11, color: "#555" }}>Price: ${selSpace.price}</div>}
              {selProp && (
                <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>
                  <div>Owner: {gameState.players[selProp.owner]?.token} P{selProp.owner + 1}</div>
                  <div>{selProp.hotel ? "🏨 Hotel" : `🏠 ×${selProp.houses || 0}`}</div>
                </div>
              )}
              {selSpace.type === "property" && selProp?.owner === myPlayerIdx && isMyTurn && (
                <button onClick={() => buildHouse(selectedSpace)} style={{
                  marginTop: 8, background: "#15803d", color: "#fff",
                  border: "none", padding: "6px 0", borderRadius: 4,
                  fontSize: 11, cursor: "pointer", width: "100%",
                }}>Build House (${selSpace.houseCost})</button>
              )}
            </div>
          )}

          {/* Properties */}
          <div style={{
            background: "#fefce8", border: "2px solid #a16207",
            borderRadius: 8, padding: 10, overflowY: "auto", maxHeight: 220,
          }}>
            <div style={{ fontSize: 11, fontWeight: "bold", borderBottom: "1px solid #e7d9a0", paddingBottom: 4, marginBottom: 6 }}>
              Properties
            </div>
            {Object.keys(gameState.properties).length === 0 && (
              <div style={{ color: "#bbb", fontSize: 11, textAlign: "center", padding: 8 }}>None yet</div>
            )}
            {Object.entries(gameState.properties).map(([id, prop]) => {
              const space = SPACES[+id];
              if (!space) return null;
              return (
                <div key={id} onClick={() => setSelectedSpace(+id)} style={{
                  display: "flex", alignItems: "center", gap: 4, fontSize: 10,
                  padding: "2px 4px", borderRadius: 3, cursor: "pointer", marginBottom: 2,
                  background: `${PLAYER_COLORS[prop.owner]}18`,
                  border: `1px solid ${PLAYER_COLORS[prop.owner]}44`,
                }}>
                  {space.color && <div style={{ width: 8, height: 8, borderRadius: "50%", background: space.color, flexShrink: 0 }} />}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{space.name}</span>
                  <span>{gameState.players[prop.owner]?.token}</span>
                  {prop.hotel && <span>🏨</span>}
                  {!prop.hotel && (prop.houses || 0) > 0 && <span>{"🏠".repeat(prop.houses)}</span>}
                </div>
              );
            })}
          </div>

          {/* Log */}
          <div style={{
            background: "#0f172a", borderRadius: 8, padding: 10,
            height: 160, overflowY: "auto", border: "2px solid #334155",
          }}>
            {(gameState.log || []).map((msg, i) => (
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
            background: "#fefce8", borderRadius: 14, padding: 28,
            maxWidth: 320, width: "90%",
            border: "3px solid #a16207", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            textAlign: "center",
          }}>
            {modal.type === "buy" && (() => {
              const space = SPACES[modal.spaceId];
              const p = gameState.players[modal.playerIdx];
              const isMe = modal.playerIdx === myPlayerIdx;
              return (
                <>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🏠</div>
                  <h3 style={{ color: "#14532d", margin: "0 0 8px", fontSize: 18 }}>{space?.name}</h3>
                  {space?.color && <div style={{ height: 12, background: space.color, borderRadius: 4, margin: "6px 0" }} />}
                  <div style={{ fontSize: 14, margin: "8px 0" }}>Price: <strong>${space?.price}</strong></div>
                  <div style={{ fontSize: 12, color: "#78716c", marginBottom: 16 }}>
                    {isMe ? `Your balance: $${p?.money.toLocaleString()}` : `${p?.token} Player ${p?.id + 1} is deciding...`}
                  </div>
                  {isMe ? (
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                      <button onClick={buyProperty} disabled={!p || p.money < (space?.price || 0)} style={{
                        background: p && p.money >= (space?.price || 0) ? "#14532d" : "#9ca3af",
                        color: "#fff", border: "none", padding: "10px 22px",
                        borderRadius: 6, fontSize: 14, fontWeight: "bold",
                        cursor: p && p.money >= (space?.price || 0) ? "pointer" : "default",
                      }}>Buy ✓</button>
                      <button onClick={dismissModal} style={{
                        background: "#dc2626", color: "#fff", border: "none",
                        padding: "10px 22px", borderRadius: 6, fontSize: 14,
                        cursor: "pointer", fontWeight: "bold",
                      }}>Pass ✗</button>
                    </div>
                  ) : (
                    <div style={{ color: "#78716c", fontSize: 13 }}>Waiting for their decision...</div>
                  )}
                </>
              );
            })()}
            {modal.type === "card" && (
              <>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{modal.title?.startsWith("❓") ? "❓" : "📋"}</div>
                <h3 style={{ color: "#14532d", margin: "0 0 12px" }}>{modal.title}</h3>
                <p style={{ fontSize: 15, fontStyle: "italic", color: "#292524" }}>"{modal.text}"</p>
                {isMyTurn ? (
                  <button onClick={dismissModal} style={{
                    marginTop: 16, background: "#14532d", color: "#fff",
                    border: "none", padding: "10px 26px", borderRadius: 6,
                    fontSize: 14, cursor: "pointer", fontWeight: "bold",
                  }}>OK</button>
                ) : (
                  <div style={{ color: "#78716c", fontSize: 13, marginTop: 12 }}>Waiting for current player...</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
