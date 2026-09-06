import {
  SPACES,
  COLOR_GROUPS,
  CHANCE_CARDS,
  COMMUNITY_CARDS,
  FREE_PARKING_EVENTS,
  ROUND_EVENTS,
} from "../constants";

import {
  safePlayers,
  safeProps,
  safeLog,
  safeSettings,
  marketGroupKey,
  randomMarketModifiers,
} from "../utils";

export const ROULETTE_OUTCOMES = [
  { label: "Reward $100", type: "reward", amount: 100 },
  { label: "Swap Property", type: "swap" },
  { label: "Reward $200", type: "reward", amount: 200 },
  { label: "Steal Property", type: "steal" },
  { label: "Reward $150", type: "reward", amount: 150 },
  { label: "Better Luck Next Time", type: "none" },
];

export const PROPERTY_ACTION_TYPES = ["property", "railroad", "utility"];

/**
 * Calculates rent for a given space and property.
 */
export const calcRent = (gs, spaceId, prop, dice) => {
  const space = SPACES[spaceId];
  if (!space) return 0;

  const props = safeProps(gs);
  const p2 = props && typeof props === "object" ? props : {};
  let rent;

  if (space.type === "railroad") {
    rent = getRailroadRent(space, prop, p2);
  } else if (space.type === "utility") {
    rent = getUtilityRent(prop, p2, dice);
  } else {
    rent = getPropertyRent(space, prop, p2);
  }

  const marketKey = marketGroupKey(space);
  const marketMod = marketKey
    ? gs?.marketModifiers?.[marketKey] || 1
    : 1;
  rent = Math.max(1, Math.round(rent * marketMod));

  // Double rent effect on owner
  const players = safePlayers(gs);
  const owner = players[prop.owner];
  if ((owner?.doubleRentTurns || 0) > 0) rent *= 2;

  return rent;
};

/**
 * Runs a round-end event.
 */
export const runRoundEvent = (players, props, freePot, log) => {
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

/**
 * Handles space landing actions.
 * Returns a function that can be used with pushState or a state object.
 */
export const getSpaceActionUpdate = (spaceId, player, gs, isDouble) => {
  const space = SPACES[spaceId];
  if (!space) {
    return { rolled: true, rolling: false };
  }

  const players = safePlayers(gs).map((p) => ({ ...p }));
  const props = safeProps(gs);
  const log = safeLog(gs);
  const curIdx = gs.currentPlayer;
  const freePot = gs.freePot || 0;

  // This is a complex function that needs careful refactoring.
  // We'll move the core logic here but it will depend on the caller to apply it.
  // For multiplayer, this will be used inside runTransaction.

  // Return an object that represents the delta or next state.
  // Note: some actions like "roulette", "buy", "jail" return a modal.

  const result = {
    players,
    properties: props,
    freePot,
    log,
    modal: null,
    rolled: !isDouble,
    rolling: false,
    turnStartTime: isDouble ? gs.turnStartTime : Date.now(),
  };

  if (space.type === "go" || space.type === "jail") {
    // No-op
  } else if (space.type === "roulette") {
    log.unshift(`${player.token} landed on Roulette! 🎡`);
    result.modal = { type: "roulette", options: ROULETTE_OUTCOMES };
  } else if (space.type === "tax") {
    const amt = space.amount || 0;
    log.unshift(`${player.token} pays ${space.name}: $${amt}`);
    players[curIdx] = { ...player, money: player.money - amt };
    if (players[curIdx].money < 0) {
      log.unshift(`${player.token} is BANKRUPT! 💸`);
      players[curIdx] = { ...players[curIdx], bankrupt: true };
      result.freePot += amt;
    } else {
      result.freePot += amt;
    }
  } else if (space.type === "freeparking") {
    handleFreeParking(player, result, log);
  } else if (space.type === "chance") {
    handleChance(player, gs, result, log);
  } else if (space.type === "community") {
    handleCommunity(player, result, log);
  } else if (PROPERTY_ACTION_TYPES.includes(space.type)) {
    handlePropertyLanding(spaceId, space, player, gs, result, log);
  }

  // Common turn end logic (e.g., decrementing effects)
  players.forEach((p, i) => {
    if (p && (p.doubleRentTurns || 0) > 0)
      players[i] = { ...p, doubleRentTurns: p.doubleRentTurns - 1 };
    if (p && (p.rentImmuneTurns || 0) > 0)
      players[i] = { ...players[i], rentImmuneTurns: p.rentImmuneTurns - 1 };
  });

  // Turn ending logic for Go To Jail or being sent to jail by card
  const activeP = players[curIdx];
  if (activeP?.inJail) {
    result.rolled = true;
    result.doubleCount = 0;
  }

  return result;
};

/**
 * Advances the turn to the next player.
 */
export const advanceTurn = (current) => {
  const p = safePlayers(current).map((pl) => (pl ? { ...pl } : pl));
  const active = p.filter((pl) => pl && !pl.bankrupt);
  if (active.length <= 1) return { status: "gameover" };

  const nxtLog = safeLog(current);
  let nxt = (current.currentPlayer + 1) % p.length;

  // Skip bankrupt players and handle frozen turns
  while (p[nxt]?.bankrupt || (p[nxt]?.frozenTurns || 0) > 0) {
    if (p[nxt]?.frozenTurns > 0) {
      nxtLog.unshift(`❄️ ${p[nxt].token} is FROZEN and skips their turn!`);
      p[nxt].frozenTurns -= 1;
    }
    nxt = (nxt + 1) % p.length;
  }

  const s = safeSettings(current);
  const wrapped = nxt <= current.currentPlayer;
  const nxtTurnCount = (current.turnCount || 1) + 1;
  let nxtPlayers = p;
  let nxtFreePot = current.freePot || 0;
  let mkt = current.marketModifiers || randomMarketModifiers();

  if (wrapped && s.dynamicMarket) {
    mkt = randomMarketModifiers();
    nxtLog.unshift("📉 Market shifted this round. Property rents were re-priced!");
  }

  if (wrapped && s.eventRounds && nxtTurnCount % Math.max(2, s.eventInterval || 4) === 0) {
    const outcome = runRoundEvent(nxtPlayers, safeProps(current), nxtFreePot, nxtLog);
    nxtPlayers = outcome.nextPlayers;
    nxtFreePot = outcome.nextFreePot;
  }

  nxtLog.unshift(`▶ Player ${nxt + 1}${nxtPlayers[nxt]?.isAI ? " 🤖" : ""}'s turn`);

  return {
    players: nxtPlayers,
    currentPlayer: nxt,
    rolled: false,
    doubleCount: 0,
    rolling: false,
    freePot: nxtFreePot,
    marketModifiers: mkt,
    turnCount: nxtTurnCount,
    log: nxtLog.slice(0, 25),
    turnStartTime: Date.now(),
    modal: null,
  };
};

// --- Sub-handlers for space actions ---

function handleFreeParking(player, result, log) {
  const pot = result.freePot;
  const event = FREE_PARKING_EVENTS[Math.floor(Math.random() * FREE_PARKING_EVENTS.length)];
  const eventAmount = event?.amount || 0;
  const totalAward = pot + eventAmount;
  log.unshift(`${player.token} collects Free Parking: $${pot}!`);
  if (eventAmount > 0) log.unshift(`${player.token} bonus event: +$${eventAmount}`);
  if (eventAmount < 0) log.unshift(`${player.token} setback event: -$${Math.abs(eventAmount)}`);
  result.players[result.players.findIndex(p => p?.id === player.id)] = { ...player, money: player.money + totalAward };
  result.freePot = 0;
  result.modal = { type: "notify", title: event.title, text: event.text };
}

function handleChance(player, gs, result, log) {
  const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
  log.unshift(`❓ Chance: ${card.text}`);
  const acted = card.needsGs ? card.action(player, gs) : card.action(player);
  const specialEffect = acted.specialEffect;
  const cleanPlayer = { ...acted };
  delete cleanPlayer.specialEffect;

  const pIdx = result.players.findIndex(p => p?.id === player.id);
  result.players[pIdx] = cleanPlayer;

  if (specialEffect?.type === "freeze") {
    const tid = specialEffect.targetId;
    if (result.players[tid])
      result.players[tid] = {
        ...result.players[tid],
        frozenTurns: (result.players[tid].frozenTurns || 0) + 1,
      };
    log.unshift(`❄️ ${player.token} froze ${result.players[tid]?.token || "?"}!`);
  } else if (specialEffect?.type === "steal") {
    const stealable = Object.entries(result.properties).filter(([, p]) => p && p.owner !== pIdx);
    if (stealable.length === 0) {
      result.modal = { type: "notify", title: "Nothing to Steal!", text: "No opponent properties exist yet." };
      return;
    }
    result.modal = { type: "steal" };
    return;
  } else if (specialEffect?.type === "swap") {
    const stealable = Object.entries(result.properties).filter(([, p]) => p && p.owner !== pIdx);
    const mine = Object.entries(result.properties).filter(([, p]) => p && p.owner === pIdx);
    if (stealable.length === 0 || mine.length === 0) {
      result.modal = { type: "notify", title: "Nothing to Swap!", text: "Both players need properties to swap." };
      return;
    }
    result.modal = { type: "swap" };
    return;
  } else if (specialEffect?.type === "forceTransfer") {
    const tid = specialEffect.targetId;
    const cheapest = Object.entries(result.properties).find(([, p]) => p && p.owner === tid);
    if (cheapest) {
      const [cid] = cheapest;
      log.unshift(`💸 ${player.token} took ${SPACES[+cid]?.name} from ${result.players[tid]?.token}!`);
      result.properties = { ...result.properties, [cid]: { ...result.properties[cid], owner: pIdx } };
    }
  }
  result.modal = { type: "card", title: "❓ Chance!", text: card.text };
}

function handleCommunity(player, result, log) {
  const card = COMMUNITY_CARDS[Math.floor(Math.random() * COMMUNITY_CARDS.length)];
  log.unshift(`📋 Community: ${card.text}`);
  result.players[result.players.findIndex(p => p?.id === player.id)] = card.action(player);
  result.modal = { type: "card", title: "📋 Community Chest!", text: card.text };
}

function handlePropertyLanding(spaceId, space, player, gs, result, log) {
  const prop = result.properties[spaceId];
  if (!prop) {
    result.modal = { type: "buy", spaceId, playerIdx: result.players.findIndex(p => p?.id === player.id) };
    return;
  }

  const pIdx = result.players.findIndex(p => p?.id === player.id);
  if (prop.owner === pIdx) {
    log.unshift(`🏠 ${player.token} rests on their own property (${space.name}).`);
    return;
  }

  if ((player.rentImmuneTurns || 0) > 0) {
    log.unshift(`🛡️ ${player.token} is rent-immune this turn!`);
    return;
  }

  const rent = calcRent(gs, spaceId, prop, gs.dice);
  log.unshift(`${player.token} pays $${rent} rent to ${result.players[prop.owner]?.token || "?"}`);
  result.players[pIdx].money -= rent;
  if (result.players[prop.owner]) result.players[prop.owner].money += rent;
}
function getRailroadRent(space, prop, props) {
  const count = Object.entries(props).filter(
    ([k, v]) => v && v.owner === prop.owner && SPACES[+k]?.type === "railroad",
  ).length;
  return space.rent[Math.min(count - 1, 3)];
}

function getUtilityRent(prop, props, dice) {
  const count = Object.entries(props).filter(
    ([k, v]) => v && v.owner === prop.owner && SPACES[+k]?.type === "utility",
  ).length;
  const d = Array.isArray(dice) ? dice : [1, 1];
  return (d[0] + d[1]) * (count === 2 ? 10 : 4);
}

function getPropertyRent(space, prop, props) {
  const group = COLOR_GROUPS[space.color] || [];
  const monopoly = group.every((id) => props[id]?.owner === prop.owner);
  if (prop.hotel) return space.rent[5];
  if ((prop.houses || 0) > 0) return space.rent[prop.houses];
  if (monopoly) return space.rent[0] * 2;
  return space.rent[0];
}
