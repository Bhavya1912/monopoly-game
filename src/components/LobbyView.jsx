import React from "react";
import { DIFF_INFO, PERS_INFO } from "../constants";

export default function LobbyView({
  lobbyMode,
  setLobbyMode,
  playerCount,
  setPlayerCount,
  createGame,
  joinCode,
  setJoinCode,
  joinGame,
  error,
  aiOpponentCount,
  setAiOpponentCount,
  aiDifficulty,
  setAiDifficulty,
  startAIGame,
}) {
  return (
    <div className="screen-overlay">
      <div className="menu-card">
        {/* Title */}
        <div className="menu-card-header">
          <div className="emoji-large">🎲</div>
          <h1 className="menu-title">MONOPOLY</h1>
          <p className="menu-subtitle">Online Multiplayer &amp; AI Mode</p>
        </div>

        {/* Mode tabs */}
        <div className="tab-container">
          {[
            ["multiplayer", "🌐 Multiplayer"],
            ["ai", "🤖 vs AI"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setLobbyMode(mode)}
              className={`tab-button ${lobbyMode === mode ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="menu-card-body">
          {/* ── MULTIPLAYER TAB ── */}
          {lobbyMode === "multiplayer" && (
            <>
              <div className="content-block">
                <h3 className="section-title">🏠 Create a Game</h3>
                <p className="label-text">Number of Players</p>
                <div className="flex-center flex-gap-10 margin-bottom-14">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPlayerCount(n)}
                      className={`btn-ghost ${playerCount === n ? "active" : ""}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={createGame}>
                  Create Game →
                </button>
              </div>

              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">OR</span>
                <div className="divider-line" />
              </div>

              <div className="content-block-alt">
                <h3 className="section-title">🔗 Join a Game</h3>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && joinGame()}
                  placeholder="Enter room code"
                  maxLength={6}
                  className="input-code"
                />
                {error && <p className="error-text">{error}</p>}
                <button className="btn btn-secondary btn-full" onClick={() => joinGame()}>
                  Join Game →
                </button>
              </div>
            </>
          )}

          {/* ── AI MODE TAB ── */}
          {lobbyMode === "ai" && (
            <>
              <div className="ai-config-box">
                <div className="ai-config-header">
                  🤖 <span>AI Opponents</span>
                  <span className="text-light text-xs font-normal">
                    (you are always Player 1)
                  </span>
                </div>
                <div className="ai-count-grid">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setAiOpponentCount(n)}
                      className={`btn-ai-count ${aiOpponentCount === n ? "active" : "inactive"}`}
                    >
                      {n} AI{n > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="margin-bottom-16">
                <div className="ai-config-header margin-bottom-8">🎯 Difficulty</div>
                <div className="grid-2">
                  {Object.entries(DIFF_INFO).map(
                    ([key, { label, emoji, desc }]) => (
                      <button
                        key={key}
                        onClick={() => setAiDifficulty(key)}
                        className={`card-button ${aiDifficulty === key ? "active" : ""}`}
                      >
                        <div className="weight-bold margin-bottom-2">
                          {emoji} {label}
                        </div>
                        <div className="text-light text-xs font-normal">
                          {desc}
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Personality */}
              <div className="margin-bottom-20">
                <div className="section-title">
                  🎭 AI Play Style
                  <span className="text-light text-xs margin-left-6 font-normal">
                    (each AI gets a different style automatically)
                  </span>
                </div>
                <div className="grid-2">
                  {Object.entries(PERS_INFO).map(
                    ([key, { label, emoji, desc }]) => (
                      <div key={key} className="card-info">
                        <div className="weight-bold margin-bottom-2">
                          {emoji} {label}
                        </div>
                        <div className="text-light">{desc}</div>
                      </div>
                    ),
                  )}
                </div>
                <p className="text-light text-xs text-center margin-top-8">
                  With {aiOpponentCount} opponent
                  {aiOpponentCount > 1 ? "s" : ""}, each gets a unique style
                </p>
              </div>

              {/* Summary */}
              <div className="settings-summary-box">
                <strong className="text-success-dark">You vs {aiOpponentCount} AI</strong> —{" "}
                {DIFF_INFO[aiDifficulty].label} difficulty
                {aiOpponentCount === 1 &&
                  ` • ${Object.values(PERS_INFO)[0].label} style`}
              </div>

              <button onClick={startAIGame} className="btn-play-ai">
                🎮 Play vs AI — Start Game
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
