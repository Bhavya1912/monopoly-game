import React from "react";
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
          {gs_s.gameMode === "classic"
            ? "⚔️ Classic"
            : gs_s.gameMode === "timed"
              ? `⏱ ${gs_s.timedMinutes}min`
              : `🎯 $${(gs_s.targetAmount || 10000).toLocaleString()}`}
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
        {rawPlayers.map((p, i) =>
          p ? (
            <div
              key={i}
              className={`player-chip ${
                gameState.currentPlayer === i
                  ? "active-turn"
                  : i === myIdx
                    ? "current-player"
                    : ""
              } ${p.bankrupt ? "bankrupt" : ""}`}
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
          ) : null,
        )}
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
      <button className="btn btn-danger text-xs" onClick={resetToLobby}>
        Leave
      </button>
    </div>
  );
}
