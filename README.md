# 🎲 Monopoly Game (React + Firebase)

A fast-paced, browser-based Monopoly-inspired game with real-time multiplayer rooms, configurable game modes, AI opponents, and a strategy dashboard.

> Built with **React + Vite** and synchronized via **Firebase Realtime Database**.

---

## ✨ Highlights

- 🌐 **Real-time multiplayer rooms** with shareable room codes.
- 🤖 **Play vs AI** with adjustable difficulty and personality.
- ⚙️ **Flexible game settings**:
  - turn timer (or no timer)
  - classic / timed / target-money modes
  - configurable AI slots
- 🧠 **Strategy panel** with live indicators (threat zones, monopoly chance, rent pressure).
- 🎴 **Chance / Community Chest / Free Parking events** with special effects.
- 🏠 **Property management** with monopoly detection, house/hotel upgrades, and rent scaling.
- 📱 **Responsive UI** optimized for desktop and smaller screens.

---

## 🧱 Tech Stack

- **Frontend:** React 19, Vite 7
- **State sync / backend service:** Firebase Realtime Database
- **Linting:** ESLint

---

## 🚀 Quick Start

### 1) Clone and install

```bash
git clone <your-repo-url>
cd monopoly-game
npm install
```

### 2) Run locally

```bash
npm run dev
```

Open the local URL shown by Vite (typically `http://localhost:5173`).

### 3) Build for production

```bash
npm run build
npm run preview
```

---

## 🔥 Firebase Configuration

This project is currently configured with Firebase directly in `src/App.jsx`.

If you want to use your own Firebase project:

1. Create a Firebase project.
2. Enable **Realtime Database**.
3. Replace the `firebaseConfig` object in `src/App.jsx` with your project credentials.
4. Ensure database rules allow your intended usage pattern (development vs production security).

> ✅ Recommendation: move Firebase config to environment variables before deploying publicly.

---

## 🎮 How to Play

### Multiplayer

1. One player creates a room and shares the 6-character code.
2. Other players join using that room code.
3. Host starts the game once enough players have joined.

### VS AI

1. Select **vs AI** mode in the lobby.
2. Choose number of AI opponents.
3. Set AI difficulty/personality and start.

### Core gameplay loop

- Roll dice and move around the board.
- Buy unowned properties you land on.
- Pay rent when landing on opponent-owned assets.
- Build houses/hotels on monopoly sets.
- Survive bankruptcies and outlast opponents (or hit game objective by mode).

---

## 🕹️ Game Modes

- **Classic:** play until one player remains.
- **Timed:** highest-performing player at timer end wins.
- **Target:** first player to reach target cash wins.

Optional **turn timer** can enforce faster turns.

---

## 📜 Available Scripts

- `npm run dev` — start local dev server.
- `npm run build` — create production build.
- `npm run preview` — preview production build locally.
- `npm run lint` — run ESLint checks.

---

## 📁 Project Structure

```text
monopoly-game/
├─ public/
├─ src/
│  ├─ App.jsx        # main game logic + UI + Firebase syncing
│  ├─ App.css
│  ├─ index.css
│  └─ main.jsx
├─ index.html
├─ package.json
└─ vite.config.js
```

---

## 🧪 Quality Checks

Before pushing changes:

```bash
npm run lint
npm run build
```

---

## 🤝 Contributing

Contributions are welcome.

Suggested workflow:

1. Fork the repo.
2. Create a feature branch.
3. Make changes + run lint/build.
4. Open a pull request with a clear summary and screenshots for UI changes.

---

## 📌 Notes

- This game is inspired by Monopoly mechanics for educational/entertainment purposes.
- If you deploy publicly, review Firebase security rules and move secrets/config to env-based setup.

---

## 📄 License

Add your preferred license (e.g., MIT) in a `LICENSE` file.
