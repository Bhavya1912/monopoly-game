import { useState } from "react";
import { DEFAULT_SETTINGS, PLAYER_TOKENS } from "../constants";

// ─────────────────────────────────────────────────────────────────────────────
// SettSection — Section wrapper with a title bar
// ─────────────────────────────────────────────────────────────────────────────
function SettSection({ title, children }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <div style={{
                fontSize: 13, fontWeight: "bold", color: "#14532d", marginBottom: 8,
                borderBottom: "2px solid #e7d9a0", paddingBottom: 5,
            }}>
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
    settings, onChange, onClose, playerCount, setPlayerCount, maxPlayers,
}) {
    const [localSettings, setLocalSettings] = useState({ ...settings });
    const [customTarget, setCustomTarget] = useState(String(settings.targetAmount || 10000));

    const ls = (key, val) => setLocalSettings(p => ({ ...p, [key]: val }));

    const Pill = ({ label, active, onClick }) => (
        <button className={`pill${active ? " active" : ""}`} onClick={onClick}>{label}</button>
    );

    const apply = () => { onChange(localSettings); onClose(); };

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
            <div className="slide-in" style={{
                background: "#fefce8", borderRadius: 16, padding: "24px 28px",
                maxWidth: 480, width: "100%", maxHeight: "88vh", overflowY: "auto",
                border: "4px solid #a16207", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <h2 style={{ margin: 0, color: "#14532d", fontSize: 20 }}>⚙️ Game Settings</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#78716c" }}>✕</button>
                </div>

                {/* Players */}
                <SettSection title="👥 Players">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[2, 3, 4].map(n => (
                            <Pill key={n} label={`${n} Players`} active={playerCount === n}
                                onClick={() => setPlayerCount(Math.min(n, maxPlayers))} />
                        ))}
                    </div>
                </SettSection>

                {/* AI Players */}
                <SettSection title="🤖 AI Opponents">
                    <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 8px" }}>
                        Select which player slots are AI-controlled:
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {Array.from({ length: playerCount - 1 }, (_, i) => i + 1).map(idx => {
                            const isAI = (localSettings.aiPlayers || []).includes(idx);
                            return (
                                <Pill key={idx} label={`${PLAYER_TOKENS[idx]} P${idx + 1} AI`} active={isAI}
                                    onClick={() => {
                                        const ai = localSettings.aiPlayers || [];
                                        ls("aiPlayers", isAI ? ai.filter(x => x !== idx) : [...ai, idx]);
                                    }} />
                            );
                        })}
                        {playerCount <= 2 && <span style={{ fontSize: 12, color: "#9ca3af" }}>Add more players to enable AI</span>}
                    </div>
                </SettSection>

                {/* Turn Timer */}
                <SettSection title="⏳ Turn Timer">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[[0, "No Timer"], [30, "30 sec"], [60, "60 sec"], [90, "90 sec"]].map(([v, label]) => (
                            <Pill key={v} label={label} active={localSettings.turnTimer === v} onClick={() => ls("turnTimer", v)} />
                        ))}
                    </div>
                    {localSettings.turnTimer > 0 && (
                        <p style={{ fontSize: 12, color: "#78716c", margin: "6px 0 0" }}>
                            Turn auto-rolls and ends if timer expires.
                        </p>
                    )}
                </SettSection>

                {/* Game Mode */}
                <SettSection title="🏁 Game Mode">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        {[["classic", "⚔️ Classic"], ["timed", "⏱ Timed"], ["target", "🎯 Target"]].map(([v, label]) => (
                            <Pill key={v} label={label} active={localSettings.gameMode === v} onClick={() => ls("gameMode", v)} />
                        ))}
                    </div>
                    {localSettings.gameMode === "classic" && (
                        <p style={{ fontSize: 12, color: "#78716c", margin: 0 }}>Last player standing wins.</p>
                    )}
                    {localSettings.gameMode === "timed" && (
                        <div>
                            <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 8px" }}>Richest player when time runs out wins.</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {[[30, "30 min"], [60, "60 min"], [90, "90 min"]].map(([v, label]) => (
                                    <Pill key={v} label={label} active={localSettings.timedMinutes === v}
                                        onClick={() => ls("timedMinutes", v)} />
                                ))}
                            </div>
                        </div>
                    )}
                    {localSettings.gameMode === "target" && (
                        <div>
                            <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 8px" }}>First to reach target net worth wins.</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                {[5000, 10000, 25000].map(amt => (
                                    <Pill key={amt} label={`$${amt.toLocaleString()}`}
                                        active={localSettings.targetAmount === amt}
                                        onClick={() => { ls("targetAmount", amt); setCustomTarget(String(amt)); }} />
                                ))}
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 13, color: "#555" }}>Custom $:</span>
                                    <input value={customTarget}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, "");
                                            setCustomTarget(v);
                                            if (+v >= 1000) ls("targetAmount", +v);
                                        }}
                                        style={{ width: 80, padding: "5px 8px", borderRadius: 6, border: "2px solid #d6d3d1", fontSize: 13, outline: "none" }}
                                        placeholder="Amount" />
                                </div>
                            </div>
                        </div>
                    )}
                </SettSection>

                {/* Summary */}
                <div style={{
                    background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 10,
                    padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#333",
                }}>
                    <strong style={{ color: "#14532d" }}>Summary: </strong>
                    {playerCount} players
                    {(localSettings.aiPlayers || []).length > 0 && ` (${localSettings.aiPlayers.length} AI)`}
                    {" • "}
                    {localSettings.turnTimer ? `${localSettings.turnTimer}s timer` : "No timer"}
                    {" • "}
                    {localSettings.gameMode === "classic" ? "Classic" :
                        localSettings.gameMode === "timed" ? `Timed ${localSettings.timedMinutes}min` :
                            `Target $${(localSettings.targetAmount || 10000).toLocaleString()}`}
                </div>

                <button onClick={apply} style={{
                    background: "#14532d", color: "#fff", border: "none",
                    padding: "12px 0", borderRadius: 10, fontSize: 16, fontWeight: "bold",
                    cursor: "pointer", width: "100%", letterSpacing: 1,
                }}>
                    ✓ Apply Settings
                </button>
            </div>
        </div>
    );
}
