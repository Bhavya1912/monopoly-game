import React from "react";

export default function GameLog({ logArr }) {
  return (
    <div className="game-log-box">
      {logArr.map((msg, i) => (
        <div
          key={i}
          className={`game-log-msg ${i === 0 ? "text-success-light" : "text-dim"}`}
        >
          {msg}
        </div>
      ))}
    </div>
  );
}
