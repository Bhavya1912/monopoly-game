import { SPACES, COLOR_GROUPS } from "../constants";

// Small helper row used inside the rent table
function RentRow({ label, amount, active, note, icon, hotel }) {
    return (
        <div className={`prop-rent-row${active ? " highlight" : ""}`}>
            <span className="label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
                {label}
                {note && <span style={{ fontSize: 10, color: "#9ca3af" }}> {note}</span>}
                {active && <span style={{ fontSize: 9, color: "#d97706", fontWeight: 700, marginLeft: 2 }}>← NOW</span>}
            </span>
            <span className="amount" style={{ color: hotel ? "#7c3aed" : active ? "#14532d" : "#1a1a1a" }}>
                {typeof amount === "number" ? `$${amount}` : amount}
            </span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PropertyCardModal — Full Monopoly-style deed card overlay
// ─────────────────────────────────────────────────────────────────────────────
export default function PropertyCardModal({
    spaceId, prop, players, myIdx, isMyTurn,
    onClose, onBuild, onBuy, allProps, playerIsOnSpace,
}) {
    const space = SPACES[spaceId];
    if (!space) return null;

    const owner = prop != null ? players[prop.owner] : null;
    const isOwned = prop != null;
    const isMine = isOwned && prop.owner === myIdx;
    const me = players[myIdx];
    const houses = prop?.houses || 0;
    const hasHotel = prop?.hotel || false;

    const group = COLOR_GROUPS[space.color] || [];
    const hasMonopoly = space.type === "property" && group.length > 0 &&
        group.every(id => allProps[id]?.owner === myIdx);

    const canAfford = me && space.houseCost && me.money >= space.houseCost;
    const canBuild = isMyTurn && isMine && space.type === "property" &&
        !hasHotel && hasMonopoly && canAfford;

    const mortgage = space.price ? Math.floor(space.price / 2) : null;
    const currentLevel = hasHotel ? 5 : houses;

    const isRailroad = space.type === "railroad";
    const isUtility = space.type === "utility";
    const isColorProp = space.type === "property";

    const headerBg = space.color || "#1a1a1a";
    const headerLight = ["#87CEEB", "#fef9c3", "#ffedd5", "#ffffff"].includes(space.color);

    return (
        <div className="prop-card-overlay" onClick={onClose}>
            <div className="prop-card" onClick={e => e.stopPropagation()}>

                {/* Close button */}
                <button onClick={onClose} style={{
                    position: "absolute", top: 6, right: 8,
                    background: "none", border: "none", fontSize: 18,
                    cursor: "pointer", color: headerLight ? "#1a1a1a" : "#fff",
                    fontWeight: "bold", lineHeight: 1, zIndex: 10,
                }}>✕</button>

                {/* Deed header */}
                <div className="prop-card-header" style={{ background: headerBg, borderBottom: "2px solid #1a1a1a" }}>
                    <div style={{
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: 2, color: headerLight ? "#1a1a1a" : "rgba(255,255,255,0.85)",
                        marginBottom: 2,
                    }}>
                        {isColorProp ? "Title Deed" : isRailroad ? "Railroad" : isUtility ? "Utility" : ""}
                    </div>
                    <div className="prop-card-title" style={{
                        color: headerLight ? "#1a1a1a" : "#fff",
                        textShadow: headerLight ? "none" : "0 1px 3px rgba(0,0,0,0.4)",
                    }}>
                        {space.name}
                    </div>
                    {isOwned && owner && (
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            marginTop: 5, background: "rgba(255,255,255,0.25)",
                            borderRadius: 20, padding: "2px 10px",
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: owner.color }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: headerLight ? "#1a1a1a" : "#fff" }}>
                                {owner.token} P{owner.id + 1}{isMine ? " (You)" : ""}
                            </span>
                            {hasMonopoly && isMine && (
                                <span style={{ fontSize: 9, background: "gold", color: "#1a1a1a", padding: "0 5px", borderRadius: 10, fontWeight: 800 }}>★ MONOPOLY</span>
                            )}
                        </div>
                    )}
                    {!isOwned && (
                        <div style={{
                            display: "inline-block", marginTop: 5,
                            background: "rgba(255,255,255,0.25)", borderRadius: 20,
                            padding: "2px 10px", fontSize: 10, color: headerLight ? "#1a1a1a" : "#fff", fontWeight: 700,
                        }}>For Sale</div>
                    )}
                </div>

                {/* Price banner */}
                {space.price && (
                    <div style={{ textAlign: "center", padding: "7px 0 5px", borderBottom: "1px solid #e5e7eb", fontSize: 13, color: "#374151" }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>${space.price}</span>
                        <span style={{ marginLeft: 4, fontSize: 11 }}>purchase price</span>
                    </div>
                )}

                {/* Rent table */}
                <div className="prop-card-body" style={{ paddingTop: 8 }}>
                    {isColorProp && space.rent && (
                        <>
                            <RentRow label="RENT" amount={space.rent[0]} active={currentLevel === 0 && isOwned} />
                            <RentRow label="With Color Set" amount={space.rent[0] * 2} active={false} note="(monopoly)" />
                            <RentRow label="With 1 House" amount={space.rent[1]} active={currentLevel === 1} icon="🏠" />
                            <RentRow label="With 2 Houses" amount={space.rent[2]} active={currentLevel === 2} icon="🏠🏠" />
                            <RentRow label="With 3 Houses" amount={space.rent[3]} active={currentLevel === 3} icon="🏠🏠🏠" />
                            <RentRow label="With 4 Houses" amount={space.rent[4]} active={currentLevel === 4} icon="🏠×4" />
                            <RentRow label="With HOTEL" amount={space.rent[5]} active={currentLevel === 5} icon="🏨" hotel />
                        </>
                    )}
                    {isRailroad && space.rent && (
                        <>
                            <RentRow label="Rent (1 railroad)" amount={space.rent[0]} active={isOwned} />
                            <RentRow label="Rent (2 railroads)" amount={space.rent[1]} />
                            <RentRow label="Rent (3 railroads)" amount={space.rent[2]} />
                            <RentRow label="Rent (4 railroads)" amount={space.rent[3]} />
                        </>
                    )}
                    {isUtility && (
                        <>
                            <RentRow label="Rent (1 utility)" amount="4× dice roll" active={isOwned} />
                            <RentRow label="Rent (2 utilities)" amount="10× dice roll" />
                        </>
                    )}
                </div>

                {/* Build section */}
                {isColorProp && space.houseCost && (
                    <div className="prop-build-section">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: "#374151" }}>
                                🏠 House cost: <strong>${space.houseCost}</strong>
                            </span>
                            {isOwned && (
                                <span style={{ fontSize: 14 }}>
                                    {hasHotel ? "🏨" : houses > 0 ? "🏠".repeat(houses) : "—"}
                                </span>
                            )}
                        </div>
                        {isMine && !playerIsOnSpace && !hasHotel && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, fontStyle: "italic", background: "#f9fafb", padding: "5px 8px", borderRadius: 5 }}>
                                🔒 You can only build here when you land on this property.
                            </div>
                        )}
                        {isMine && playerIsOnSpace && !hasMonopoly && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, fontStyle: "italic" }}>
                                Own all {group.length} properties in this group to build.
                            </div>
                        )}
                        {onBuild && isMyTurn && !hasHotel && (
                            <button
                                onClick={() => onBuild(spaceId)}
                                disabled={!canAfford}
                                style={{
                                    width: "100%", padding: "9px 0",
                                    background: canAfford ? "#14532d" : "#9ca3af",
                                    color: "#fff", border: "none", borderRadius: 6,
                                    fontSize: 13, fontWeight: 700,
                                    cursor: canAfford ? "pointer" : "not-allowed",
                                    marginBottom: 8,
                                }}
                            >
                                {houses >= 4 ? `🏨 Build Hotel — $${space.houseCost}` : `🏠 Build House — $${space.houseCost}`}
                            </button>
                        )}
                        {isMine && hasHotel && (
                            <div style={{ textAlign: "center", fontSize: 12, color: "#16a34a", fontWeight: 700, marginBottom: 8 }}>
                                🏨 Hotel built — maximum level reached!
                            </div>
                        )}
                        {onBuild && isMyTurn && !canAfford && !hasHotel && (
                            <div style={{ textAlign: "center", fontSize: 11, color: "#dc2626", marginBottom: 8 }}>
                                Not enough funds — need ${space.houseCost}
                            </div>
                        )}
                    </div>
                )}

                {/* Buy button */}
                {!isOwned && space.price && (
                    <div style={{ padding: "10px 14px 12px", borderTop: "2px solid #1a1a1a" }}>
                        {onBuy ? (
                            <button
                                onClick={onBuy}
                                disabled={!me || me.money < space.price}
                                style={{
                                    width: "100%", padding: "9px 0",
                                    background: me && me.money >= space.price ? "#14532d" : "#9ca3af",
                                    color: "#fff", border: "none", borderRadius: 6,
                                    fontSize: 13, fontWeight: 700,
                                    cursor: me && me.money >= space.price ? "pointer" : "not-allowed",
                                }}
                            >
                                Buy for ${space.price}
                            </button>
                        ) : (
                            <div style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", fontStyle: "italic", padding: "4px 0" }}>
                                {!isMyTurn ? "Not your turn" : !playerIsOnSpace ? "🔒 Land on this property to buy it" : "Already owned"}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="prop-card-footer">
                    <span>Mortgage value: <strong>${mortgage ?? "—"}</strong></span>
                    {space.houseCost && <span>House cost: <strong>${space.houseCost}</strong></span>}
                </div>
            </div>
        </div>
    );
}
