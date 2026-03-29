import React from "react";
import { safePlayers } from "../utils";

export default function GameOverView({ gameState, resetToLobby }) {
  const ps = safePlayers(gameState);
  const alive = ps.filter((p) => !p.bankrupt);
  const winner =
    alive.length > 0
      ? alive.reduce((a, b) => (a.money > b.money ? a : b))
      : ps[0];

  return (
    <div className="screen-overlay">
      <div className="menu-card text-center winner-card">
        <div className="winner-badge">🏆</div>
        <h2 className="section-title text-center text-2xl">GAME OVER!</h2>
        {winner && (
          <>
            <p className="winner-text">
              {winner.token} Player {winner.id + 1}
              {winner.isAI ? " 🤖" : ""} wins!
            </p>
            <p className="weight-bold">💰 ${winner.money.toLocaleString()}</p>
          </>
        )}
        <div className="flex-column gap-6 margin-top-16">
          {ps
            .sort((a, b) => b.money - a.money)
            .map((p) => (
              <div
                key={p.id}
                className={`player-rank-row ${p.id === winner?.id ? "winner-row" : ""}`}
              >
                {p.id === winner?.id && <span>🏆</span>}
                <span className="text-xl">{p.token}</span>
                <span className={`weight-bold player-${p.id}-text`}>
                  P{p.id + 1}
                  {p.isAI ? " 🤖" : ""}
                </span>
                <span className="margin-left-auto weight-bold">
                  ${p.money.toLocaleString()}
                </span>
                {p.bankrupt && <span className="text-xs">💸</span>}
              </div>
            ))}
        </div>
        <button className="btn btn-primary margin-top-20" onClick={resetToLobby}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
