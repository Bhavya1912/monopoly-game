import React from "react";
import BoardCell from "./BoardCell";
import DieFace from "./DieFace";
import TurnTimer from "./TurnTimer";
import BoardPopup from "./BoardPopup";
import { CELL_POSITIONS } from "../constants";

export default function BoardView({
  cols,
  rows,
  displayPlayers,
  props,
  selectedSpace,
  setSelectedSpace,
  flashCell,
  bouncingPlayer,
  gameState,
  diceArr,
  isRolling,
  diceLanding,
  gs_s,
  isMyTurn,
  handleTimerExpire,
  modal,
  rawPlayers,
  myIdx,
  buyProperty,
  pushState,
  dismissModal,
  handleUseJailCard,
  handlePayJailFine,
  handleJailRoll,
  handleSteal,
  handleSwap,
  buildHouse,
  handleRouletteSpin,
  eligibleStealTargets,
  eligibleSwapMine,
}) {
  return (
    <div className="board-wrap">
      <div
        className="board-grid"
        style={{
          "--gtc": cols.map((w) => `${w}px`).join(" "),
          "--gtr": rows.map((h) => `${h}px`).join(" "),
        }}
      >
        {CELL_POSITIONS.map(({ id, gridRow, gridColumn }) => (
          <div
            key={id}
            className="flex cell-container"
            style={{ "--row": gridRow, "--col": gridColumn }}
          >
            <BoardCell
              spaceId={id}
              players={displayPlayers}
              properties={props}
              isSelected={selectedSpace === id}
              width={cols[gridColumn - 1]}
              height={rows[gridRow - 1]}
              onClick={() => {
                setSelectedSpace((prev) => (prev === id ? null : id));
              }}
              flashCell={flashCell}
              bouncingPlayer={bouncingPlayer}
            />
          </div>
        ))}
        {/* Center */}
        <div className="board-center">
          <div className="board-center-decals">
            <div className="decal community-decal">
              <span className="decal-icon">🎁</span>
              <span className="decal-label">COMMUNITY CHEST</span>
            </div>
            <div className="decal chance-decal">
              <span className="decal-icon">?</span>
              <span className="decal-label">CHANCE</span>
            </div>
          </div>
          <div className="board-title">MONOPOLY</div>
          <div className="free-parking-label">🅿️ ${gameState.freePot || 0}</div>
          <div className="flex-gap-12">
            {diceArr.map((d, i) => (
              <DieFace
                key={i}
                value={d}
                shaking={isRolling}
                landing={diceLanding && !isRolling}
              />
            ))}
          </div>
          {gs_s.turnTimer > 0 && isMyTurn && (
            <div className="timer-container">
              <TurnTimer
                turnStartTime={gameState.turnStartTime || 0}
                limit={gs_s.turnTimer}
                onExpire={handleTimerExpire}
                isMyTurn={isMyTurn}
              />
            </div>
          )}
        </div>
      </div>

      {/* Board-level popup */}
      <BoardPopup
        modal={modal}
        players={rawPlayers}
        myIdx={myIdx}
        isMyTurn={isMyTurn}
        onBuy={buyProperty}
        onPass={() => pushState({ ...gameState, modal: null })}
        onDismiss={dismissModal}
        onUseJailCard={handleUseJailCard}
        onPayJailFine={handlePayJailFine}
        onJailRoll={handleJailRoll}
        onSteal={handleSteal}
        onSwap={handleSwap}
        onBuildHouse={buildHouse}
        onRouletteSpin={handleRouletteSpin}
        eligibleStealTargets={eligibleStealTargets}
        eligibleSwapMine={eligibleSwapMine}
        props={props}
        rawPlayers={rawPlayers}
      />
    </div>
  );
}
