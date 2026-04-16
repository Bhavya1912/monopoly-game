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
  ...gs?.settings,
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
  if (space.type === "utility") {
    const count = Object.entries(props).filter(
      ([k, v]) =>
        v && v.owner === prop.owner && SPACES[+k]?.type === "utility",
    ).length;
    return count === 2 ? 70 : 28;
  }
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

export function randomMarketModifiers() {
  const modifiers = { railroad: 1, utility: 1 };
  Object.keys(COLOR_GROUPS).forEach((color) => {
    const safeColor = color.replace("#", "");
    modifiers[safeColor] = +(0.8 + Math.random() * 0.5).toFixed(2);
  });
  modifiers.railroad = +(0.85 + Math.random() * 0.4).toFixed(2);
  modifiers.utility = +(0.85 + Math.random() * 0.4).toFixed(2);
  return modifiers;
}

export function marketGroupKey(space) {
  if (!space) return null;
  if (space.type === "property") return space.color ? space.color.replace("#", "") : null;
  if (space.type === "railroad") return "railroad";
  if (space.type === "utility") return "utility";
  return null;
}

/** True when a property belongs to a completed color set for its current owner. */
export function isPropertyInCompleteSet(spaceId, props) {
  const prop = props?.[spaceId];
  if (!prop) return false;
  const space = SPACES[spaceId];
  if (space?.type !== "property" || !space?.color) return false;
  const group = COLOR_GROUPS[space.color] || [];
  return group.length > 0 && group.every((id) => props[id]?.owner === prop.owner);
}

/** Properties a player can trade/steal (not in complete sets). */
export function eligibleTransferPropertyIds(props, predicate) {
  return Object.entries(props || {})
    .filter(([id, prop]) => prop && predicate(prop, +id) && !isPropertyInCompleteSet(+id, props))
    .map(([id]) => +id);
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
    version: 0,
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
    turnCount: 1,
    marketModifiers: randomMarketModifiers(),
    settings: { ...DEFAULT_SETTINGS, ...settings, aiPlayers },
    turnStartTime: Date.now(),
    gameStartTime: Date.now(),
  };
}
// ─────────────────────────────────────────────────────────────────────────────
// Game Logic Calculations (Strategy & Risk)
// ─────────────────────────────────────────────────────────────────────────────

/** Probability of a player completing a specific monopoly color group. */
export function calculateMonopolyChance(player, pid, color, ids, props, rawPlayers) {
  const owned = ids.filter((id) => props[id]?.owner === pid).length;
  const blocked = ids.filter((id) => props[id] && props[id].owner !== pid).length;
  const playersAlive = rawPlayers.filter((p) => p && !p.bankrupt).length || 1;
  const ownRatio = owned / ids.length;
  const moneyFactor = clamp((player.money || 0) / 2200, 0, 1);
  if (owned === ids.length) return 100;
  let chance =
    ownRatio * 70 + moneyFactor * 15 + ((4 - playersAlive) / 3) * 6 - blocked * 12;
  if (owned === ids.length - 1) chance += 14;
  if (owned === 0) chance *= 0.45;
  return Math.round(clamp(chance, 2, 98));
}

/** Risk of bankruptcy based on cash and upcoming property rent exposures. */
export function calculateBankruptcyRisk(player, pid, props) {
  const cash = Math.max(player.money || 1, 1);
  const lookAheadRange = Array.from(
    { length: 12 },
    (_, i) => (player.position + i + 1) % 40,
  );
  const maxPossibleRent = lookAheadRange.reduce((max, id) => {
    const prop = props[id];
    if (!prop || prop.owner === pid) return max;
    const rent = estimatePropertyRent(id, prop, props);
    return Math.max(max, rent);
  }, 0);
  const oppStrength =
    Object.entries(props).reduce((sum, [id, prop]) => {
      if (!prop || prop.owner === pid) return sum;
      const upgrades = (prop.houses || 0) + (prop.hotel ? 5 : 0);
      return (
        sum + estimatePropertyRent(+id, prop, props) * (1 + upgrades * 0.15)
      );
    }, 0) / 40;
  const ratio = (maxPossibleRent * 1.5 + oppStrength * 4) / cash;
  return Math.round(clamp(ratio * 100, 2, 98));
}

/** Get insights about completed color sets and their income potential. */
export function getColorSetInsights(props) {
  return Object.entries(COLOR_GROUPS)
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
}

/** Identify the top 3 most dangerous properties based on current rent. */
export function getDangerousZones(props) {
  return Object.entries(props)
    .map(([id, prop]) => ({
      id: +id,
      owner: prop?.owner,
      rent: estimatePropertyRent(+id, prop, props),
    }))
    .filter((z) => z.rent > 0)
    .sort((a, b) => b.rent - a.rent)
    .slice(0, 3);
}
