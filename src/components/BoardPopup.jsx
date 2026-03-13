import { useState } from "react";
import { SPACES, PLAYER_COLORS } from "../constants";

// ─────────────────────────────────────────────────────────────────────────────
// RouletteWheel — Visual wheel with animation
// ─────────────────────────────────────────────────────────────────────────────
function RouletteWheel({ outcomes, spinning, targetIndex, onComplete }) {
    const sliceAngle = 360 / outcomes.length;
    const rotation = spinning ? 1800 + (targetIndex * sliceAngle) : (targetIndex * sliceAngle);
    const conicGradient = outcomes.map((_, i) => 
        `${i % 2 === 0 ? "#15803d" : "#166534"} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`
    ).join(", ");

    return (
        <div className="wheel-container">
            <div 
                className={`wheel ${spinning ? "spinning" : ""}`}
                style={{ 
                    transform: `rotate(-${rotation}deg)`,
                    transition: spinning ? "transform 4s cubic-bezier(0.15, 0, 0.15, 1)" : "none",
                    background: `conic-gradient(${conicGradient})`
                }}
                onTransitionEnd={onComplete}
            >
                {outcomes.map((outcome, i) => {
                    const midAngle = i * sliceAngle + (sliceAngle / 2);
                    return (
                        <div 
                            key={i} 
                            className="wheel-label-wrapper"
                            style={{ 
                                transform: `rotate(${midAngle}deg)`
                            }}
                        >
                            <span className="wheel-label">{outcome.label}</span>
                        </div>
                    );
                })}
            </div>
            <div className="wheel-pointer">▼</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SwapPanel (needs its own hooks, hence separate component)
// ─────────────────────────────────────────────────────────────────────────────
function SwapPanel({ props, myIdx, rawPlayers, onSwap, onDismiss, eligibleMine, eligibleTheirs }) {
    const [myPick, setMyPick] = useState(null);
    const [theirPick, setTheirPick] = useState(null);
    const myProps = Object.entries(props).filter(
        ([id, p]) => p && p.owner === myIdx && eligibleMine.includes(+id),
    );
    const theirProps = Object.entries(props).filter(
        ([id, p]) => p && p.owner !== myIdx && eligibleTheirs.includes(+id),
    );

    return (
        <div className="board-popup modal-pop modal-center modal-wide">
            <div className="section-title text-center margin-bottom-12">
                🔄 Property Swap
            </div>
            
            <div className="modal-scrollable w-full" style={{ maxHeight: "350px" }}>
                <div className="text-sm weight-bold margin-bottom-6 player-0-text" style={{ color: "#166534" }}>
                    Your property to give:
                </div>
                <div className="swap-grid margin-bottom-16">
                    {myProps.map(([id]) => {
                        const s = SPACES[+id];
                        if (!s) return null;
                        return (
                            <button
                                key={id}
                                onClick={() => setMyPick(+id)}
                                className={`swap-card ${myPick === +id ? "selected" : ""}`}
                                style={{ "--card-color": s.color || "#888" }}
                            >
                                <div className="card-color-top" />
                                <div className="card-name-tiny">{s.name}</div>
                            </button>
                        );
                    })}
                    {myProps.length === 0 && <div className="text-xs text-dim italic">No properties available</div>}
                </div>

                <div className="text-sm weight-bold margin-bottom-6 player-1-text" style={{ color: "#1e40af" }}>
                    Property to receive:
                </div>
                <div className="swap-grid">
                    {theirProps.map(([id, p]) => {
                        const s = SPACES[+id];
                        if (!s) return null;
                        return (
                            <button
                                key={id}
                                onClick={() => setTheirPick(+id)}
                                className={`swap-card ${theirPick === +id ? "selected" : ""}`}
                                style={{ 
                                    "--card-color": s.color || "#888",
                                    "--owner-color": PLAYER_COLORS[p.owner]
                                }}
                            >
                                <div className="card-color-top" />
                                <div className="card-name-tiny">{s.name}</div>
                                <div className="owner-tag">{rawPlayers[p.owner]?.token}</div>
                            </button>
                        );
                    })}
                    {theirProps.length === 0 && <div className="text-xs text-dim italic">None available</div>}
                </div>
            </div>

            <div className="flex-gap-8 margin-top-12 w-full">
                <button
                    disabled={!myPick || !theirPick}
                    onClick={() => onSwap(myPick, theirPick)}
                    className="btn-action half btn-success-bg"
                >
                    Swap ✓
                </button>
                <button onClick={onDismiss} className="btn-action half btn-gray-bg">
                    Cancel
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
    onRouletteSpin,
    eligibleStealTargets,
    eligibleSwapMine,
    props,
    rawPlayers,
}) {
    if (!modal) return null;

    let content = null;

    // Jail
    if (modal.type === "jail") {
        const player = players[myIdx];
        if (!player) return null;
        const hasCard = (player.jailFreeCards || 0) > 0;
        content = (
            <div className="board-popup modal-pop modal-center">
                <div className="emoji-large">🔒</div>
                <div className="section-title text-center margin-bottom-4">You're in Jail!</div>
                <div className="menu-subtitle text-center margin-bottom-12">
                    Turn {(player.jailTurns || 0) + 1}/3 — Choose an option:
                </div>
                <div className="flex-column gap-8 w-full">
                    {hasCard && (
                        <button onClick={onUseJailCard} className="btn-action btn-purple-bg">
                            🃏 Use Get Out of Jail Free Card
                        </button>
                    )}
                    <button
                        onClick={onPayJailFine}
                        disabled={player.money < 50}
                        className={`btn-action ${player.money >= 50 ? "btn-warning-bg" : ""}`}
                    >
                        💰 Pay $50 Fine
                    </button>
                    <button onClick={onJailRoll} className="btn-action btn-success-bg">
                        🎲 Roll for Doubles
                    </button>
                </div>
            </div>
        );
    }

    // Buy property
    else if (modal.type === "buy") {
        const space = SPACES[modal.spaceId];
        const p = rawPlayers[modal.playerIdx];
        const isMe = modal.playerIdx === myIdx;
        if (!space || !p) return null;
        content = (
            <div className="board-popup modal-pop modal-center">
                <div className="emoji-large">🏠</div>
                <div className="section-title text-center margin-bottom-2">{space.name}</div>
                {space.color && (
                    <div className="color-bar" style={{ "--space-color": space.color }} />
                )}
                <div className="text-md text-center margin-bottom-10">
                    Price: <strong className="weight-bold">${space.price}</strong>
                </div>
                {isMe ? (
                    <div className="w-full">
                        <div className="text-xs text-light text-center margin-bottom-10">
                            Your balance: ${p.money.toLocaleString()}
                        </div>
                        <div className="flex-gap-8">
                            <button
                                onClick={onBuy}
                                disabled={p.money < space.price}
                                className={`btn-action half ${p.money >= space.price ? "btn-success-bg" : ""}`}
                            >
                                Buy ✓
                            </button>
                            <button onClick={onPass} className="btn-action half btn-danger-bg">
                                Pass ✗
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-light text-center margin-0">
                        {p.token} P{p.id + 1} is deciding...
                    </p>
                )}
            </div>
        );
    }

    // Build house
    else if (modal.type === "build") {
        const space = SPACES[modal.spaceId];
        const prop = props[modal.spaceId];
        if (!space || !prop) return null;
        const houses = prop.houses || 0;
        const canBuild = !prop.hotel && modal.canBuild;
        content = (
            <div className="board-popup modal-pop modal-center">
                <div className="section-title margin-bottom-4">{space.name}</div>
                {space.color && (
                    <div className="color-bar" style={{ "--space-color": space.color }} />
                )}
                <div className="text-sm margin-bottom-8">
                    {prop.hotel
                        ? "🏨 Hotel built"
                        : houses > 0
                            ? `🏠 × ${houses} houses`
                            : "No buildings yet"}
                </div>
                <div className="text-sm text-light margin-bottom-10">
                    Build cost: ${space.houseCost}/house
                </div>
                <div className="flex-gap-8 w-full">
                    {canBuild && (
                        <button
                            onClick={() => onBuildHouse(modal.spaceId)}
                            className="btn-action half btn-success-bg"
                        >
                            {houses >= 4 ? "🏨 Build Hotel" : "🏠 Build House"}
                        </button>
                    )}
                    <button onClick={onDismiss} className={`btn-action ${canBuild ? "half" : "w-full"} btn-gray-bg`}>
                        Close
                    </button>
                </div>
                {!canBuild && (
                    <p className="text-xs text-danger margin-top-8">
                        {prop.hotel ? "Max level!" : "Need full color group first."}
                    </p>
                )}
            </div>
        );
    }

    // Card
    else if (modal.type === "card") {
        content = (
            <div className="board-popup modal-pop modal-center">
                <div className="emoji-large">
                    {modal.title?.startsWith("❓") ? "❓" : "📋"}
                </div>
                <div className="section-title text-center margin-bottom-6">{modal.title}</div>
                <p className="text-md text-center style-italic margin-bottom-12">"{modal.text}"</p>
                {isMyTurn ? (
                    <button onClick={onDismiss} className="btn-action btn-success-bg w-full">OK</button>
                ) : (
                    <p className="text-xs text-light text-center margin-0">Waiting for current player...</p>
                )}
            </div>
        );
    }

    // Steal
    else if (modal.type === "steal") {
        content = (
            <div className="board-popup modal-pop modal-center">
                <div className="section-title text-center margin-bottom-8">🃏 Steal a Property!</div>
                <p className="text-sm text-dim text-center margin-bottom-12">Pick an opponent's property to take for free:</p>
                <div className="modal-scrollable w-full">
                    <div className="swap-grid">
                        {Object.entries(props).map(([id, p]) => {
                            if (!p || p.owner === myIdx || !eligibleStealTargets.includes(+id)) return null;
                            const space = SPACES[+id];
                            if (!space) return null;
                            const ownerColor = PLAYER_COLORS[p.owner] || "#888";
                            return (
                                <button
                                    key={id}
                                    onClick={() => onSteal(+id)}
                                    className="swap-card"
                                    style={{ "--card-color": space.color || "#888", "--owner-color": ownerColor }}
                                >
                                    <div className="card-color-top" />
                                    <div className="card-name-tiny">{space.name}</div>
                                    <div className="owner-tag">{rawPlayers[p.owner]?.token}</div>
                                </button>
                            );
                        })}
                        {eligibleStealTargets.length === 0 && <div className="text-xs text-dim italic text-center w-full">No properties available</div>}
                    </div>
                </div>
                <button onClick={onDismiss} className="btn-action btn-gray-bg margin-top-8 w-full">Skip</button>
            </div>
        );
    }

    // Swap
    else if (modal.type === "swap") {
        content = (
            <SwapPanel
                props={props}
                myIdx={myIdx}
                rawPlayers={rawPlayers}
                onSwap={onSwap}
                onDismiss={onDismiss}
                eligibleMine={eligibleSwapMine}
                eligibleTheirs={eligibleStealTargets}
            />
        );
    }

    // Roulette
    else if (modal.type === "roulette") {
        const isSpinning = modal.isSpinning;
        const targetIdx = modal.targetIdx ?? 0;
        content = (
            <div className="board-popup modal-pop modal-center roulette-modal">
                <div className="section-title text-center margin-bottom-6">🎡 Roulette Wheel</div>
                <p className="text-xs text-dim text-center margin-bottom-12">Test your luck!</p>
                <RouletteWheel 
                    outcomes={modal.options} 
                    spinning={isSpinning}
                    targetIndex={targetIdx}
                    onComplete={() => { if (isSpinning && isMyTurn) setTimeout(onRouletteSpin, 800); }}
                />
                <div className="margin-top-12 w-full">
                    {!isSpinning ? (
                        <button onClick={onRouletteSpin} className="btn-action btn-success-bg w-full" disabled={!isMyTurn}>
                            {isMyTurn ? "SPIN NOW! 🎲" : "Waiting..."}
                        </button>
                    ) : (
                        <div className="text-md weight-bold text-success text-center animate-pulse">SPINNING...</div>
                    )}
                </div>
            </div>
        );
    }

    // Notify
    else if (modal.type === "notify") {
        content = (
            <div className="board-popup modal-pop modal-notify modal-center">
                <div className="section-title margin-bottom-4">{modal.title}</div>
                <div className="text-sm text-dim margin-bottom-12">{modal.text}</div>
                <button onClick={onDismiss} className="btn-action btn-success-bg w-full">OK</button>
            </div>
        );
    }

    if (!content) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={modal.type === "notify" || modal.type === "card" || modal.type === "build" ? onDismiss : undefined} />
            {content}
        </>
    );
}
