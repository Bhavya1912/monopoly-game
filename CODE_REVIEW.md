# Code Review – Monopoly Game

## Scope & Context
- **Date of Review:** Live Document (Last updated April 18, 2026)
- **Review Objectives:** Assess architecture, multiplayer correctness, maintainability, Component UI, and gameplay depth.
- **Repository coverage:** Core source files (`src/App.jsx`, `src/constants.js`, `src/ai.js`, `src/utils.js`), styling, and component files.
- **Static checks evaluated:** `npm run lint`, `npm run build`.

## What looks good
1. **Strong baseline quality checks**: lint/build scripts run cleanly.
2. **Defensive helpers**: `safePlayers`, `safeProps`, `safeLog`, etc. reduce crash risk from malformed realtime payloads.
3. **Transactional State Management**: Core game logic uses Firebase transactions to ensure state consistency.
4. **Deep AI Integration**: Local AI mode features advanced heuristics and a personality-driven advisor system.
5. **Responsive Game Board**: The adaptive scaling system ensures the board remains playable across desktop, tablet, and mobile browsers.

## Key engineering findings (highest priority first)

### 1) `App.jsx` "God Component" (Risk: Critical Complexity)
- **Status:** **CRITICAL**. The file has grown to ~2370 lines (~84KB).
- It currently manages: 
  - Entire Firebase Realtime database synchronization.
  - Core game rules logic (purchases, rent, bankruptcy, jail).
  - AI turn triggers and Advisor logic.
  - Complex UI state (popups, animations, screen routing).
  - URL routing and deep-linking.
- **Recommendation:**
  - This is no longer "modularization"—it requires a structural split.
  - **Action 1**: Extract the rules engine into a non-React `src/game/engine.js`.
  - **Action 2**: Move Firebase sync and side-effects into a custom `src/hooks/useGameRoom.js`.
  - **Action 3**: Decouple the AI routine into a dedicated `src/game/aiController.js`.

### 2) Hardcoded Credentials (Risk: Security/Portability)
- **Status:** **High Priority**. Firebase configuration is still hardcoded in `src/services/firebase.js`.
- **Recommendation:**
  - Move all sensitive strings to a `.env` file (e.g., `VITE_FIREBASE_API_KEY`).
  - Add `.env.example` to the repo.

### 3) Missing Automated Test Coverage
- **Status:** **High Priority**. With 2300+ lines of game logic, manual regression testing is becoming unfeasible.
- **Recommendation:**
  - Install Vitest.
  - Priority targets: `src/utils.js` (rent calculation, market modifiers) and `src/ai.js` (decision scoring).

## Gameplay Improvements Roadmap

### A) Public auctions when a player declines a property (High Impact, Medium Effort)
- **Status: PENDING.** 
- **Idea**: If active player refuses purchase, launch a timed multiplayer auction.
- **Why it helps**: Creates high-interaction spikes and allows trailing players to bid for critical colors.

### B) Mission cards / secret objectives (High Impact, Low-Medium Effort)
- **Status: PENDING.**
- **Idea**: Hidden goals (e.g., "Own all Railroads") that grant cash bonuses or special perks upon completion.

### C) UI Polish: Smooth Board Navigation
- **Status: MEDIUM PRIORITY.**
- Current board scales adaptively, but certain corner actions (Roulette/Property) can cause UI overlap on smaller mobile screens.
- **Recommendation**: Refine the `BoardPopup` positioning logic to avoid obscuring the active player's token.

## Suggested rollout plan

### Phase 1 (Scalability & Security)
1. **Env Configuration**: Move Firebase keys to `.env`.
2. **Structural Split**: Extract `useGameRoom.js` hook from `App.jsx`.
3. **Core Rules Extraction**: Move `calcRent`, `doSpaceAction`, and `advanceTurn` to `engine.js`.

### Phase 2 (Stability)
1. **Testing Infrastructure**: Setup Vitest and achieve >50% coverage on `utils.js`.

### Phase 3 (Feature Depth)
1. **Public Auctions**: Implement the bid/timer logic and UI.
2. **Mission System**: Add secret cards and completion trackers.

## Validation run
- `npm run lint` ✅
- `npm run build` ✅
