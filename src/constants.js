// ─────────────────────────────────────────────────────────────────────────────
// CSS (moved to game.css)
// ─────────────────────────────────────────────────────────────────────────────
export const STYLE = "";


// ─────────────────────────────────────────────────────────────────────────────
// Board spaces
// ─────────────────────────────────────────────────────────────────────────────
export const SPACES = [
  { id: 0, name: "GO", type: "go", color: null, price: null },
  {
    id: 1,
    name: "Mediterranean Ave",
    type: "property",
    color: "#8B4513",
    price: 60,
    rent: [2, 10, 30, 90, 160, 250],
    houseCost: 50,
  },
  {
    id: 2,
    name: "Community Chest",
    type: "community",
    color: null,
    price: null,
  },
  {
    id: 3,
    name: "Baltic Ave",
    type: "property",
    color: "#8B4513",
    price: 60,
    rent: [4, 20, 60, 180, 320, 450],
    houseCost: 50,
  },
  {
    id: 4,
    name: "Income Tax",
    type: "tax",
    color: null,
    price: null,
    amount: 200,
  },
  {
    id: 5,
    name: "Reading Railroad",
    type: "railroad",
    color: null,
    price: 200,
    rent: [25, 50, 100, 200],
  },
  {
    id: 6,
    name: "Oriental Ave",
    type: "property",
    color: "#87CEEB",
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
  },
  { id: 7, name: "Chance", type: "chance", color: null, price: null },
  {
    id: 8,
    name: "Vermont Ave",
    type: "property",
    color: "#87CEEB",
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
  },
  {
    id: 9,
    name: "Connecticut Ave",
    type: "property",
    color: "#87CEEB",
    price: 120,
    rent: [8, 40, 100, 300, 450, 600],
    houseCost: 50,
  },
  {
    id: 10,
    name: "Jail / Just Visiting",
    type: "jail",
    color: null,
    price: null,
  },
  {
    id: 11,
    name: "St. Charles Place",
    type: "property",
    color: "#FF69B4",
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
  },
  {
    id: 12,
    name: "Electric Company",
    type: "utility",
    color: null,
    price: 150,
    rent: [],
  },
  {
    id: 13,
    name: "States Ave",
    type: "property",
    color: "#FF69B4",
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
  },
  {
    id: 14,
    name: "Virginia Ave",
    type: "property",
    color: "#FF69B4",
    price: 160,
    rent: [12, 60, 180, 500, 700, 900],
    houseCost: 100,
  },
  {
    id: 15,
    name: "Pennsylvania RR",
    type: "railroad",
    color: null,
    price: 200,
    rent: [25, 50, 100, 200],
  },
  {
    id: 16,
    name: "St. James Place",
    type: "property",
    color: "#FFA500",
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
  },
  {
    id: 17,
    name: "Community Chest",
    type: "community",
    color: null,
    price: null,
  },
  {
    id: 18,
    name: "Tennessee Ave",
    type: "property",
    color: "#FFA500",
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
  },
  {
    id: 19,
    name: "New York Ave",
    type: "property",
    color: "#FFA500",
    price: 200,
    rent: [16, 80, 220, 600, 800, 1000],
    houseCost: 100,
  },
  {
    id: 20,
    name: "Free Parking",
    type: "freeparking",
    color: null,
    price: null,
  },
  {
    id: 21,
    name: "Kentucky Ave",
    type: "property",
    color: "#FF0000",
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
  },
  { id: 22, name: "Chance", type: "chance", color: null, price: null },
  {
    id: 23,
    name: "Indiana Ave",
    type: "property",
    color: "#FF0000",
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
  },
  {
    id: 24,
    name: "Illinois Ave",
    type: "property",
    color: "#FF0000",
    price: 240,
    rent: [20, 100, 300, 750, 925, 1100],
    houseCost: 150,
  },
  {
    id: 25,
    name: "B&O Railroad",
    type: "railroad",
    color: null,
    price: 200,
    rent: [25, 50, 100, 200],
  },
  {
    id: 26,
    name: "Atlantic Ave",
    type: "property",
    color: "#DAA520",
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
  },
  {
    id: 27,
    name: "Ventnor Ave",
    type: "property",
    color: "#DAA520",
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
  },
  {
    id: 28,
    name: "Water Works",
    type: "utility",
    color: null,
    price: 150,
    rent: [],
  },
  {
    id: 29,
    name: "Marvin Gardens",
    type: "property",
    color: "#DAA520",
    price: 280,
    rent: [24, 120, 360, 850, 1025, 1200],
    houseCost: 150,
  },
  { id: 30, name: "Go To Jail", type: "gotojail", color: null, price: null },
  {
    id: 31,
    name: "Pacific Ave",
    type: "property",
    color: "#228B22",
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
  },
  {
    id: 32,
    name: "North Carolina Ave",
    type: "property",
    color: "#228B22",
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
  },
  {
    id: 33,
    name: "Community Chest",
    type: "community",
    color: null,
    price: null,
  },
  {
    id: 34,
    name: "Pennsylvania Ave",
    type: "property",
    color: "#228B22",
    price: 320,
    rent: [28, 150, 450, 1000, 1200, 1400],
    houseCost: 200,
  },
  {
    id: 35,
    name: "Short Line RR",
    type: "railroad",
    color: null,
    price: 200,
    rent: [25, 50, 100, 200],
  },
  { id: 36, name: "Chance", type: "chance", color: null, price: null },
  {
    id: 37,
    name: "Park Place",
    type: "property",
    color: "#00008B",
    price: 350,
    rent: [35, 175, 500, 1100, 1300, 1500],
    houseCost: 200,
  },
  {
    id: 38,
    name: "Luxury Tax",
    type: "tax",
    color: null,
    price: null,
    amount: 75,
  },
  {
    id: 39,
    name: "Boardwalk",
    type: "property",
    color: "#00008B",
    price: 400,
    rent: [50, 200, 600, 1400, 1700, 2000],
    houseCost: 200,
  },
];

export const COLOR_GROUPS = {};
SPACES.forEach((s) => {
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
    action: (p) => ({ ...p, position: 0, money: p.money + 200 }),
  },
  {
    text: "Bank pays you a dividend of $50",
    action: (p) => ({ ...p, money: p.money + 50 }),
  },
  {
    text: "Go back 3 spaces",
    action: (p) => ({ ...p, position: (p.position - 3 + 40) % 40 }),
  },
  {
    text: "Go directly to Jail! Do not pass GO.",
    action: (p) => ({ ...p, position: 10, inJail: true, jailTurns: 0 }),
  },
  {
    text: "Speeding fine — pay $15",
    action: (p) => ({ ...p, money: p.money - 15 }),
  },
  {
    text: "Building loan matures — collect $150",
    action: (p) => ({ ...p, money: p.money + 150 }),
  },
  {
    text: "Skip Jail Free — keep this card!",
    action: (p) => ({ ...p, jailFreeCards: (p.jailFreeCards || 0) + 1 }),
  },
  // Advanced effects — these set a special flag the game engine checks
  {
    text: "Double Rent! Your next rent collection is doubled.",
    action: (p) => ({ ...p, doubleRentTurns: 2 }),
  },
  {
    text: "Rent Immunity! You pay no rent this turn.",
    action: (p) => ({ ...p, rentImmuneTurns: 1 }),
  },
  {
    text: "Freeze! An opponent is frozen for one turn. (Host picks target.)",
    action: (p, gs) => {
      // Pick the richest non-bankrupt opponent
      const players = (gs?.players || []).filter(
        (op) => op && !op.bankrupt && op.id !== p.id,
      );
      if (!players.length) return p;
      const target = players.reduce((a, b) => (a.money > b.money ? a : b));
      return { ...p, specialEffect: { type: "freeze", targetId: target.id } };
    },
    needsGs: true,
  },
  {
    text: "Steal a Property! Take one property from an opponent.",
    action: (p) => ({ ...p, specialEffect: { type: "steal" } }),
    special: true,
  },
  {
    text: "Property Swap! Swap one of your properties with an opponent's.",
    action: (p) => ({ ...p, specialEffect: { type: "swap" } }),
    special: true,
  },
  {
    text: "Force Transfer! Force an opponent to give you their cheapest property.",
    action: (p, gs) => {
      const players = (gs?.players || []).filter(
        (op) => op && !op.bankrupt && op.id !== p.id && op.money > 0,
      );
      if (!players.length) return p;
      const target = players.reduce((a, b) => (a.money < b.money ? a : b));
      return {
        ...p,
        specialEffect: { type: "forceTransfer", targetId: target.id },
      };
    },
    needsGs: true,
  },
];

export const COMMUNITY_CARDS = [
  {
    text: "Bank error in your favor — collect $200",
    action: (p) => ({ ...p, money: p.money + 200 }),
  },
  {
    text: "Doctor's fees — pay $50",
    action: (p) => ({ ...p, money: p.money - 50 }),
  },
  {
    text: "From sale of stock — collect $50",
    action: (p) => ({ ...p, money: p.money + 50 }),
  },
  {
    text: "Go to Jail! Do not pass GO.",
    action: (p) => ({ ...p, position: 10, inJail: true, jailTurns: 0 }),
  },
  {
    text: "Holiday fund matures — receive $100",
    action: (p) => ({ ...p, money: p.money + 100 }),
  },
  {
    text: "Income tax refund — collect $20",
    action: (p) => ({ ...p, money: p.money + 20 }),
  },
  {
    text: "Life insurance matures — collect $100",
    action: (p) => ({ ...p, money: p.money + 100 }),
  },
  {
    text: "Pay hospital fees of $100",
    action: (p) => ({ ...p, money: p.money - 100 }),
  },
  {
    text: "Pay school fees of $50",
    action: (p) => ({ ...p, money: p.money - 50 }),
  },
  {
    text: "Consultancy fee — receive $25",
    action: (p) => ({ ...p, money: p.money + 25 }),
  },
  {
    text: "Get Out of Jail Free — keep this card!",
    action: (p) => ({ ...p, jailFreeCards: (p.jailFreeCards || 0) + 1 }),
  },
];

export const FREE_PARKING_EVENTS = [
  {
    title: "🎉 Free Parking Bonus!",
    text: "Street Fair Revenue — collect an extra $100.",
    amount: 100,
  },
  {
    title: "🛠️ Board Maintenance Fee",
    text: "City repairs levy — pay $75.",
    amount: -75,
  },
  {
    title: "🍀 Lucky Parking!",
    text: "You found investor cash — collect an extra $150.",
    amount: 150,
  },
  { title: "💨 Quiet Stop", text: "No extra event this time.", amount: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Player constants
// ─────────────────────────────────────────────────────────────────────────────
export const PLAYER_COLORS = ["#E74C3C", "#3498DB", "#27AE60", "#F39C12"];
export const PLAYER_TOKENS = ["🎩", "🚢", "🏎️", "🐶"];

export const CELL_POSITIONS = [];
for (let i = 0; i <= 10; i++)
  CELL_POSITIONS.push({ id: i, gridRow: 11, gridColumn: 11 - i });
for (let i = 11; i <= 19; i++)
  CELL_POSITIONS.push({ id: i, gridRow: 11 - (i - 10), gridColumn: 1 });
for (let i = 20; i <= 30; i++)
  CELL_POSITIONS.push({ id: i, gridRow: 1, gridColumn: i - 19 });
for (let i = 31; i <= 39; i++)
  CELL_POSITIONS.push({ id: i, gridRow: i - 29, gridColumn: 11 });

export const DEFAULT_SETTINGS = {
  turnTimer: 0,
  gameMode: "classic",
  timedMinutes: 60,
  targetAmount: 10000,
  aiPlayers: [],
};

export const COLOR_LABELS = {
  "#8B4513": "Brown",
  "#87CEEB": "Light Blue",
  "#FF69B4": "Pink",
  "#FFA500": "Orange",
  "#FF0000": "Red",
  "#FFFF00": "Yellow",
  "#00FF00": "Green",
  "#0000FF": "Dark Blue",
};
