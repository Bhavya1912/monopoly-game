import { useState } from "react";
import { DEFAULT_SETTINGS, PLAYER_TOKENS } from "../constants";

// ─────────────────────────────────────────────────────────────────────────────
// SettSection — Section wrapper with a title bar
// ─────────────────────────────────────────────────────────────────────────────
function SettSection({ title, children }) {
  return (
    <div className="section-wrapper">
      <div className="section-title-line">
        {title}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsModal — Full settings overlay shown on the waiting / lobby screen
// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsModal({
  settings,
  onChange,
  onClose,
  playerCount,
  setPlayerCount,
  maxPlayers,
}) {
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [customTarget, setCustomTarget] = useState(
    String(settings.targetAmount || 10000),
  );

  const ls = (key, val) => setLocalSettings((p) => ({ ...p, [key]: val }));

  const Pill = ({ label, active, onClick }) => (
    <button className={`pill${active ? " active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );

  const apply = () => {
    onChange(localSettings);
    onClose();
  };

  return (
    <div className="settings-overlay">
      <div className="settings-card slide-in">
        <div className="settings-header-box">
          <h2 className="settings-title">
            ⚙️ Game Settings
          </h2>
          <button
            onClick={onClose}
            className="settings-close"
          >
            ✕
          </button>
        </div>

        {/* Players */}
        <SettSection title="👥 Players">
          <div className="flex gap-8 flex-wrap">
            {[2, 3, 4].map((n) => (
              <Pill
                key={n}
                label={`${n} Players`}
                active={playerCount === n}
                onClick={() => setPlayerCount(Math.min(n, maxPlayers))}
              />
            ))}
          </div>
        </SettSection>

        {/* AI Players */}
        <SettSection title="🤖 AI Opponents">
          <p className="text-xs text-dim margin-0 margin-bottom-8">
            Select which player slots are AI-controlled:
          </p>
          <div className="flex gap-8 flex-wrap">
            {Array.from({ length: playerCount - 1 }, (_, i) => i + 1).map(
              (idx) => {
                const isAI = (localSettings.aiPlayers || []).includes(idx);
                return (
                  <Pill
                    key={idx}
                    label={`${PLAYER_TOKENS[idx]} P${idx + 1} AI`}
                    active={isAI}
                    onClick={() => {
                      const ai = localSettings.aiPlayers || [];
                      ls(
                        "aiPlayers",
                        isAI ? ai.filter((x) => x !== idx) : [...ai, idx],
                      );
                    }}
                  />
                );
              },
            )}
            {playerCount <= 2 && (
              <span className="text-xs text-dim">
                Add more players to enable AI
              </span>
            )}
          </div>
        </SettSection>

        {/* Turn Timer */}
        <SettSection title="⏳ Turn Timer">
          <div className="flex gap-8 flex-wrap">
            {[
              [0, "No Timer"],
              [30, "30 sec"],
              [60, "60 sec"],
              [90, "90 sec"],
            ].map(([v, label]) => (
              <Pill
                key={v}
                label={label}
                active={localSettings.turnTimer === v}
                onClick={() => ls("turnTimer", v)}
              />
            ))}
          </div>
          {localSettings.turnTimer > 0 && (
            <p className="settings-timer-note">
              Turn auto-rolls and ends if timer expires.
            </p>
          )}
        </SettSection>

        {/* Game Mode */}
        <SettSection title="🏁 Game Mode">
          <div className="flex gap-8 flex-wrap margin-bottom-10">
            {[
              ["classic", "⚔️ Classic"],
              ["timed", "⏱ Timed"],
              ["target", "🎯 Target"],
            ].map(([v, label]) => (
              <Pill
                key={v}
                label={label}
                active={localSettings.gameMode === v}
                onClick={() => ls("gameMode", v)}
              />
            ))}
          </div>
          {localSettings.gameMode === "classic" && (
            <p className="text-xs text-dim margin-0">
              Last player standing wins.
            </p>
          )}
          {localSettings.gameMode === "timed" && (
            <div>
              <p className="text-xs text-dim margin-0 margin-bottom-8">
                Richest player when time runs out wins.
              </p>
              <div className="flex gap-8 flex-wrap">
                {[
                  [30, "30 min"],
                  [60, "60 min"],
                  [90, "90 min"],
                ].map(([v, label]) => (
                  <Pill
                    key={v}
                    label={label}
                    active={localSettings.timedMinutes === v}
                    onClick={() => ls("timedMinutes", v)}
                  />
                ))}
              </div>
            </div>
          )}
          {localSettings.gameMode === "target" && (
            <div>
              <p className="text-xs text-dim margin-0 margin-bottom-8">
                First to reach target net worth wins.
              </p>
              <div className="flex gap-8 flex-wrap align-center">
                {[5000, 10000, 25000].map((amt) => (
                  <Pill
                    key={amt}
                    label={`$${amt.toLocaleString()}`}
                    active={localSettings.targetAmount === amt}
                    onClick={() => {
                      ls("targetAmount", amt);
                      setCustomTarget(String(amt));
                    }}
                  />
                ))}
                <div className="flex align-center gap-6">
                  <span className="text-md text-dim">Custom $:</span>
                  <input
                    value={customTarget}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      setCustomTarget(v);
                      if (+v >= 1000) ls("targetAmount", +v);
                    }}
                    className="settings-input"
                    placeholder="Amount"
                  />
                </div>
              </div>
            </div>
          )}
        </SettSection>

        {/* Summary */}
        <div className="settings-summary">
          <strong>Summary: </strong>
          {playerCount} players
          {(localSettings.aiPlayers || []).length > 0 &&
            ` (${localSettings.aiPlayers.length} AI)`}
          {" • "}
          {localSettings.turnTimer
            ? `${localSettings.turnTimer}s timer`
            : "No timer"}
          {" • "}
          {localSettings.gameMode === "classic"
            ? "Classic"
            : localSettings.gameMode === "timed"
              ? `Timed ${localSettings.timedMinutes}min`
              : `Target $${(localSettings.targetAmount || 10000).toLocaleString()}`}
        </div>

        <button
          onClick={apply}
          className="btn-settings-apply"
        >
          ✓ Apply Settings
        </button>
      </div>
    </div>
  );
}
