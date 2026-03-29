import React from "react";
import { PLAYER_TOKENS } from "../constants";
import SettingsModal from "./SettingsModal";

export default function WaitingView({
  gameState,
  playerCount,
  lobbyPlayers,
  settings,
  roomCode,
  codeCopied,
  setCodeCopied,
  myIdx,
  isHost,
  setShowSettings,
  showSettings,
  setSettings,
  setPlayerCount,
  startGame,
  db,
  update,
  ref,
}) {
  const maxPlayers = gameState?.hostPlayerCount || playerCount;
  const totalJoined = lobbyPlayers.length + (settings.aiPlayers || []).length;
  const canStart = totalJoined >= maxPlayers;

  return (
    <div className="screen-overlay">
      <div className="menu-card text-center">
        <div className="emoji-large">⏳</div>
        <h2 className="section-title text-center">Waiting for Players</h2>
        <p className="menu-subtitle margin-bottom-20">
          {lobbyPlayers.length}/{maxPlayers} joined
        </p>

        <div className="room-code-box">
          <p className="room-code-title">ROOM CODE</p>
          <div
            className="room-code-text"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            {roomCode}
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomCode);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }}
              title="Copy room code"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1rem",
                opacity: 0.8,
                padding: "2px 4px",
                borderRadius: "4px",
                transition: "opacity 0.2s",
              }}
            >
              {codeCopied ? "✅" : "📋"}
            </button>
          </div>
          <p className="room-code-title margin-top-8">
            {codeCopied ? "Copied to clipboard!" : "Share with friends"}
          </p>
        </div>

        {Array.from({ length: maxPlayers }, (_, i) => {
          const p = lobbyPlayers[i];
          const isAI = (settings.aiPlayers || []).includes(i);
          return (
            <div key={i} className={`player-waiting-row ${p ? "joined" : ""}`}>
              <span className="text-xl">
                {isAI ? "🤖" : p ? PLAYER_TOKENS[i] : "⬜"}
              </span>
              <span className={`weight-bold text-md player-${i}-text`}>
                {isAI
                  ? `P${i + 1} AI`
                  : p
                    ? `Player ${i + 1}${i === myIdx ? " (You)" : ""}`
                    : i === 0
                      ? "Connecting..."
                      : "Waiting..."}
              </span>
              {p && <span className="margin-left-auto text-sm text-success">✓</span>}
            </div>
          );
        })}

        {/* Settings summary */}
        <div className="settings-summary-box">
          <strong className="text-success-dark">Settings: </strong>
          {settings.turnTimer ? `${settings.turnTimer}s timer` : "No timer"} •{" "}
          {settings.gameMode === "classic"
            ? "Classic"
            : settings.gameMode === "timed"
              ? `Timed ${settings.timedMinutes}min`
              : `Target $${(settings.targetAmount || 10000).toLocaleString()}`}
          {(settings.aiPlayers || []).length > 0 &&
            ` • ${settings.aiPlayers.length} AI`}
        </div>

        <div className="flex-column gap-6 margin-top-12">
          {isHost && (
            <button
              className="btn btn-secondary btn-full"
              onClick={() => setShowSettings(true)}
            >
              ⚙️ Change Game Settings
            </button>
          )}
          {isHost && (
            <button
              className="btn btn-primary btn-full"
              onClick={() => startGame(maxPlayers)}
              disabled={!canStart}
            >
              ▶ Start Game ({totalJoined} / {maxPlayers})
            </button>
          )}
          {isHost && !canStart && (
            <p className="menu-subtitle margin-top-4 text-xs">
              Waiting for {maxPlayers - totalJoined} more player
              {maxPlayers - totalJoined === 1 ? "" : "s"}...
            </p>
          )}
          {!isHost && <p className="menu-subtitle">Waiting for host to start...</p>}
        </div>
      </div>

      {/* Settings popup */}
      {showSettings && isHost && (
        <SettingsModal
          settings={settings}
          onChange={async (newS) => {
            setSettings(newS);
            if (roomCode) {
              await update(ref(db, `games/${roomCode}/state`), {
                settings: newS,
                hostPlayerCount: playerCount, // keep synced
              });
            }
          }}
          onClose={() => setShowSettings(false)}
          playerCount={playerCount}
          setPlayerCount={setPlayerCount}
          maxPlayers={4}
        />
      )}
    </div>
  );
}
