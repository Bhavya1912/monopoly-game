import React from "react";
import PropTypes from "prop-types";
import { PLAYER_TOKENS } from "../constants";
import SettingsModal from "./SettingsModal";

// Waiting Room View Component
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
  ref,
  runTransaction,
}) {
  const maxPlayers = gameState?.hostPlayerCount || playerCount;
  const totalJoined = lobbyPlayers.length + (settings.aiPlayers || []).length;
  const canStart = totalJoined >= maxPlayers;

  return (
    <div className="screen-overlay">
      <div className="menu-card">
        {/* Header - Fixed */}
        <div className="menu-card-header text-center">
          <div className="emoji-large">⏳</div>
          <h2 className="menu-title">Waiting Room</h2>
          <p className="menu-subtitle">
            {lobbyPlayers.length}/{maxPlayers} Players Joined
          </p>
        </div>

        {/* Body - Scrollable */}
        <div className="menu-card-body text-center">
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

          <div className="margin-bottom-20">
            {Array.from({ length: maxPlayers }, (_, i) => {
              const p = lobbyPlayers[i];
              const isAI = (settings.aiPlayers || []).includes(i);

              let rowIcon = "⬜";
              if (isAI) rowIcon = "🤖";
              else if (p) rowIcon = PLAYER_TOKENS[i];

              let roleLabel = "Waiting...";
              if (isAI) roleLabel = `P${i + 1} AI`;
              else if (p) {
                roleLabel = `Player ${i + 1}${i === myIdx ? " (You)" : ""}`;
              } else if (i === 0) {
                roleLabel = "Connecting...";
              }

              return (
                <div key={`player-slot-${i}`} className={`player-waiting-row ${p ? "joined" : ""}`}>
                  <span className="text-xl">
                    {rowIcon}
                  </span>
                  <span className={`weight-bold text-md player-${i}-text`}>
                    {roleLabel}
                  </span>
                  {p && <span className="margin-left-auto text-sm text-success">✓</span>}
                </div>
              );
            })}
          </div>

          {/* Settings summary */}
          <div className="settings-summary-box">
            <strong className="text-success-dark">Settings: </strong>
            {settings.turnTimer ? `${settings.turnTimer}s timer` : "No timer"} •{" "}
            {settings.gameMode === "classic" && "Classic"}
            {settings.gameMode === "timed" && `Timed ${settings.timedMinutes}min`}
            {settings.gameMode === "target" && `Target $${(settings.targetAmount || 10000).toLocaleString()}`}
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
                style={canStart ? {} : { opacity: 0.6 }}
              >
                {canStart ? "🚀 Start Game Now" : `Waiting for Players (${totalJoined}/${maxPlayers})`}
              </button>
            )}

            {isHost && !canStart && (
              <button
                className="btn btn-ghost btn-full"
                onClick={() => {
                  const aiP = [...(settings.aiPlayers || [])];
                  for (let i = 0; i < maxPlayers; i++) {
                    if (!lobbyPlayers[i] && !aiP.includes(i)) aiP.push(i);
                  }
                  setSettings({ ...settings, aiPlayers: aiP });
                  const stateRef = ref(db, `games/${roomCode}/state`);
                  runTransaction(stateRef, (current) => {
                    if (!current) return;
                    return { ...current, settings: { ...current.settings, aiPlayers: aiP }, version: (current.version || 0) + 1 };
                  });
                }}
              >
                🤖 Fill remaining with AI
              </button>
            )}

            {isHost && !canStart && (
              <p className="menu-subtitle margin-top-4 text-xs">
                Waiting for {maxPlayers - totalJoined} more player{maxPlayers - totalJoined === 1 ? "" : "s"}...
              </p>
            )}
            {!isHost && <p className="menu-subtitle">Waiting for host to start...</p>}
          </div>
        </div>
      </div>

      {/* Settings popup */}
      {showSettings && isHost && (
        <SettingsModal
          settings={settings}
          onChange={async (newS) => {
            setSettings(newS);
            if (roomCode) {
              const stateRef = ref(db, `games/${roomCode}/state`);
              await runTransaction(stateRef, (current) => {
                if (!current) return;
                return {
                  ...current,
                  settings: newS,
                  hostPlayerCount: playerCount,
                  version: (current.version || 0) + 1,
                };
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

WaitingView.propTypes = {
  gameState: PropTypes.object,
  playerCount: PropTypes.number.isRequired,
  lobbyPlayers: PropTypes.array.isRequired,
  settings: PropTypes.object.isRequired,
  roomCode: PropTypes.string.isRequired,
  codeCopied: PropTypes.bool.isRequired,
  setCodeCopied: PropTypes.func.isRequired,
  myIdx: PropTypes.number,
  isHost: PropTypes.bool.isRequired,
  setShowSettings: PropTypes.func.isRequired,
  showSettings: PropTypes.bool.isRequired,
  setSettings: PropTypes.func.isRequired,
  setPlayerCount: PropTypes.func.isRequired,
  startGame: PropTypes.func.isRequired,
  db: PropTypes.object,
  ref: PropTypes.func,
  runTransaction: PropTypes.func,
};
