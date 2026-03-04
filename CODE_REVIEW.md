# Code Review – Monopoly Game

## Scope reviewed
- Repository structure and core source files (`src/App.jsx`, `src/constants.js`, `src/ai.js`, `src/utils.js`, and styling/component files).
- Static checks (`npm run lint`, `npm run build`).
- Focus areas: architecture, multiplayer correctness, maintainability, and gameplay depth.

## What looks good
1. **Strong baseline quality checks**: lint/build scripts run cleanly.
2. **Defensive helpers**: `safePlayers`, `safeProps`, `safeLog`, etc. reduce crash risk from malformed realtime payloads.
3. **Clear board-domain constants**: board spaces, card pools, and settings are centralized and readable.
4. **Good UI decomposition** for board cells, modal overlays, and timers.

## Key engineering findings (highest priority first)

### 1) Multiplayer state writes are still non-transactional (risk: lost updates)
- Full-state writes can overwrite each other if actions race across clients.
- This is most dangerous for turn progression, purchases, and bankruptcy resolution.

**Recommendation**
- Move critical writes to Firebase `runTransaction` on `games/{room}/state`.
- Introduce a `version` integer and reject stale updates.

### 2) Join/create race windows remain (risk: overfill or accidental room collisions)
- Room creation does not prove code uniqueness atomically.
- Join performs read-then-write, which can race for final slots.

**Recommendation**
- Use transactions for both room creation and lobby seat reservation.
- Retry generated room codes when transaction fails.

### 3) `App.jsx` is a monolith (maintainability risk)
- Rules engine + networking + render logic are tightly coupled.
- Hard to unit test and reason about side effects.

**Recommendation**
- Extract pure rules into `src/game/engine.js`.
- Extract realtime sync into `src/hooks/useRealtimeRoom.js`.

### 4) Firebase config management is inconsistent with docs
- Implementation still keeps concrete config in source.
- README guidance and actual file locations have drifted.

**Recommendation**
- Move to `import.meta.env.VITE_*` and add `.env.example`.
- Refresh README setup paths.

## Gameplay improvements to make the game more interesting

### A) Dynamic market mode (high impact, moderate effort)
**Idea**: Property values and rent fluctuate each round by color group trend (e.g., utilities boom, rail slump).

**Why it helps**
- Increases strategic diversity and replayability.
- Reduces repetitive “same optimal buys every game” feeling.

**Implementation sketch**
- Add per-group modifier table in `src/constants.js`.
- Recompute rent using base rent × modifier in `estimatePropertyRent` (`src/utils.js`).
- Surface trend indicators on cards/cells (`BoardCell` + property modal).

### B) Public auctions when a player declines a property (high impact, medium effort)
**Idea**: If active player refuses purchase, launch 15-second multiplayer auction.

**Why it helps**
- Creates player interaction spikes and bluffing.
- Helps trailing players recover through clever bids.

**Implementation sketch**
- Add `auction` object to game state (`spaceId`, `highestBid`, `leaderId`, `deadline`).
- Add bid actions and countdown UI in side panel/modal.
- Resolve auction server-side via transaction when deadline is reached.

### C) Mission cards / secret objectives (high impact, low-medium effort)
**Idea**: Each player gets 1–2 hidden goals (e.g., own 3 railroads, build 2 hotels, hit $2500 cash).

**Why it helps**
- Adds alternate victory pressure and surprise moments.
- Encourages varied play styles beyond rent-maxing.

**Implementation sketch**
- Add mission deck constants and per-player mission assignments.
- Track mission completion in turn loop.
- Reward with cash bonus, one-time immunity, or extra roll token.

### D) Event rounds every N turns (medium impact, low effort)
**Idea**: Global events trigger periodically (tax holiday, construction subsidy, market crash, free jail release).

**Why it helps**
- Adds tempo swings and memorable moments.
- Keeps late game from feeling deterministic.

**Implementation sketch**
- Reuse existing event/card infrastructure; trigger on turn counter modulo.
- Post event banner to log/chat feed.

### E) Smarter AI personalities (medium impact, medium effort)
**Idea**: Expand AI behavior archetypes (speculator, conservative landlord, railroad specialist, revenge bidder).

**Why it helps**
- AI matches feel less predictable.
- Better solo replay value.

**Implementation sketch**
- Extend `AI_PERSONALITY` and scoring heuristics in `src/ai.js`.
- Add table-driven decision weights by phase (early/mid/late game).

## Suggested rollout plan

### Phase 1 (correctness first)
1. Transactional writes + versioning.
2. Transactional lobby join/create.

### Phase 2 (fun features)
1. Public auctions.
2. Event rounds.
3. AI personality expansion.

### Phase 3 (meta replayability)
1. Dynamic market mode.
2. Mission cards + rewards.

## Validation run
- `npm run lint` ✅
- `npm run build` ✅
