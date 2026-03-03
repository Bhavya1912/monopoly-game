// ─────────────────────────────────────────────────────────────────────────────
// CSS (injected once into <head> at runtime)
// ─────────────────────────────────────────────────────────────────────────────
export const STYLE = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 100%; overflow-x: hidden; }

  @keyframes diceShake {
    0%   { transform: rotate(0deg) scale(1); }
    20%  { transform: rotate(-18deg) scale(1.25); }
    40%  { transform: rotate(18deg) scale(1.3); }
    60%  { transform: rotate(-12deg) scale(1.2); }
    80%  { transform: rotate(10deg) scale(1.15); }
    100% { transform: rotate(0deg) scale(1); }
  }
  @keyframes diceLand {
    0%   { transform: scale(1.4); box-shadow: 0 0 24px 6px rgba(255,215,0,0.9); }
    60%  { transform: scale(0.92); }
    100% { transform: scale(1); box-shadow: 2px 2px 6px rgba(0,0,0,0.3); }
  }
  @keyframes tokenBounce {
    0%   { transform: translateY(0) scale(1); }
    35%  { transform: translateY(-10px) scale(1.4); filter: drop-shadow(0 0 8px gold); }
    65%  { transform: translateY(-5px) scale(1.2); }
    85%  { transform: translateY(-7px) scale(1.25); }
    100% { transform: translateY(0) scale(1); filter: none; }
  }
  @keyframes cellPulse {
    0%   { box-shadow: inset 0 0 0px rgba(255,165,0,0); }
    50%  { box-shadow: inset 0 0 16px rgba(255,165,0,0.9); background: rgba(255,200,0,0.3) !important; }
    100% { box-shadow: inset 0 0 0px rgba(255,165,0,0); }
  }
  @keyframes ownerPulse {
    0%,100% { opacity: 0.6; } 50% { opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes timerPulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes slideIn {
    from { opacity:0; transform: translateY(-10px) scale(0.97); }
    to   { opacity:1; transform: translateY(0) scale(1); }
  }
  @keyframes popIn {
    from { opacity:0; transform: scale(0.8); }
    to   { opacity:1; transform: scale(1); }
  }

  .dice-shake  { animation: diceShake 0.5s ease-in-out infinite; }
  .dice-land   { animation: diceLand 0.45s ease-out forwards; }
  .token-bounce{ animation: tokenBounce 0.55s ease-out forwards; }
  .cell-pulse  { animation: cellPulse 0.35s ease-out; }
  .timer-low   { animation: timerPulse 0.6s ease-in-out infinite; color: #dc2626 !important; }
  .slide-in    { animation: slideIn 0.2s ease-out; }
  .pop-in      { animation: popIn 0.2s ease-out; }

  .die {
    width: 44px; height: 44px;
    background: #fff; border: 2px solid #444; border-radius: 8px;
    position: relative; box-shadow: 2px 2px 6px rgba(0,0,0,0.3);
    flex-shrink: 0;
  }
  .dot {
    width: 8px; height: 8px; background: #1a1a1a;
    border-radius: 50%; position: absolute;
  }
  .face-1 .dot:nth-child(1) { top:50%; left:50%; transform:translate(-50%,-50%); }
  .face-2 .dot:nth-child(1) { top:8px; left:8px; }
  .face-2 .dot:nth-child(2) { bottom:8px; right:8px; }
  .face-3 .dot:nth-child(1) { top:8px; left:8px; }
  .face-3 .dot:nth-child(2) { top:50%; left:50%; transform:translate(-50%,-50%); }
  .face-3 .dot:nth-child(3) { bottom:8px; right:8px; }
  .face-4 .dot:nth-child(1) { top:8px; left:8px; }
  .face-4 .dot:nth-child(2) { top:8px; right:8px; }
  .face-4 .dot:nth-child(3) { bottom:8px; left:8px; }
  .face-4 .dot:nth-child(4) { bottom:8px; right:8px; }
  .face-5 .dot:nth-child(1) { top:8px; left:8px; }
  .face-5 .dot:nth-child(2) { top:8px; right:8px; }
  .face-5 .dot:nth-child(3) { top:50%; left:50%; transform:translate(-50%,-50%); }
  .face-5 .dot:nth-child(4) { bottom:8px; left:8px; }
  .face-5 .dot:nth-child(5) { bottom:8px; right:8px; }
  .face-6 .dot:nth-child(1) { top:8px; left:8px; }
  .face-6 .dot:nth-child(2) { top:8px; right:8px; }
  .face-6 .dot:nth-child(3) { top:50%; left:8px; transform:translateY(-50%); }
  .face-6 .dot:nth-child(4) { top:50%; right:8px; transform:translateY(-50%); }
  .face-6 .dot:nth-child(5) { bottom:8px; left:8px; }
  .face-6 .dot:nth-child(6) { bottom:8px; right:8px; }

  /* Board‑level popup */
  .board-popup {
    position: absolute; z-index: 50;
    background: #fefce8; border: 3px solid #a16207;
    border-radius: 12px; padding: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    min-width: 220px; max-width: 290px;
    animation: popIn 0.18s ease-out;
    pointer-events: all;
  }

  /* Responsive layout */
  .game-root {
    min-height: 100vh;
    background:
      radial-gradient(circle at 15% 20%, rgba(34,197,94,0.16), transparent 44%),
      radial-gradient(circle at 85% 0%, rgba(251,191,36,0.14), transparent 38%),
      linear-gradient(180deg, #14532d 0%, #0f3f24 60%, #0b2f1b 100%);
    font-family: Georgia, serif;
    display: flex; flex-direction: column;
    padding: 10px; gap: 10px; box-sizing: border-box;
  }
  .game-layout {
    display: flex; gap: 10px; align-items: stretch; flex: 1; min-height: 0;
  }
  .board-wrap {
    flex: 0 0 50%;
    flex-shrink: 0; position: relative;
    overflow: visible;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 16px 32px rgba(0,0,0,0.22);
    backdrop-filter: blur(2px);
  }
  .right-panel {
    flex: 0 0 50%;
    display: flex;
    gap: 10px;
    min-width: 0;
    min-height: 0;
  }
  .strategy-panel {
    flex: 0 0 40%;
    display: flex; flex-direction: column;
    gap: 8px; min-width: 0;
    overflow-y: auto; max-height: 90vh;
    background: rgba(15, 23, 42, 0.22);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 12px;
    padding: 8px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .details-panel {
    flex: 0 0 60%;
    display: flex; flex-direction: column;
    gap: 8px; min-width: 0;
    overflow-y: auto; max-height: 90vh;
    background: rgba(15, 23, 42, 0.22);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 12px;
    padding: 8px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }
  @media (max-width: 860px) {
    .game-layout { flex-direction: column; }
    .board-wrap { width: 100%; overflow-x: auto; }
    .right-panel { width: 100%; max-height: none; flex-direction: column; }
    .strategy-panel, .details-panel { width: 100%; max-height: none; }
  }

  /* Settings pill buttons */
  .pill {
    cursor: pointer; padding: 6px 14px; border-radius: 20px;
    font-size: 13px; font-weight: 600;
    border: 1px solid rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.85); color: #1f2937;
    transition: all 0.15s; white-space: nowrap;
    box-shadow: 0 2px 10px rgba(0,0,0,0.14);
  }
  .pill.active {
    background: linear-gradient(180deg, #16a34a, #14532d);
    color: #fff;
    border-color: #166534;
  }
  .pill:hover:not(.active) { border-color: #16a34a; color: #14532d; transform: translateY(-1px); }

  /* Scrollbars */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #1e293b; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }

  /* Frozen player badge */
  .frozen-badge {
    font-size: 9px; background: #bae6fd; color: #075985;
    padding: 1px 5px; border-radius: 8px; font-weight: bold;
  }
  /* Immunity badge */
  .immune-badge {
    font-size: 9px; background: #d1fae5; color: #065f46;
    padding: 1px 5px; border-radius: 8px; font-weight: bold;
  }

  /* Cell hover glow */
  .board-cell-hover:hover {
    filter: brightness(0.92);
    outline: 2px solid rgba(251,191,36,0.85);
    outline-offset: -2px;
    z-index: 2;
  }

  /* Property card modal */
  .prop-card-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 300; padding: 16px;
    animation: fadeIn 0.15s ease-out;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }

  .prop-card {
    width: 280px;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 0 0 3px #1a1a1a;
    animation: popIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
    font-family: 'Arial Narrow', Arial, sans-serif;
    position: relative;
  }

  .prop-card-header {
    text-align: center;
    padding: 10px 12px 8px;
    border-bottom: 2px solid #1a1a1a;
  }

  .prop-card-title {
    font-size: 17px; font-weight: 900;
    text-transform: uppercase; letter-spacing: 0.5px;
    line-height: 1.1; color: #1a1a1a;
    margin: 6px 0 2px;
  }

  .prop-card-subtitle {
    font-size: 11px; color: #444;
    text-transform: uppercase; letter-spacing: 1px;
  }

  .prop-card-body {
    padding: 0 14px 12px;
  }

  .prop-rent-row {
    display: flex; justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12.5px;
  }
  .prop-rent-row:last-child { border-bottom: none; }
  .prop-rent-row .label { color: #374151; }
  .prop-rent-row .amount { font-weight: 700; color: #1a1a1a; }
  .prop-rent-row.highlight { background: #fef9c3; margin: 0 -14px; padding: 4px 14px; }

  .prop-card-footer {
    background: #f3f4f6;
    border-top: 2px solid #1a1a1a;
    padding: 8px 14px;
    display: flex; justify-content: space-between;
    font-size: 11.5px; color: #374151;
  }

  .prop-build-section {
    padding: 10px 14px 0;
    border-top: 2px solid #1a1a1a;
    margin-top: 4px;
  }

  /* Analytics dashboard */
  .analytics-panel {
    background: #ecfeff;
    border: 2px solid #0e7490;
    border-radius: 10px;
    padding: 10px;
  }
  .analytics-title {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: #155e75;
    margin-bottom: 8px;
  }
  .analytics-card {
    background: #ffffff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 8px;
  }
  .meter-track {
    height: 8px;
    border-radius: 999px;
    background: #e5e7eb;
    overflow: hidden;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Board spaces
// ─────────────────────────────────────────────────────────────────────────────
export const SPACES = [
    { id: 0, name: "GO", type: "go", color: null, price: null },
    { id: 1, name: "Mediterranean Ave", type: "property", color: "#8B4513", price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50 },
    { id: 2, name: "Community Chest", type: "community", color: null, price: null },
    { id: 3, name: "Baltic Ave", type: "property", color: "#8B4513", price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50 },
    { id: 4, name: "Income Tax", type: "tax", color: null, price: null, amount: 200 },
    { id: 5, name: "Reading Railroad", type: "railroad", color: null, price: 200, rent: [25, 50, 100, 200] },
    { id: 6, name: "Oriental Ave", type: "property", color: "#87CEEB", price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
    { id: 7, name: "Chance", type: "chance", color: null, price: null },
    { id: 8, name: "Vermont Ave", type: "property", color: "#87CEEB", price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
    { id: 9, name: "Connecticut Ave", type: "property", color: "#87CEEB", price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50 },
    { id: 10, name: "Jail / Just Visiting", type: "jail", color: null, price: null },
    { id: 11, name: "St. Charles Place", type: "property", color: "#FF69B4", price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
    { id: 12, name: "Electric Company", type: "utility", color: null, price: 150, rent: [] },
    { id: 13, name: "States Ave", type: "property", color: "#FF69B4", price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
    { id: 14, name: "Virginia Ave", type: "property", color: "#FF69B4", price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100 },
    { id: 15, name: "Pennsylvania RR", type: "railroad", color: null, price: 200, rent: [25, 50, 100, 200] },
    { id: 16, name: "St. James Place", type: "property", color: "#FFA500", price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
    { id: 17, name: "Community Chest", type: "community", color: null, price: null },
    { id: 18, name: "Tennessee Ave", type: "property", color: "#FFA500", price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
    { id: 19, name: "New York Ave", type: "property", color: "#FFA500", price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100 },
    { id: 20, name: "Free Parking", type: "freeparking", color: null, price: null },
    { id: 21, name: "Kentucky Ave", type: "property", color: "#FF0000", price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
    { id: 22, name: "Chance", type: "chance", color: null, price: null },
    { id: 23, name: "Indiana Ave", type: "property", color: "#FF0000", price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
    { id: 24, name: "Illinois Ave", type: "property", color: "#FF0000", price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150 },
    { id: 25, name: "B&O Railroad", type: "railroad", color: null, price: 200, rent: [25, 50, 100, 200] },
    { id: 26, name: "Atlantic Ave", type: "property", color: "#DAA520", price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
    { id: 27, name: "Ventnor Ave", type: "property", color: "#DAA520", price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
    { id: 28, name: "Water Works", type: "utility", color: null, price: 150, rent: [] },
    { id: 29, name: "Marvin Gardens", type: "property", color: "#DAA520", price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150 },
    { id: 30, name: "Go To Jail", type: "gotojail", color: null, price: null },
    { id: 31, name: "Pacific Ave", type: "property", color: "#228B22", price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
    { id: 32, name: "North Carolina Ave", type: "property", color: "#228B22", price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
    { id: 33, name: "Community Chest", type: "community", color: null, price: null },
    { id: 34, name: "Pennsylvania Ave", type: "property", color: "#228B22", price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200 },
    { id: 35, name: "Short Line RR", type: "railroad", color: null, price: 200, rent: [25, 50, 100, 200] },
    { id: 36, name: "Chance", type: "chance", color: null, price: null },
    { id: 37, name: "Park Place", type: "property", color: "#00008B", price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200 },
    { id: 38, name: "Luxury Tax", type: "tax", color: null, price: null, amount: 75 },
    { id: 39, name: "Boardwalk", type: "property", color: "#00008B", price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200 },
];

export const COLOR_GROUPS = {};
SPACES.forEach(s => {
    if (s.type === "property" && s.color) {
        if (!COLOR_GROUPS[s.color]) COLOR_GROUPS[s.color] = [];
        COLOR_GROUPS[s.color].push(s.id);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Chance Cards
// ─────────────────────────────────────────────────────────────────────────────
export const CHANCE_CARDS = [
    {
        text: "Advance to GO! Collect $200",
        action: (p) => ({ ...p, position: 0, money: p.money + 200 })
    },
    {
        text: "Bank pays you a dividend of $50",
        action: (p) => ({ ...p, money: p.money + 50 })
    },
    {
        text: "Go back 3 spaces",
        action: (p) => ({ ...p, position: (p.position - 3 + 40) % 40 })
    },
    {
        text: "Go directly to Jail! Do not pass GO.",
        action: (p) => ({ ...p, position: 10, inJail: true, jailTurns: 0 })
    },
    {
        text: "Speeding fine — pay $15",
        action: (p) => ({ ...p, money: p.money - 15 })
    },
    {
        text: "Building loan matures — collect $150",
        action: (p) => ({ ...p, money: p.money + 150 })
    },
    {
        text: "Skip Jail Free — keep this card!",
        action: (p) => ({ ...p, jailFreeCards: (p.jailFreeCards || 0) + 1 })
    },
    // Advanced effects — these set a special flag the game engine checks
    {
        text: "Double Rent! Your next rent collection is doubled.",
        action: (p) => ({ ...p, doubleRentTurns: 2 })
    },
    {
        text: "Rent Immunity! You pay no rent this turn.",
        action: (p) => ({ ...p, rentImmuneTurns: 1 })
    },
    {
        text: "Freeze! An opponent is frozen for one turn. (Host picks target.)",
        action: (p, gs) => {
            // Pick the richest non-bankrupt opponent
            const players = (gs?.players || []).filter(op => op && !op.bankrupt && op.id !== p.id);
            if (!players.length) return p;
            const target = players.reduce((a, b) => a.money > b.money ? a : b);
            return { ...p, specialEffect: { type: "freeze", targetId: target.id } };
        }, needsGs: true
    },
    {
        text: "Steal a Property! Take one property from an opponent.",
        action: (p) => ({ ...p, specialEffect: { type: "steal" } }), special: true
    },
    {
        text: "Property Swap! Swap one of your properties with an opponent's.",
        action: (p) => ({ ...p, specialEffect: { type: "swap" } }), special: true
    },
    {
        text: "Force Transfer! Force an opponent to give you their cheapest property.",
        action: (p, gs) => {
            const players = (gs?.players || []).filter(op => op && !op.bankrupt && op.id !== p.id && op.money > 0);
            if (!players.length) return p;
            const target = players.reduce((a, b) => a.money < b.money ? a : b);
            return { ...p, specialEffect: { type: "forceTransfer", targetId: target.id } };
        }, needsGs: true
    },
];

export const COMMUNITY_CARDS = [
    { text: "Bank error in your favor — collect $200", action: (p) => ({ ...p, money: p.money + 200 }) },
    { text: "Doctor's fees — pay $50", action: (p) => ({ ...p, money: p.money - 50 }) },
    { text: "From sale of stock — collect $50", action: (p) => ({ ...p, money: p.money + 50 }) },
    { text: "Go to Jail! Do not pass GO.", action: (p) => ({ ...p, position: 10, inJail: true, jailTurns: 0 }) },
    { text: "Holiday fund matures — receive $100", action: (p) => ({ ...p, money: p.money + 100 }) },
    { text: "Income tax refund — collect $20", action: (p) => ({ ...p, money: p.money + 20 }) },
    { text: "Life insurance matures — collect $100", action: (p) => ({ ...p, money: p.money + 100 }) },
    { text: "Pay hospital fees of $100", action: (p) => ({ ...p, money: p.money - 100 }) },
    { text: "Pay school fees of $50", action: (p) => ({ ...p, money: p.money - 50 }) },
    { text: "Consultancy fee — receive $25", action: (p) => ({ ...p, money: p.money + 25 }) },
    { text: "Get Out of Jail Free — keep this card!", action: (p) => ({ ...p, jailFreeCards: (p.jailFreeCards || 0) + 1 }) },
];

export const FREE_PARKING_EVENTS = [
    { title: "🎉 Free Parking Bonus!", text: "Street Fair Revenue — collect an extra $100.", amount: 100 },
    { title: "🛠️ Board Maintenance Fee", text: "City repairs levy — pay $75.", amount: -75 },
    { title: "🍀 Lucky Parking!", text: "You found investor cash — collect an extra $150.", amount: 150 },
    { title: "💨 Quiet Stop", text: "No extra event this time.", amount: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Player constants
// ─────────────────────────────────────────────────────────────────────────────
export const PLAYER_COLORS = ["#E74C3C", "#3498DB", "#27AE60", "#F39C12"];
export const PLAYER_TOKENS = ["🎩", "🚢", "🏎️", "🐶"];

export const CELL_POSITIONS = [];
for (let i = 0; i <= 10; i++)  CELL_POSITIONS.push({ id: i, gridRow: 11, gridColumn: 11 - i });
for (let i = 11; i <= 19; i++) CELL_POSITIONS.push({ id: i, gridRow: 11 - (i - 10), gridColumn: 1 });
for (let i = 20; i <= 30; i++) CELL_POSITIONS.push({ id: i, gridRow: 1, gridColumn: i - 19 });
for (let i = 31; i <= 39; i++) CELL_POSITIONS.push({ id: i, gridRow: i - 29, gridColumn: 11 });

export const DEFAULT_SETTINGS = {
    turnTimer: 0,
    gameMode: "classic",
    timedMinutes: 60,
    targetAmount: 10000,
    aiPlayers: [],
};

export const COLOR_LABELS = {
    "#8B4513": "Brown", "#87CEEB": "Light Blue", "#FF69B4": "Pink", "#FFA500": "Orange",
    "#FF0000": "Red", "#FFFF00": "Yellow", "#00FF00": "Green", "#0000FF": "Dark Blue",
};
