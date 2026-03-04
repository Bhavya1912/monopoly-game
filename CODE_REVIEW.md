# Code Review – Monopoly Game

## Scope reviewed
- Entire repository structure and core source files.
- Static checks (`npm run lint`, `npm run build`).
- Focus areas: architecture, data consistency, multiplayer safety, maintainability, and docs accuracy.

## What looks good
1. **Strong baseline quality checks**: project lint/build scripts run cleanly.
2. **Good defensive helpers**: `safePlayers`, `safeProps`, `safeLog`, etc. reduce crash risk from malformed realtime payloads.
3. **Clear domain modeling**: board constants and AI profiles are readable and reasonably organized.
4. **UI component split is present** for many visual concerns (board cell, modals, timers), even if game logic is centralized.

## Key findings (highest priority first)

### 1) Multiplayer state writes are non-transactional (risk: lost updates)
- `pushState` writes the entire game state via `set(games/{room}/state, safe)`.
- In realtime multiplayer, if two clients write close together, one full-state write can overwrite the other.
- This is especially risky during simultaneous actions (timers, chat-triggered actions, modal resolutions).

**Recommendation**
- Move critical mutations to Firebase `runTransaction` on `games/{room}/state`.
- At minimum, split state into narrower update paths and use version/turn checks before write.

### 2) Room join/create flow has race/collision windows (risk: accidental overwrite / overfill)
- `createGame` generates a code and writes directly without checking whether that code already exists.
- `joinGame` does `get(...)` then `update(...)` as separate operations.
- Two players joining at nearly the same time can pass the same availability check before either update lands.

**Recommendation**
- Use a transaction for lobby slot reservation.
- For creation, retry code generation until transaction confirms room path did not exist.

### 3) `App.jsx` is oversized (maintainability risk)
- `src/App.jsx` is ~2800 lines and mixes rendering, rules engine, AI orchestration, firebase IO, analytics, and timers.
- This increases regression risk and makes testing difficult.

**Recommendation**
- Extract a pure `gameEngine` module (move rules: dice, rent, bankruptcy, turn advance).
- Extract a `useRealtimeRoom` hook for Firebase subscribe/write logic.
- Keep `App.jsx` as composition + UI glue.

### 4) Firebase config is hard-coded in source (deployment/security hygiene risk)
- Firebase project identifiers are committed in `src/services/firebase.js`.
- README also recommends env vars, but implementation still hard-codes values.

**Recommendation**
- Move config to Vite env vars (`import.meta.env.VITE_*`).
- Add `.env.example` and update docs.

### 5) Documentation drift in README
- README says Firebase config lives in `src/App.jsx`, but actual config is in `src/services/firebase.js`.

**Recommendation**
- Update README paths to match current code layout.

## Suggested phased plan

### Phase 1 (safety)
- Add transactional writes for state and lobby joins.
- Add optimistic concurrency guard (turn/version).

### Phase 2 (maintainability)
- Extract game logic to `src/game/engine.js` + small unit tests.
- Extract hooks for room/chats/state synchronization.

### Phase 3 (hygiene)
- Move Firebase config to env variables.
- Fix README path references.

## Validation run
- `npm run lint` ✅
- `npm run build` ✅
