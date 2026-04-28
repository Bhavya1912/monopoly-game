import React from "react";
import PropTypes from "prop-types";
import GameTimer from "./GameTimer";

export default function GameHeader({
  roomCode,
  codeCopied,
  setCodeCopied,
  gs_s,
  gameState,
  rawPlayers,
  myIdx,
  resetToLobby,
  layoutFocus,
  setLayoutFocus,
}) {
  return (
    <div className="game-header">
      <div className="flex-gap-8 align-center flex-wrap">
        <span className="game-title-badge">🎲 MONOPOLY</span>
        <span
          className="room-badge"
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
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
              fontSize: "0.75rem",
              padding: "0 2px",
              opacity: 0.75,
              lineHeight: 1,
            }}
          >
            {codeCopied ? "✅" : "📋"}
          </button>
        </span>
        <span className="mode-badge">
          {gs_s.gameMode === "classic" && "⚔️ Classic"}
          {gs_s.gameMode === "timed" && `⏱ ${gs_s.timedMinutes}min`}
          {gs_s.gameMode === "target" && `🎯 $${(gs_s.targetAmount || 10000).toLocaleString()}`}
        </span>
        <button
          onClick={() =>
            setLayoutFocus((prev) => (prev === "board" ? "panel" : "board"))
          }
          className="pill text-xs"
          title="Toggle board and side-panel emphasis"
        >
          {layoutFocus === "board" ? "🧩 Board Focus" : "📋 Panel Focus"}
        </button>
      </div>

      {/* Player chips */}
      <div className="flex-gap-8 align-center flex-wrap">
        {rawPlayers.map((p, i) => {
          if (!p) return null;
          
          let statusClass = "";
          if (gameState.currentPlayer === i) {
            statusClass = "active-turn";
          } else if (i === myIdx) {
            statusClass = "current-player";
          }

          return (
            <div
              key={p.token || i}
              className={`player-chip ${statusClass} ${p.bankrupt ? "bankrupt" : ""}`}
            >
              <span className="text-md">{p.token}</span>
              <div className="flex-column">
                <div className={`text-xs weight-bold player-${i}-text`}>
                  P{i + 1}
                  {p.isAI ? " 🤖" : ""}
                  {i === myIdx ? " ★" : ""}
                </div>
                <div className="text-xs weight-bold text-black">
                  ${p.money.toLocaleString()}
                </div>
              </div>
              {p.inJail && <span className="jail-icon">🔒</span>}
              {(p.frozenTurns || 0) > 0 && (
                <span className="frozen-badge">❄️{p.frozenTurns}</span>
              )}
              {(p.rentImmuneTurns || 0) > 0 && <span className="immune-badge">🛡️</span>}
              {(p.jailFreeCards || 0) > 0 && (
                <span className="card-icon">🃏×{p.jailFreeCards}</span>
              )}
              {p.bankrupt && <span className="bankrupt-icon">💸</span>}
            </div>
          );
        })}
        {gs_s.gameMode === "timed" && gameState.gameStartTime && (
          <GameTimer
            gameStartTime={gameState.gameStartTime}
            limitMinutes={gs_s.timedMinutes || 60}
            onExpire={() => {
              // This logic should probably be passed as a prop if we want to be pure
              // but for now we'll handle it via an onExpire prop from App.jsx
            }}
          />
        )}
      </div>
      <button 
        className="btn btn-danger text-xs" 
        onClick={() => {
          if (globalThis.confirm("Are you sure you want to leave the game? All your progress will be lost.")) {
            resetToLobby();
          }
        }}
      >
        Leave
      </button>
    </div>
  );
}

GameHeader.propTypes = {
  roomCode: PropTypes.string,
  codeCopied: PropTypes.bool,
  setCodeCopied: PropTypes.func.isRequired,
  gs_s: PropTypes.shape({
    gameMode: PropTypes.string,
    timedMinutes: PropTypes.number,
    targetAmount: PropTypes.number,
  }).isRequired,
  gameState: PropTypes.shape({
    currentPlayer: PropTypes.number,
    gameStartTime: PropTypes.number,
  }).isRequired,
  rawPlayers: PropTypes.array.isRequired,
  myIdx: PropTypes.number,
  resetToLobby: PropTypes.func.isRequired,
  layoutFocus: PropTypes.string,
  setLayoutFocus: PropTypes.func.isRequired,
};
