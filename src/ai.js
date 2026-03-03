import { SPACES, COLOR_GROUPS } from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// AI difficulty profiles
// Each number is a 0–1 weight controlling AI behaviour
// ─────────────────────────────────────────────────────────────────────────────
export const AI_DIFFICULTY = {
    easy: { buyThreshold: 0.45, buildThreshold: 0.30, monopolyBonus: 0.10, riskTolerance: 0.20, cashBuffer: 300 },
    medium: { buyThreshold: 0.60, buildThreshold: 0.55, monopolyBonus: 0.25, riskTolerance: 0.45, cashBuffer: 200 },
    hard: { buyThreshold: 0.75, buildThreshold: 0.75, monopolyBonus: 0.45, riskTolerance: 0.65, cashBuffer: 150 },
    strategic: { buyThreshold: 0.88, buildThreshold: 0.90, monopolyBonus: 0.70, riskTolerance: 0.80, cashBuffer: 100 },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI personality modifiers layered on top of difficulty
// ─────────────────────────────────────────────────────────────────────────────
export const AI_PERSONALITY = {
    aggressive: { buyMod: +0.20, buildMod: +0.25, cashMod: -0.15 },
    conservative: { buyMod: -0.20, buildMod: -0.20, cashMod: +0.25 },
    monopolist: { buyMod: +0.10, buildMod: +0.15, cashMod: 0, monopolyGroupBonus: 0.40 },
    random: { buyMod: 0, buildMod: 0, cashMod: 0, randomFactor: 0.60 },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI decision functions
// ─────────────────────────────────────────────────────────────────────────────

/** Should the AI buy the property it just landed on? */
export function aiShouldBuy(player, space, props, players, gs) {
    if (!space?.price) return false;
    const cfg = player.aiConfig || { difficulty: "medium", personality: "aggressive" };
    const diff = AI_DIFFICULTY[cfg.difficulty] || AI_DIFFICULTY.medium;
    const pers = AI_PERSONALITY[cfg.personality] || AI_PERSONALITY.aggressive;

    if (cfg.personality === "random") return Math.random() > 0.45;

    const cashNeeded = space.price + (diff.cashBuffer + pers.cashMod * 200);
    if (player.money < cashNeeded) return false;

    const group = COLOR_GROUPS[space.color] || [];
    const alreadyOwn = group.filter(id => props[id]?.owner === player.id).length;
    const groupRatio = group.length > 0 ? (alreadyOwn + 1) / group.length : 0;

    let score = diff.buyThreshold + pers.buyMod;

    // Bonus for monopoly potential
    const monoBonus = diff.monopolyBonus + (pers.monopolyGroupBonus || 0);
    score += groupRatio * monoBonus;

    // Railroads & utilities: always fairly attractive
    if (space.type === "railroad" || space.type === "utility") score += 0.15;

    // Blocking: if an opponent is close to a monopoly, buy competitively
    const opponentNearMono = group.some(id =>
        props[id] && props[id].owner !== player.id &&
        group.filter(gid => props[gid]?.owner === props[id]?.owner).length >= group.length - 1
    );
    if (opponentNearMono) score += 0.20 * diff.riskTolerance;

    return Math.random() < score;
}

/** Should the AI build a house/hotel on a property it owns? */
export function aiShouldBuild(player, spaceId, props) {
    const space = SPACES[spaceId];
    if (!space?.houseCost) return false;
    const prop = props[spaceId];
    if (!prop || prop.hotel) return false;

    const cfg = player.aiConfig || { difficulty: "medium", personality: "aggressive" };
    const diff = AI_DIFFICULTY[cfg.difficulty] || AI_DIFFICULTY.medium;
    const pers = AI_PERSONALITY[cfg.personality] || AI_PERSONALITY.aggressive;

    if (cfg.personality === "random") return Math.random() > 0.55;

    if (player.money < space.houseCost + diff.cashBuffer) return false;

    let score = diff.buildThreshold + pers.buildMod;
    // More houses already built → more pressure to keep building
    score += (prop.houses || 0) * 0.08;

    return Math.random() < score;
}

/** Pick which property the AI should sell to raise cash. */
export function aiPickPropertyToSell(player, props) {
    const owned = Object.entries(props)
        .filter(([, p]) => p && p.owner === player.id)
        .map(([id]) => +id);

    // Prefer to sell properties that don't break a monopoly
    const nonMono = owned.filter(id => {
        const group = COLOR_GROUPS[SPACES[id]?.color] || [];
        return !group.every(gid => props[gid]?.owner === player.id);
    });

    const pool = nonMono.length > 0 ? nonMono : owned;
    pool.sort((a, b) => (SPACES[a]?.price || 0) - (SPACES[b]?.price || 0));
    return pool[0] ?? null;
}

/** Decide whether the AI should pay the jail fine, roll for doubles, or use a card. */
export function aiJailStrategy(player) {
    const cfg = player.aiConfig || { difficulty: "medium", personality: "aggressive" };
    const diff = AI_DIFFICULTY[cfg.difficulty] || AI_DIFFICULTY.medium;
    if ((player.jailFreeCards || 0) > 0) return "card";
    if (player.money >= 50 && diff.riskTolerance > 0.5) return "pay";
    return "roll";
}
