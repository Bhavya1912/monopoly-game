import { useState } from "react";
import { SPACES, PLAYER_COLORS, PLAYER_TOKENS } from "../constants";

// ─────────────────────────────────────────────────────────────────────────────
// Shared button style helper
// ─────────────────────────────────────────────────────────────────────────────
function btnStyle(bg, half = false) {
    return {
        background: bg,
        color: "#fff",
        border: "none",
        padding: "9px 0",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: "bold",
        cursor: "pointer",
        width: half ? "50%" : "100%",
        transition: "opacity 0.15s",
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SwapPanel (needs its own hooks, hence separate component)
// ─────────────────────────────────────────────────────────────────────────────
function SwapPanel({ props, myIdx, rawPlayers, onSwap, onDismiss }) {
    const [myPick, setMyPick] = useState(null);
    const [theirPick, setTheirPick] = useState(null);
    const myProps = Object.entries(props).filter(
        ([, p]) => p && p.owner === myIdx,
    );
    const theirProps = Object.entries(props).filter(
        ([, p]) => p && p.owner !== myIdx,
    );

    return (
        <div
            className="board-popup pop-in"
            style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                position: "fixed",
                zIndex: 100,
                maxWidth: 300,
                maxHeight: "80vh",
                overflowY: "auto",
            }}
        >
            <div
                style={{
                    fontWeight: "bold",
                    fontSize: 14,
                    color: "#14532d",
                    marginBottom: 8,
                }}
            >
                🔄 Swap Properties
            </div>
            <div style={{ fontSize: 12, marginBottom: 6, fontWeight: "bold" }}>
                Your property:
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    marginBottom: 10,
                }}
            >
                {myProps.map(([id]) => {
                    const s = SPACES[+id];
                    if (!s) return null;
                    return (
                        <button
                            key={id}
                            onClick={() => setMyPick(+id)}
                            style={{
                                padding: "4px 8px",
                                border: `2px solid ${myPick === +id ? "#14532d" : "#d6d3d1"}`,
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 12,
                                background: myPick === +id ? "#dcfce7" : "#fff",
                            }}
                        >
                            {s.name}
                        </button>
                    );
                })}
            </div>
            <div style={{ fontSize: 12, marginBottom: 6, fontWeight: "bold" }}>
                Their property:
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    marginBottom: 10,
                }}
            >
                {theirProps.map(([id, p]) => {
                    const s = SPACES[+id];
                    if (!s) return null;
                    return (
                        <button
                            key={id}
                            onClick={() => setTheirPick(+id)}
                            style={{
                                padding: "4px 8px",
                                border: `2px solid ${theirPick === +id ? PLAYER_COLORS[p.owner] : "#d6d3d1"}`,
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 12,
                                background:
                                    theirPick === +id ? `${PLAYER_COLORS[p.owner]}22` : "#fff",
                            }}
                        >
                            {s.name} ({rawPlayers[p.owner]?.token})
                        </button>
                    );
                })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
                <button
                    onClick={() => myPick && theirPick && onSwap(myPick, theirPick)}
                    disabled={!myPick || !theirPick}
                    style={btnStyle(!myPick || !theirPick ? "#9ca3af" : "#14532d", true)}
                >
                    Swap
                </button>
                <button onClick={onDismiss} style={btnStyle("#6b7280", true)}>
                    Skip
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// BoardPopup — in-game overlay for buy / jail / card / steal / swap / notify
// ─────────────────────────────────────────────────────────────────────────────
export default function BoardPopup({
    modal,
    players,
    myIdx,
    isMyTurn,
    onBuy,
    onPass,
    onDismiss,
    onUseJailCard,
    onPayJailFine,
    onJailRoll,
    onSteal,
    onSwap,
    onBuildHouse,
    props,
    rawPlayers,
}) {
    if (!modal) return null;

    // Jail
    if (modal.type === "jail") {
        const player = players[myIdx];
        if (!player) return null;
        const hasCard = (player.jailFreeCards || 0) > 0;
        return (
            <div
                className="board-popup pop-in"
                style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    position: "fixed",
                    zIndex: 100,
                }}
            >
                <div style={{ fontSize: 22, textAlign: "center", marginBottom: 8 }}>
                    🔒
                </div>
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: 14,
                        textAlign: "center",
                        marginBottom: 4,
                        color: "#14532d",
                    }}
                >
                    You're in Jail!
                </div>
                <div
                    style={{
                        fontSize: 12,
                        color: "#78716c",
                        textAlign: "center",
                        marginBottom: 12,
                    }}
                >
                    Turn {(player.jailTurns || 0) + 1}/3 — Choose an option:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {hasCard && (
                        <button onClick={onUseJailCard} style={btnStyle("#7c3aed")}>
                            🃏 Use Get Out of Jail Free Card
                        </button>
                    )}
                    <button
                        onClick={onPayJailFine}
                        disabled={player.money < 50}
                        style={btnStyle(player.money >= 50 ? "#d97706" : "#9ca3af")}
                    >
                        💰 Pay $50 Fine
                    </button>
                    <button onClick={onJailRoll} style={btnStyle("#14532d")}>
                        🎲 Roll for Doubles
                    </button>
                </div>
            </div>
        );
    }

    // Buy property
    if (modal.type === "buy") {
        const space = SPACES[modal.spaceId];
        const p = rawPlayers[modal.playerIdx];
        const isMe = modal.playerIdx === myIdx;
        if (!space || !p) return null;
        return (
            <div
                className="board-popup pop-in"
                style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    position: "fixed",
                    zIndex: 100,
                }}
            >
                <div style={{ fontSize: 30, textAlign: "center", marginBottom: 4 }}>
                    🏠
                </div>
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: 15,
                        textAlign: "center",
                        color: "#14532d",
                        marginBottom: 2,
                    }}
                >
                    {space.name}
                </div>
                {space.color && (
                    <div
                        style={{
                            height: 8,
                            background: space.color,
                            borderRadius: 3,
                            margin: "6px 0",
                        }}
                    />
                )}
                <div style={{ fontSize: 13, textAlign: "center", margin: "6px 0" }}>
                    Price: <strong>${space.price}</strong>
                </div>
                {isMe ? (
                    <>
                        <div
                            style={{
                                fontSize: 11,
                                color: "#78716c",
                                textAlign: "center",
                                marginBottom: 10,
                            }}
                        >
                            Your balance: ${p.money.toLocaleString()}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={onBuy}
                                disabled={p.money < space.price}
                                style={btnStyle(
                                    p.money >= space.price ? "#14532d" : "#9ca3af",
                                    true,
                                )}
                            >
                                Buy ✓
                            </button>
                            <button onClick={onPass} style={btnStyle("#dc2626", true)}>
                                Pass ✗
                            </button>
                        </div>
                    </>
                ) : (
                    <p
                        style={{
                            fontSize: 12,
                            color: "#78716c",
                            textAlign: "center",
                            margin: 0,
                        }}
                    >
                        {p.token} P{p.id + 1} is deciding...
                    </p>
                )}
            </div>
        );
    }

    // Build house
    if (modal.type === "build") {
        const space = SPACES[modal.spaceId];
        const prop = props[modal.spaceId];
        if (!space || !prop) return null;
        const houses = prop.houses || 0;
        const canBuild = !prop.hotel && modal.canBuild;
        return (
            <div
                className="board-popup pop-in"
                style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    position: "fixed",
                    zIndex: 100,
                }}
            >
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: 14,
                        color: "#14532d",
                        marginBottom: 6,
                    }}
                >
                    {space.name}
                </div>
                {space.color && (
                    <div
                        style={{
                            height: 8,
                            background: space.color,
                            borderRadius: 3,
                            margin: "4px 0 8px",
                        }}
                    />
                )}
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                    {prop.hotel
                        ? "🏨 Hotel built"
                        : houses > 0
                            ? `🏠 × ${houses} houses`
                            : "No buildings yet"}
                </div>
                <div style={{ fontSize: 12, color: "#78716c", marginBottom: 10 }}>
                    Build cost: ${space.houseCost}/house
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    {canBuild && (
                        <button
                            onClick={() => onBuildHouse(modal.spaceId)}
                            style={btnStyle("#14532d", true)}
                        >
                            {houses >= 4 ? "🏨 Build Hotel" : "🏠 Build House"}
                        </button>
                    )}
                    <button onClick={onDismiss} style={btnStyle("#6b7280", true)}>
                        Close
                    </button>
                </div>
                {!canBuild && (
                    <p style={{ fontSize: 11, color: "#dc2626", margin: "8px 0 0" }}>
                        {prop.hotel ? "Max level!" : "Need full color group first."}
                    </p>
                )}
            </div>
        );
    }

    // Card (Chance / Community)
    if (modal.type === "card") {
        return (
            <div
                className="board-popup pop-in"
                style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    position: "fixed",
                    zIndex: 100,
                }}
            >
                <div style={{ fontSize: 28, textAlign: "center", marginBottom: 6 }}>
                    {modal.title?.startsWith("❓") ? "❓" : "📋"}
                </div>
                <div
                    style={{
                        fontWeight: "bold",
                        color: "#14532d",
                        fontSize: 14,
                        textAlign: "center",
                        marginBottom: 6,
                    }}
                >
                    {modal.title}
                </div>
                <p
                    style={{
                        fontStyle: "italic",
                        fontSize: 13,
                        textAlign: "center",
                        color: "#292524",
                        margin: "0 0 12px",
                    }}
                >
                    "{modal.text}"
                </p>
                {isMyTurn ? (
                    <button onClick={onDismiss} style={btnStyle("#14532d")}>
                        OK
                    </button>
                ) : (
                    <p
                        style={{
                            fontSize: 11,
                            color: "#78716c",
                            textAlign: "center",
                            margin: 0,
                        }}
                    >
                        Waiting for current player...
                    </p>
                )}
            </div>
        );
    }

    // Steal
    if (modal.type === "steal") {
        return (
            <div
                className="board-popup pop-in"
                style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    position: "fixed",
                    zIndex: 100,
                }}
            >
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: 14,
                        color: "#14532d",
                        marginBottom: 8,
                    }}
                >
                    🃏 Steal a Property!
                </div>
                <p style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
                    Pick an opponent's property to take:
                </p>
                <div
                    style={{
                        maxHeight: 200,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                    }}
                >
                    {Object.entries(props).map(([id, p]) => {
                        if (!p || p.owner === myIdx) return null;
                        const space = SPACES[+id];
                        if (!space) return null;
                        return (
                            <button
                                key={id}
                                onClick={() => onSteal(+id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 10px",
                                    background: `${PLAYER_COLORS[p.owner]}22`,
                                    border: `1px solid ${PLAYER_COLORS[p.owner]}`,
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontSize: 12,
                                }}
                            >
                                {space.color && (
                                    <div
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: space.color,
                                        }}
                                    />
                                )}
                                <span style={{ flex: 1, textAlign: "left" }}>{space.name}</span>
                                <span>{rawPlayers[p.owner]?.token}</span>
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={onDismiss}
                    style={{ ...btnStyle("#6b7280"), marginTop: 8 }}
                >
                    Skip
                </button>
            </div>
        );
    }

    // Swap
    if (modal.type === "swap") {
        return (
            <SwapPanel
                props={props}
                myIdx={myIdx}
                rawPlayers={rawPlayers}
                onSwap={onSwap}
                onDismiss={onDismiss}
            />
        );
    }

    // Notification
    if (modal.type === "notify") {
        return (
            <div
                className="board-popup pop-in"
                style={{
                    bottom: 16,
                    right: 16,
                    position: "fixed",
                    zIndex: 100,
                    maxWidth: 240,
                    animation: "slideIn 0.2s ease-out",
                }}
            >
                <div
                    style={{
                        fontSize: 13,
                        color: "#14532d",
                        fontWeight: "bold",
                        marginBottom: 4,
                    }}
                >
                    {modal.title}
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>{modal.text}</div>
                <button
                    onClick={onDismiss}
                    style={{
                        ...btnStyle("#14532d"),
                        marginTop: 8,
                        fontSize: 11,
                        padding: "4px 12px",
                    }}
                >
                    OK
                </button>
            </div>
        );
    }

    return null;
}
