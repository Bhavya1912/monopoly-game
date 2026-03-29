import React from "react";

export default function TurnBanner({ isRolling, cur, gameState, isMyTurn }) {
  return (
    <div
      className={`banner-message ${
        isMyTurn
          ? gameState.rolled
            ? "text-warning"
            : "text-success-light"
          : "text-danger-light"
      }`}
    >
      {isRolling
        ? `🎲 ${cur?.token || ""} P${(gameState.currentPlayer || 0) + 1}${cur?.isAI ? " 🤖" : ""} is rolling...`
        : isMyTurn
          ? gameState.rolled
            ? "✅ Done! — End your turn →"
            : "🎲 YOUR TURN — Roll the dice!"
          : `⏳ ${cur?.token || ""} P${(gameState.currentPlayer || 0) + 1}${cur?.isAI ? " 🤖" : ""}'s turn...`}
    </div>
  );
}
