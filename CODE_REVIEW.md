# Code Review – Monopoly Game

## Scope & Context
- **Date of Review:** Live Document (Last updated April 28, 2026)
- **Review Objectives:** Assess architecture, multiplayer correctness, maintainability, Component UI, and gameplay depth.
- **Repository coverage:** Core source files (`src/App.jsx`, `src/constants.js`, `src/ai.js`, `src/utils.js`), styling, and component files.
- **Static checks evaluated:** `npm run lint`, `npm run build`.

## What looks good
1. **Strong baseline quality checks**: lint/build scripts run cleanly.
2. **Defensive helpers**: `safePlayers`, `safeProps`, `safeLog`, etc. reduce crash risk from malformed realtime payloads.
3. **Transactional State Management**: Core game logic uses Firebase transactions to ensure state consistency.
4. **Deep AI Integration**: Local AI mode features advanced heuristics and a personality-driven advisor system.
5. **Responsive Game Board**: The adaptive scaling system ensures the board remains playable across desktop, tablet, and mobile browsers.
6. **Improved Modularity**: Core logic and networking have been successfully decoupled from the main view component.

## Key engineering findings (highest priority first)

### 1) `App.jsx` Refactoring (Risk: Low/Medium - Improved)
- **Status:** **RESOLVED**. The file has been reduced from ~2370 lines to ~770 lines.
- **Improvements**: 
  - **Networking**: Firebase synchronization and session management moved to `src/hooks/useGameRoom.js`.
  - **Game Rules**: Rent calculation, turn advancement, and space actions moved to `src/game/engine.js`.
  - **AI Routine**: Decoupled AI decision triggers into `src/hooks/useAIController.js`.
  - **Analytics**: Strategy and risk heuristics moved to `src/utils.js`.
- **Remaining**: Further extraction of localized sub-components (e.g., specific game modals) can further simplify the render block.

### 2) Hardcoded Credentials (Risk: Security/Portability)
- **Status:** **High Priority**. Firebase configuration is still hardcoded in `src/services/firebase.js`.
- **Recommendation:**
  - Move all sensitive strings to a `.env` file (e.g., `VITE_FIREBASE_API_KEY`).
  - Add `.env.example` to the repo.

### 3) Missing Automated Test Coverage
- **Status:** **High Priority**. With complex game logic and multiplayer state, manual regression testing is becoming unfeasible.
- **Recommendation:**
  - Install Vitest.
  - Priority targets: `src/utils.js` (rent calculation, market modifiers) and `src/game/engine.js` (state transition correctness).

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

### Phase 1 (Scalability & Security) - **IN PROGRESS**
1. **Structural Split**: Extract `useGameRoom.js` and `engine.js` from `App.jsx`. ✅
2. **AI Controller**: Decouple AI logic into a dedicated hook. ✅
3. **Env Configuration**: Move Firebase keys to `.env`. (Pending)

### Phase 2 (Stability)
1. **Testing Infrastructure**: Setup Vitest and achieve >50% coverage on core logic.

### Phase 3 (Feature Depth)
1. **Public Auctions**: Implement the bid/timer logic and UI.
2. **Mission System**: Add secret cards and completion trackers.

## Validation run
- `npm run lint` ✅ (Passes with 0 errors)
- `npm run build` ✅ (Passes successfully)
