import {
  SPACES,
  COLOR_GROUPS,
  PLAYER_COLORS,
  PLAYER_TOKENS,
  DEFAULT_SETTINGS,
} from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// General-purpose helpers
// ─────────────────────────────────────────────────────────────────────────────

export const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/** Generate a 6-character uppercase room code. */
export const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// Safe game-state accessors (guard against null/malformed Firebase payloads)
// ─────────────────────────────────────────────────────────────────────────────

export const safePlayers = (gs) =>
  Array.isArray(gs?.players) ? gs.players : [];
export const safeProps = (gs) =>
  gs?.properties && typeof gs.properties === "object" ? gs.properties : {};
export const safeLog = (gs) => (Array.isArray(gs?.log) ? gs.log : []);
export const safeDice = (gs) =>
  Array.isArray(gs?.dice) && gs.dice.length === 2 ? gs.dice : [1, 1];
export const safeSettings = (gs) => ({
  ...DEFAULT_SETTINGS,
  ...(gs?.settings || {}),
});

// ─────────────────────────────────────────────────────────────────────────────
// Analytics / valuation helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Total purchase + building cost for properties owned by a player. */
export function estimateAssetValueForPlayer(playerId, props) {
  return Object.entries(props || {}).reduce((sum, [sid, prop]) => {
    if (!prop || prop.owner !== playerId) return sum;
    const space = SPACES[+sid];
    if (!space) return sum;
    const base = space.price || 0;
    const built =
      (space.houseCost || 0) * ((prop.houses || 0) + (prop.hotel ? 5 : 0));
    return sum + base + built;
  }, 0);
}

/** Estimated rent a property would currently charge. */
export function estimatePropertyRent(spaceId, prop, props) {
  const space = SPACES[spaceId];
  if (!space || !prop) return 0;

  if (space.type === "railroad") {
    const count = Object.entries(props).filter(
      ([k, v]) =>
        v && v.owner === prop.owner && SPACES[+k]?.type === "railroad",
    ).length;
    return space.rent?.[Math.max(0, Math.min(count - 1, 3))] || 0;
  }
  if (space.type === "utility") return 28; // average dice roll estimate
  if (space.type === "property") {
    const group = COLOR_GROUPS[space.color] || [];
    const monopoly =
      group.length > 0 && group.every((id) => props[id]?.owner === prop.owner);
    if (prop.hotel) return space.rent?.[5] || 0;
    if ((prop.houses || 0) > 0) return space.rent?.[prop.houses] || 0;
    return monopoly ? (space.rent?.[0] || 0) * 2 : space.rent?.[0] || 0;
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Game state factory
// ─────────────────────────────────────────────────────────────────────────────

/** Build the initial game-state object for a new game. */
export function freshGameState(
  playerCount,
  settings = {},
  aiPlayers = [],
  aiConfigs = {},
) {
  return {
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      money: 1500,
      position: 0,
      color: PLAYER_COLORS[i],
      token: PLAYER_TOKENS[i],
      inJail: false,
      jailTurns: 0,
      bankrupt: false,
      jailFreeCards: 0,
      frozenTurns: 0,
      rentImmuneTurns: 0,
      doubleRentTurns: 0,
      isAI: aiPlayers.includes(i),
      aiConfig: aiConfigs[i] || {
        difficulty: "medium",
        personality: "aggressive",
      },
    })),
    properties: {},
    currentPlayer: 0,
    dice: [1, 1],
    rolling: false,
    rolled: false,
    doubleCount: 0,
    freePot: 0,
    log: ["🎲 Game started! Player 1's turn."],
    modal: null,
    status: "playing",
    hostPlayerCount: playerCount,
    settings: { ...DEFAULT_SETTINGS, ...settings, aiPlayers },
    turnStartTime: Date.now(),
    gameStartTime: Date.now(),
  };
}
