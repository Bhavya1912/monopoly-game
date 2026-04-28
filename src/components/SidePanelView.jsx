import PropTypes from "prop-types";
import AnalyticsDashboard from "./AnalyticsDashboard";
import GameLog from "./GameLog";
import ChatBox from "./ChatBox";
import { SPACES, PLAYER_COLORS, COLOR_GROUPS } from "../constants";

export default function SidePanelView({
  me,
  myIdx,
  isMyTurn,
  gameState,
  processing,
  sellToPay,
  handleRoll,
  endTurn,
  rawPlayers,
  wealthSeries,
  wealthMode,
  setWealthMode,
  chartMin,
  chartMax,
  myGroupChances,
  playerProbabilities,
  riskByPlayer,
  colorSetInsights,
  dangerousZones,
  myProps,
  props,
  buildHouse,
  isLocalGame,
  tradeDraft,
  setTradeDraft,
  submitTradeOffer,
  audioSettings,
  setAudioSettings,
  logArr,
  displayedChat,
  chatInput,
  setChatInput,
  sendChat,
  chatEndRef,
  isPhone,
}) {
  return (
    <div className="right-panel">
      <div className="strategy-panel">
        {/* Controls */}
        {me && !me.bankrupt && (
          <div className="strategy-card-me">
            <div className="strategy-me-header">
              <span className="text-xl">{me.token}</span>
              <div className="flex-1">
                <div className="flex-column">
                  <div className={`text-md weight-bold player-${myIdx}-text`}>
                    You (P{myIdx + 1})
                  </div>
                  <div className="text-sm weight-bold text-black">
                    ${me.money.toLocaleString()}
                  </div>
                  {(me.jailFreeCards || 0) > 0 && (
                    <div className="text-xs text-purple">
                      🃏 Jail Free ×{me.jailFreeCards}
                    </div>
                  )}
                  {(me.doubleRentTurns || 0) > 0 && (
                    <div className="text-xs text-orange">
                      💰 Double rent ×{me.doubleRentTurns}
                    </div>
                  )}
                  {(me.rentImmuneTurns || 0) > 0 && (
                    <div className="text-xs text-success-dark">🛡️ Rent immune</div>
                  )}
                  {(me.frozenTurns || 0) > 0 && (
                    <div className="text-xs text-blue">
                      ❄️ Frozen {me.frozenTurns} turn(s)
                    </div>
                  )}
                </div>
              </div>
              {me.inJail && <span className="jail-badge">🔒 JAIL</span>}
            </div>
            <div className="flex-gap-6 flex-wrap">
              <button
                onClick={handleRoll}
                disabled={!isMyTurn || gameState.rolled || processing || !!sellToPay}
                className={`btn-roll ${!isMyTurn || gameState.rolled || processing || sellToPay ? "btn-dim" : "btn-success"}`}
              >
                🎲 Roll
              </button>
              <button
                onClick={endTurn}
                disabled={!isMyTurn || !gameState.rolled || processing || !!sellToPay}
                className={`btn-end ${!isMyTurn || !gameState.rolled || processing || sellToPay ? "" : "btn-end-active"}`}
              >
                End →
              </button>
            </div>
          </div>
        )}

        {/* Real-time Analytics Dashboard */}
        <AnalyticsDashboard
          rawPlayers={rawPlayers}
          wealthSeries={wealthSeries}
          wealthMode={wealthMode}
          setWealthMode={setWealthMode}
          chartMin={chartMin}
          chartMax={chartMax}
          myGroupChances={myGroupChances}
          playerProbabilities={playerProbabilities}
          riskByPlayer={riskByPlayer}
          colorSetInsights={colorSetInsights}
          dangerousZones={dangerousZones}
        />
      </div>

      <div className="details-panel">
        {/* My Properties panel */}
        {myProps.length > 0 && (
          <div className="property-list-card">
            <div className="property-list-title">🏠 Your Properties</div>
            <div className="property-list-scroll">
              {myProps.map(([id, prop]) => {
                const space = SPACES[+id];
                if (!space) return null;
                const group = COLOR_GROUPS[space.color] || [];
                const hasMonopoly =
                  space.type === "property" &&
                  group.every((sid) => props[sid]?.owner === myIdx);
                const playerOnThisProp = me?.position === +id;
                return (
                  <div
                    key={id}
                    className={`property-item-row ${hasMonopoly ? "has-monopoly" : "no-monopoly"}`}
                    style={{ "--space-color": space.color }}
                  >
                    {space.color && <div className="color-dot" />}
                    <span className="flex-1 ellipsis">{space.name}</span>
                    {hasMonopoly && <span className="mono-badge weight-bold">MONO</span>}
                    <span>
                      {prop.hotel && "🏨"}
                      {!prop.hotel && prop.houses > 0 && "🏠".repeat(prop.houses)}
                    </span>
                    {hasMonopoly && !prop.hotel && isMyTurn && playerOnThisProp && (
                      <button
                        onClick={() => buildHouse(+id)}
                        className="btn-build-plus"
                      >
                        +🏠
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLocalGame && (
          <div className="analytics-card">
            <div className="card-title-tiny margin-bottom-6">🤝 Trade Proposal (AI)</div>
            <div className="text-xs text-dim margin-bottom-6">
              Offer one of your properties. Request AI property and/or cash.
            </div>
            <div className="flex column-gap-6 row-gap-6 flex-wrap">
              <select
                value={tradeDraft.offerPropertyId}
                onChange={(e) =>
                  setTradeDraft((p) => ({ ...p, offerPropertyId: e.target.value }))
                }
                className="chat-input-field"
              >
                <option value="">You Offer: property</option>
                {myProps.map(([id]) => (
                  <option key={`o-${id}`} value={id}>
                    {SPACES[+id]?.name}
                  </option>
                ))}
              </select>
              <select
                value={tradeDraft.requestPropertyId}
                onChange={(e) =>
                  setTradeDraft((p) => ({ ...p, requestPropertyId: e.target.value }))
                }
                className="chat-input-field"
              >
                <option value="">You Request: property (optional)</option>
                {Object.entries(props)
                  .filter(([, p]) => p && p.owner !== myIdx)
                  .map(([id]) => (
                    <option key={`r-${id}`} value={id}>
                      {SPACES[+id]?.name}
                    </option>
                  ))}
              </select>
              <input
                type="number"
                min={0}
                value={tradeDraft.requestCash}
                onChange={(e) =>
                  setTradeDraft((p) => ({
                    ...p,
                    requestCash: Number(e.target.value || 0),
                  }))
                }
                placeholder="Cash request"
                className="chat-input-field"
              />
              <button
                onClick={submitTradeOffer}
                disabled={!tradeDraft.offerPropertyId}
                className={`btn-chat-go ${tradeDraft.offerPropertyId ? "btn-success" : "btn-dim"}`}
              >
                Send Offer
              </button>
            </div>
          </div>
        )}

        <div className="analytics-card">
          <div className="card-title-tiny margin-bottom-6">🔊 Audio Settings</div>
          <label className="text-xs text-dim">
            Master Volume: {Math.round(audioSettings.masterVolume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={audioSettings.masterVolume}
            onChange={(e) =>
              setAudioSettings((s) => ({ ...s, masterVolume: +e.target.value }))
            }
          />
          <label className="text-xs text-dim">
            Music Volume: {Math.round(audioSettings.musicVolume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={audioSettings.musicVolume}
            onChange={(e) =>
              setAudioSettings((s) => ({ ...s, musicVolume: +e.target.value }))
            }
          />
          <label className="text-xs text-dim">
            Effects Volume: {Math.round(audioSettings.effectsVolume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={audioSettings.effectsVolume}
            onChange={(e) =>
              setAudioSettings((s) => ({ ...s, effectsVolume: +e.target.value }))
            }
          />
          <label className="text-xs text-dim flex-gap-8 align-center margin-top-6">
            <input
              type="checkbox"
              checked={audioSettings.muted}
              onChange={(e) =>
                setAudioSettings((s) => ({ ...s, muted: e.target.checked }))
              }
            />{" "}
            Mute all
          </label>
        </div>

        {/* All Properties */}
        <div className="all-props-box">
          <div className="property-list-title">🗺️ All Properties</div>
          {Object.keys(props).length === 0 ? (
            <div className="chart-desc text-center">None sold yet</div>
          ) : (
            Object.entries(props).map(([id, prop]) => {
              if (!prop) return null;
              const space = SPACES[+id];
              if (!space) return null;
              const ownerColor = PLAYER_COLORS[prop.owner] || "var(--slate-400)";
              return (
                <div
                  key={id}
                  className="property-item-row owner-styled-row"
                  style={{
                    "--owner-bg": `${ownerColor}18`,
                    "--owner-border": `${ownerColor}44`,
                  }}
                >
                  {space.color && <div className="cell-owner-dot static-dot" />}
                  <span className="flex-1 ellipsis">{space.name}</span>
                  <span>{rawPlayers[prop.owner]?.token || "?"}</span>
                  {prop.hotel && <span>🏨</span>}
                  {!prop.hotel && (prop.houses || 0) > 0 && (
                    <span>{"🏠".repeat(prop.houses)}</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Log */}
        <GameLog logArr={logArr} />

        {/* Chat (Desktop) */}
        {!isPhone && (
          <ChatBox
            isLocalGame={isLocalGame}
            displayedChat={displayedChat}
            myIdx={myIdx}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendChat={sendChat}
            chatEndRef={chatEndRef}
          />
        )}
      </div>
    </div>
  );
}

SidePanelView.propTypes = {
  me: PropTypes.shape({
    token: PropTypes.string,
    money: PropTypes.number,
    bankrupt: PropTypes.bool,
    jailFreeCards: PropTypes.number,
    doubleRentTurns: PropTypes.number,
    rentImmuneTurns: PropTypes.number,
    frozenTurns: PropTypes.number,
    inJail: PropTypes.bool,
    position: PropTypes.number,
  }),
  myIdx: PropTypes.number,
  isMyTurn: PropTypes.bool.isRequired,
  gameState: PropTypes.shape({
    rolled: PropTypes.bool,
  }).isRequired,
  processing: PropTypes.bool.isRequired,
  sellToPay: PropTypes.object,
  handleRoll: PropTypes.func.isRequired,
  endTurn: PropTypes.func.isRequired,
  rawPlayers: PropTypes.array.isRequired,
  wealthSeries: PropTypes.array.isRequired,
  wealthMode: PropTypes.string.isRequired,
  setWealthMode: PropTypes.func.isRequired,
  chartMin: PropTypes.number.isRequired,
  chartMax: PropTypes.number.isRequired,
  myGroupChances: PropTypes.array.isRequired,
  playerProbabilities: PropTypes.array.isRequired,
  riskByPlayer: PropTypes.array.isRequired,
  colorSetInsights: PropTypes.array.isRequired,
  dangerousZones: PropTypes.array.isRequired,
  myProps: PropTypes.array.isRequired,
  props: PropTypes.object.isRequired,
  buildHouse: PropTypes.func.isRequired,
  isLocalGame: PropTypes.bool.isRequired,
  tradeDraft: PropTypes.shape({
    offerPropertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    requestPropertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    requestCash: PropTypes.number,
  }).isRequired,
  setTradeDraft: PropTypes.func.isRequired,
  submitTradeOffer: PropTypes.func.isRequired,
  audioSettings: PropTypes.shape({
    masterVolume: PropTypes.number,
    musicVolume: PropTypes.number,
    effectsVolume: PropTypes.number,
    muted: PropTypes.bool,
  }).isRequired,
  setAudioSettings: PropTypes.func.isRequired,
  logArr: PropTypes.array.isRequired,
  displayedChat: PropTypes.array.isRequired,
  chatInput: PropTypes.string.isRequired,
  setChatInput: PropTypes.func.isRequired,
  sendChat: PropTypes.func.isRequired,
  chatEndRef: PropTypes.object.isRequired,
  isPhone: PropTypes.bool.isRequired,
};

SidePanelView.defaultProps = {
  me: null,
  myIdx: null,
  sellToPay: null,
};
