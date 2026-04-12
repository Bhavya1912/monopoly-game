# 🎲 Monopoly Game

A fast-paced, digital reimagining of the classic property trading board game. Built for the modern web with real-time multiplayer, AI opponents, and deep strategic insights.

## ✨ Features

- **Real-Time Multiplayer**: Instant sync using Firebase Realtime Database. Join games seamlessly via 6-character room codes.
- **Smart AI Opponents**: Play solo or fill rooms with AI. Features adjustable difficulties and behaviors (aggressive, defensive, balanced).
- **Flexible Game Modes**:
  - *Classic*: Last player standing.
  - *Timed*: Highest net worth at the buzzer.
  - *Target*: First to reach a designated cash threshold.
  - Optional fast-paced settings like turn timers.
- **Advanced Game Mechanics**: Property management with dynamic rent scaling, housing/hotel upgrades, interactive Chance/Community Chest cards, and real-time bankruptcy risks.
- **Strategy Dashboard**: Live game analytics, monopoly chance estimators, and heatmaps of threat zones.
- **Responsive UI**: Plays perfectly on desktop, tablet, and mobile displays.

---

## 🧱 Tech Stack

- **Frontend core**: React 19 + Vite 7
- **Backend / Real-time Sync**: Firebase Realtime Database 12
- **Styling**: Vanilla CSS (Modular, optimized)
- **Linting & Tooling**: ESLint 9

---

## 📁 Project Structure

```text
monopoly-game/
├─ public/                 # Static public files
├─ src/
│  ├─ assets/              # Images, sounds, and icons
│  ├─ components/          # Reusable UI elements (Board, Panels, Modals)
│  ├─ game/                # Core game rules & logic modules
│  ├─ hooks/               # Custom React hooks for local state and intervals
│  ├─ services/            # External integrations (Firebase config)
│  ├─ styles/              # Global variables (index.css) and shared CSS
│  ├─ utils/               # Math, analytics, and helper functions
│  ├─ ai.js                # AI opponent decision engine
│  ├─ App.jsx              # Main application root and synchronization engine
│  ├─ constants.js         # Core board data, cards, and configuration
│  ├─ main.jsx             # React entry point
│  └─ soundManager.js      # Game audio orchestration
├─ index.html
├─ package.json
└─ vite.config.js
```

---

## 🚀 Getting Started

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone <your-repo-url>
cd monopoly-game
npm install
```

### 2. Running Locally

Start the Vite development server:

```bash
npm run dev
```

The game will be available at `http://localhost:5173`.

---

## 📜 Available Scripts

- `npm run dev`: Starts the local development server.
- `npm run build`: Bundles the app for production.
- `npm run preview`: Previews the local production build.
- `npm run lint`: Runs ESLint for code formatting and quality checks.

---

## 🔐 Environment & Services

Authentication and Database sync are handled directly by Firebase. 

Out of the box, the project points to a development Firebase environment. To use your own backend:
1. Create a project at the [Firebase console](https://console.firebase.google.com/).
2. Enable **Realtime Database**.
3. Overwrite the `firebaseConfig` object inside `src/services/firebase.js` with your own credentials. 
*(Note: It is highly recommended to extract these to `.env` variables before deploying to production!)*

---

## 🏗 Architecture Notes

The game engine is primarily coordinated within `App.jsx`, utilizing a highly optimized, single-source-of-truth syncing model:
- **State Synchronization**: Modifying game state natively utilizes standard React state hooks in local games, but switches to robust, lock-safe Firebase transactions (`runTransaction`) when communicating changes in multiplayer rooms.
- **Event-Driven**: Dice rolls, trades, and board animations propagate via deterministic logs and explicit Firebase flags to ensure all clients play out animations concurrently.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

Please ensure you run `npm run lint` and `npm run build` before opening up a pull request.
