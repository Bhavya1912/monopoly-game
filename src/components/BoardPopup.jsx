import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { SPACES, PLAYER_COLORS } from "../constants";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-renderers for Roulette
// ─────────────────────────────────────────────────────────────────────────────

function RouletteWheel({ outcomes, spinning, targetIndex, onComplete }) {
    const n = outcomes.length;
    const sliceAngle = 360 / n;
    const [rotation, setRotation] = useState(targetIndex * sliceAngle);
    const lastTargetRef = useRef(-1);

    useEffect(() => {
        if (spinning && targetIndex !== lastTargetRef.current) {
            const currentBase = Math.floor(rotation / 360) * 360;
            // Add at least 6 full spins plus the target offset
            const newRotation = currentBase + 2160 + (targetIndex * sliceAngle);
            requestAnimationFrame(() => {
                setRotation(newRotation);
            });
            lastTargetRef.current = targetIndex;
        }
    }, [spinning, targetIndex, sliceAngle, rotation]);

    const conicGradient = outcomes
        .map((_, i) =>
            `${i % 2 === 0 ? "#15803d" : "#166534"} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`
        )
        .join(", ");

    // Radius at which label sits (50% = edge, 0% = center)
    const R = 34; // % of container, placed ~2/3 out from center

    return (
        <div className="wheel-container">
            <div
                className={`wheel ${spinning ? "spinning" : ""}`}
                style={{
                    transform: `rotate(-${rotation}deg)`,
                    transition: spinning
                        ? "transform 4s cubic-bezier(0.15, 0, 0.15, 1)"
                        : "none",
                    background: `conic-gradient(${conicGradient})`,
                    position: "relative",
                }}
                onTransitionEnd={onComplete}
            >
                {/* SVG overlay for centered slice labels */}
                <svg
                    viewBox="0 0 100 100"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
                >
                    {outcomes.map((outcome, i) => {
                        const midDeg = i * sliceAngle + sliceAngle / 2;
                        const midRad = (midDeg - 90) * (Math.PI / 180);
                        const cx = 50 + R * Math.cos(midRad);
                        const cy = 50 + R * Math.sin(midRad);
                        // Split label into max 2 lines of ~10 chars
                        const words = outcome.label.split(" ");
                        const lines = [];
                        let current = "";
                        for (const word of words) {
                            if ((current + " " + word).trim().length > 10 && current) {
                                lines.push(current.trim());
                                current = word;
                            } else {
                                current = (current + " " + word).trim();
                            }
                        }
                        if (current) lines.push(current.trim());
                        return (
                            <text
                                key={outcome.label}
                                x={cx}
                                y={cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(${midDeg}, ${cx}, ${cy})`}
                                style={{ fontSize: "4px", fontWeight: 800, fill: "#fff", textTransform: "uppercase", letterSpacing: "0.2px", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                            >
                                {lines.map((line, li) => (
                                    <tspan key={`${line}-${li}`} x={cx} dy={li === 0 ? `${-(lines.length - 1) * 2.5}` : "5"}>
                                        {line}
                                    </tspan>
                                ))}
                            </text>
                        );
                    })}
                </svg>
            </div>
            <div className="wheel-pointer">V</div>
        </div>
    );
}

RouletteWheel.propTypes = {
    outcomes: PropTypes.arrayOf(
        PropTypes.shape({ label: PropTypes.string.isRequired }),
    ).isRequired,
    spinning: PropTypes.bool.isRequired,
    targetIndex: PropTypes.number.isRequired,
    onComplete: PropTypes.func.isRequired,
};

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
                Property Swap
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
                                    "--owner-color": PLAYER_COLORS[p.owner],
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
                    Swap
                </button>
                <button onClick={onDismiss} className="btn-action half btn-gray-bg">
                    Cancel
                </button>
            </div>
        </div>
    );
}

SwapPanel.propTypes = {
    props: PropTypes.objectOf(
        PropTypes.shape({ owner: PropTypes.number }),
    ).isRequired,
    myIdx: PropTypes.number.isRequired,
    rawPlayers: PropTypes.arrayOf(PropTypes.shape({ token: PropTypes.string })).isRequired,
    onSwap: PropTypes.func.isRequired,
    onDismiss: PropTypes.func.isRequired,
    eligibleMine: PropTypes.arrayOf(PropTypes.number).isRequired,
    eligibleTheirs: PropTypes.arrayOf(PropTypes.number).isRequired,
};

// ─────────────────── Sub-renderers to reduce cognitive complexity ───────────────────

function JailContent({ players, myIdx, onUseJailCard, onPayJailFine, onJailRoll }) {
    const player = players[myIdx];
    if (!player) return null;
    const hasCard = (player.jailFreeCards || 0) > 0;
    const canAfford = (player.money || 0) >= 50;

    return (
        <div className="board-popup modal-pop modal-center">
            <div className="emoji-large">🔒</div>
            <div className="section-title text-center margin-bottom-4">You&apos;re in Jail!</div>
            <div className="menu-subtitle text-center margin-bottom-12">
                Turn {(player.jailTurns || 0) + 1} of 3 • Choose an option:
            </div>
            <div className="flex-column gap-8 w-full">
                <button
                    onClick={onUseJailCard}
                    disabled={!hasCard}
                    className={`btn-action ${hasCard ? "btn-purple-bg" : "btn-gray-bg"}`}
                >
                    {hasCard ? "Use Get Out of Jail Free Card" : "No Jail Free Cards"}
                </button>
                <button
                    onClick={onPayJailFine}
                    disabled={!canAfford}
                    className={`btn-action ${canAfford ? "btn-warning-bg" : "btn-gray-bg"}`}
                >
                    {canAfford ? "Pay $50 Fine" : "Pay $50 Fine (Insufficient Funds)"}
                </button>
                <button onClick={onJailRoll} className="btn-action btn-success-bg">
                    Roll for Doubles
                </button>
            </div>
        </div>
    );
}

JailContent.propTypes = {
    players: PropTypes.arrayOf(PropTypes.shape({
        jailFreeCards: PropTypes.number,
        jailTurns: PropTypes.number,
        money: PropTypes.number,
    })).isRequired,
    myIdx: PropTypes.number.isRequired,
    onUseJailCard: PropTypes.func.isRequired,
    onPayJailFine: PropTypes.func.isRequired,
    onJailRoll: PropTypes.func.isRequired,
};

function BuyContent({ modal, rawPlayers, myIdx, onBuy, onPass }) {
    const space = SPACES[modal.spaceId];
    const p = rawPlayers[modal.playerIdx];
    const isMe = modal.playerIdx === myIdx;
    if (!space || !p) return null;

    const playerControls = (
        <div className="w-full">
            <div className="text-xs text-light text-center margin-bottom-10">
                Your balance: ${p.money.toLocaleString()}
            </div>
            <div className="flex-gap-8">
                <button
                    onClick={() => onBuy(modal.spaceId)}
                    disabled={p.money < space.price}
                    className={`btn-action half ${p.money >= space.price ? "btn-success-bg" : ""}`}
                >
                    Buy
                </button>
                <button onClick={onPass} className="btn-action half btn-danger-bg">
                    Pass
                </button>
            </div>
        </div>
    );

    const waitingMsg = (
        <p className="text-sm text-light text-center margin-0">
            {p.token} P{p.id + 1} is deciding...
        </p>
    );

    return (
        <div className="board-popup modal-pop modal-center">
            <div className="emoji-large">H</div>
            <div className="section-title text-center margin-bottom-2">{space.name}</div>
            {space.color && (
                <div className="color-bar" style={{ "--space-color": space.color }} />
            )}
            <div className="text-md text-center margin-bottom-10">
                Price: <strong className="weight-bold">${space.price}</strong>
            </div>
            {isMe ? playerControls : waitingMsg}
        </div>
    );
}

BuyContent.propTypes = {
    modal: PropTypes.shape({
        spaceId: PropTypes.number,
        playerIdx: PropTypes.number,
    }).isRequired,
    rawPlayers: PropTypes.arrayOf(PropTypes.shape({
        token: PropTypes.string,
        id: PropTypes.number,
        money: PropTypes.number,
    })).isRequired,
    myIdx: PropTypes.number.isRequired,
    onBuy: PropTypes.func.isRequired,
    onPass: PropTypes.func.isRequired,
};

function BuildContent({ modal, props, onBuildHouse, onDismiss }) {
    const space = SPACES[modal.spaceId];
    const prop = props[modal.spaceId];
    if (!space || !prop) return null;
    const houses = prop.houses || 0;
    const canBuild = !prop.hotel && modal.canBuild;

    let buildingLabel = "No buildings yet";
    if (prop.hotel) {
        buildingLabel = "Hotel built";
    } else if (houses > 0) {
        buildingLabel = `${houses} houses`;
    }

    const buildBtnLabel = houses >= 4 ? "Build Hotel" : "Build House";
    const buildBtnWidth = canBuild ? "half" : "w-full";
    const blockReason = prop.hotel ? "Max level!" : "Need full color group first.";

    return (
        <div className="board-popup modal-pop modal-center">
            <div className="section-title margin-bottom-4">{space.name}</div>
            {space.color && (
                <div className="color-bar" style={{ "--space-color": space.color }} />
            )}
            <div className="text-sm margin-bottom-8">{buildingLabel}</div>
            <div className="text-sm text-light margin-bottom-10">
                Build cost: ${space.houseCost}/house
            </div>
            <div className="flex-gap-8 w-full">
                {canBuild && (
                    <button
                        onClick={() => onBuildHouse(modal.spaceId)}
                        className="btn-action half btn-success-bg"
                    >
                        {buildBtnLabel}
                    </button>
                )}
                <button onClick={onDismiss} className={`btn-action ${buildBtnWidth} btn-gray-bg`}>
                    Close
                </button>
            </div>
            {!canBuild && (
                <p className="text-xs text-danger margin-top-8">{blockReason}</p>
            )}
        </div>
    );
}

BuildContent.propTypes = {
    modal: PropTypes.shape({
        spaceId: PropTypes.number,
        canBuild: PropTypes.bool,
    }).isRequired,
    props: PropTypes.objectOf(PropTypes.shape({
        hotel: PropTypes.bool,
        houses: PropTypes.number,
    })).isRequired,
    onBuildHouse: PropTypes.func.isRequired,
    onDismiss: PropTypes.func.isRequired,
};

function CardContent({ modal, isMyTurn, onDismiss }) {
    const icon = modal.title?.includes("Chance") ? "?" : "C";
    return (
        <div className="board-popup modal-pop modal-center">
            <div className="emoji-large">{icon}</div>
            <div className="section-title text-center margin-bottom-6">{modal.title}</div>
            <p className="text-md text-center style-italic margin-bottom-12">&quot;{modal.text}&quot;</p>
            {isMyTurn ? (
                <button onClick={onDismiss} className="btn-action btn-success-bg w-full">OK</button>
            ) : (
                <p className="text-xs text-light text-center margin-0">Waiting for current player...</p>
            )}
        </div>
    );
}

CardContent.propTypes = {
    modal: PropTypes.shape({
        title: PropTypes.string,
        text: PropTypes.string,
    }).isRequired,
    isMyTurn: PropTypes.bool.isRequired,
    onDismiss: PropTypes.func.isRequired,
};

function StealContent({ modal, props, rawPlayers, myIdx, eligibleStealTargets, onSteal, onDismiss }) {
    if (modal.type !== "steal") return null;
    return (
        <div className="board-popup modal-pop modal-center">
            <div className="section-title text-center margin-bottom-8">Steal a Property!</div>
            <p className="text-sm text-dim text-center margin-bottom-12">Pick an opponent&apos;s property to take for free:</p>
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
                    {eligibleStealTargets.length === 0 && (
                        <div className="text-xs text-dim italic text-center w-full">No properties available</div>
                    )}
                </div>
            </div>
            <button onClick={onDismiss} className="btn-action btn-gray-bg margin-top-8 w-full">Skip</button>
        </div>
    );
}

StealContent.propTypes = {
    modal: PropTypes.shape({ type: PropTypes.string }).isRequired,
    props: PropTypes.objectOf(PropTypes.shape({ owner: PropTypes.number })).isRequired,
    rawPlayers: PropTypes.arrayOf(PropTypes.shape({ token: PropTypes.string })).isRequired,
    myIdx: PropTypes.number.isRequired,
    eligibleStealTargets: PropTypes.arrayOf(PropTypes.number).isRequired,
    onSteal: PropTypes.func.isRequired,
    onDismiss: PropTypes.func.isRequired,
};

function RouletteContent({ modal, isMyTurn, onRouletteSpin }) {
    const isSpinning = Boolean(modal.isSpinning);
    const targetIdx = modal.targetIdx ?? 0;
    return (
        <div className="board-popup modal-pop modal-center roulette-modal">
            <div className="section-title text-center margin-bottom-6">Roulette Wheel</div>
            <p className="text-xs text-dim text-center margin-bottom-12">Test your luck!</p>
            <RouletteWheel
                outcomes={modal.options}
                spinning={isSpinning}
                targetIndex={targetIdx}
                onComplete={() => { if (isSpinning && isMyTurn) setTimeout(onRouletteSpin, 500); }}
            />
            <div className="margin-top-12 w-full">
                {isSpinning && (
                    <div className="text-md weight-bold text-success text-center">SPINNING...</div>
                )}
                {!isSpinning && isMyTurn && (
                    <button onClick={onRouletteSpin} className="btn-action btn-success-bg w-full">
                        SPIN NOW!
                    </button>
                )}
                {!isSpinning && !isMyTurn && (
                    <p className="text-xs text-light text-center margin-0">Waiting for current player to spin...</p>
                )}
            </div>
        </div>
    );
}

RouletteContent.propTypes = {
    modal: PropTypes.shape({
        isSpinning: PropTypes.bool,
        targetIdx: PropTypes.number,
        options: PropTypes.array,
    }).isRequired,
    isMyTurn: PropTypes.bool.isRequired,
    onRouletteSpin: PropTypes.func.isRequired,
};

function NotifyContent({ modal, isMyTurn, onDismiss }) {
    return (
        <div className="board-popup modal-pop modal-notify modal-center">
            <div className="section-title margin-bottom-4">{modal.title}</div>
            <div className="text-sm text-dim margin-bottom-12">{modal.text}</div>
            {isMyTurn ? (
                <button onClick={onDismiss} className="btn-action btn-success-bg w-full">OK</button>
            ) : (
                <p className="text-xs text-light text-center margin-0">Waiting for current player...</p>
            )}
        </div>
    );
}

NotifyContent.propTypes = {
    modal: PropTypes.shape({ title: PropTypes.string, text: PropTypes.string }).isRequired,
    isMyTurn: PropTypes.bool.isRequired,
    onDismiss: PropTypes.func.isRequired,
};

// ─────────────────────────────────────────────────────────────────────────────
// BoardPopup - in-game overlay for buy / jail / card / steal / swap / notify
// ─────────────────────────────────────────────────────────────────────────────

const DISMISSABLE_ON_BACKDROP = new Set(["notify", "card", "build"]);

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

    if (modal.type === "jail") {
        content = (
            <JailContent
                players={players}
                myIdx={myIdx}
                onUseJailCard={onUseJailCard}
                onPayJailFine={onPayJailFine}
                onJailRoll={onJailRoll}
            />
        );
    } else if (modal.type === "buy") {
        content = (
            <BuyContent
                modal={modal}
                rawPlayers={rawPlayers}
                myIdx={myIdx}
                onBuy={onBuy}
                onPass={onPass}
            />
        );
    } else if (modal.type === "build") {
        content = (
            <BuildContent
                modal={modal}
                props={props}
                onBuildHouse={onBuildHouse}
                onDismiss={onDismiss}
            />
        );
    } else if (modal.type === "card") {
        content = (
            <CardContent modal={modal} isMyTurn={isMyTurn} onDismiss={onDismiss} />
        );
    } else if (modal.type === "steal") {
        content = (
            <StealContent
                modal={modal}
                props={props}
                rawPlayers={rawPlayers}
                myIdx={myIdx}
                eligibleStealTargets={eligibleStealTargets}
                onSteal={onSteal}
                onDismiss={onDismiss}
            />
        );
    } else if (modal.type === "swap") {
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
    } else if (modal.type === "roulette") {
        content = (
            <RouletteContent modal={modal} isMyTurn={isMyTurn} onRouletteSpin={onRouletteSpin} />
        );
    } else if (modal.type === "notify") {
        content = (
            <NotifyContent modal={modal} isMyTurn={isMyTurn} onDismiss={onDismiss} />
        );
    }

    if (!content) return null;

    const backdropDismiss = DISMISSABLE_ON_BACKDROP.has(modal.type) ? onDismiss : undefined;

    return (
        <>
            <button
                className="modal-backdrop"
                onClick={backdropDismiss}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") backdropDismiss(); }}
                aria-label="Dismiss modal"
            />
            {content}
        </>
    );
}

BoardPopup.propTypes = {
    modal: PropTypes.shape({
        type: PropTypes.string,
        spaceId: PropTypes.number,
        playerIdx: PropTypes.number,
        canBuild: PropTypes.bool,
        title: PropTypes.string,
        text: PropTypes.string,
        isSpinning: PropTypes.bool,
        targetIdx: PropTypes.number,
        options: PropTypes.array,
    }),
    players: PropTypes.arrayOf(PropTypes.shape({
        jailFreeCards: PropTypes.number,
        jailTurns: PropTypes.number,
        money: PropTypes.number,
    })).isRequired,
    myIdx: PropTypes.number.isRequired,
    isMyTurn: PropTypes.bool.isRequired,
    onBuy: PropTypes.func.isRequired,
    onPass: PropTypes.func.isRequired,
    onDismiss: PropTypes.func.isRequired,
    onUseJailCard: PropTypes.func.isRequired,
    onPayJailFine: PropTypes.func.isRequired,
    onJailRoll: PropTypes.func.isRequired,
    onSteal: PropTypes.func.isRequired,
    onSwap: PropTypes.func.isRequired,
    onBuildHouse: PropTypes.func.isRequired,
    onRouletteSpin: PropTypes.func.isRequired,
    eligibleStealTargets: PropTypes.arrayOf(PropTypes.number).isRequired,
    eligibleSwapMine: PropTypes.arrayOf(PropTypes.number).isRequired,
    props: PropTypes.objectOf(PropTypes.shape({ owner: PropTypes.number })).isRequired,
    rawPlayers: PropTypes.arrayOf(PropTypes.shape({
        token: PropTypes.string,
        id: PropTypes.number,
        money: PropTypes.number,
    })).isRequired,
};
