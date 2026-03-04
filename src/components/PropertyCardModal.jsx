import { SPACES, COLOR_GROUPS } from "../constants";

// Small helper row used inside the rent table
function RentRow({ label, amount, active, note, icon, hotel }) {
  return (
    <div className={`prop-rent-row${active ? " highlight" : ""}`}>
      <span
        className="label flex align-center gap-4"
      >
        {icon && <span className="text-xs">{icon}</span>}
        {label}
        {note && (
          <span className="text-xs text-dim"> {note}</span>
        )}
        {active && (
          <span
            className="text-xs text-warning weight-bold margin-left-2"
          >
            ← NOW
          </span>
        )}
      </span>
      <span
        className={`amount ${hotel ? "text-purple" : active ? "text-success-dark" : "text-black"}`}
      >
        {typeof amount === "number" ? `$${amount}` : amount}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PropertyCardModal — Full Monopoly-style deed card overlay
// ─────────────────────────────────────────────────────────────────────────────
export default function PropertyCardModal({
  spaceId,
  prop,
  players,
  myIdx,
  isMyTurn,
  onClose,
  onBuild,
  onBuy,
  allProps,
  playerIsOnSpace,
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
  const hasMonopoly =
    space.type === "property" &&
    group.length > 0 &&
    group.every((id) => allProps[id]?.owner === myIdx);

  const canAfford = me && space.houseCost && me.money >= space.houseCost;

  const mortgage = space.price ? Math.floor(space.price / 2) : null;
  const currentLevel = hasHotel ? 5 : houses;

  const isRailroad = space.type === "railroad";
  const isUtility = space.type === "utility";
  const isColorProp = space.type === "property";

  const headerBg = space.color || "#1a1a1a";
  const headerLight = ["#87CEEB", "#fef9c3", "#ffedd5", "#ffffff"].includes(
    space.color,
  );

  return (
    <div
      className="prop-card-overlay"
      onClick={onClose}
      style={{ "--prop-color": headerBg }}
    >
      <div className="prop-card" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className={`prop-card-close ${headerLight ? "light-theme" : "dark-theme"}`}
        >
          ✕
        </button>

        {/* Deed header */}
        <div className={`prop-card-header ${headerLight ? "light-text" : "dark-text"}`}>
          <div className="prop-card-type">
            {isColorProp
              ? "Title Deed"
              : isRailroad
                ? "Railroad"
                : isUtility
                  ? "Utility"
                  : ""}
          </div>
          <div className="prop-card-title">
            {space.name}
          </div>
          {isOwned && owner && (
            <div className="prop-card-owner-chip">
              <div
                className="prop-card-owner-dot"
                style={{ "--owner-color": owner.color }}
              />
              <span className="prop-card-owner-text">
                {owner.token} P{owner.id + 1}
                {isMine ? " (You)" : ""}
              </span>
              {hasMonopoly && isMine && (
                <span className="prop-card-monopoly-badge">
                  ★ MONOPOLY
                </span>
              )}
            </div>
          )}
          {!isOwned && (
            <div className="prop-card-for-sale">
              For Sale
            </div>
          )}
        </div>

        {/* Price banner */}
        {space.price && (
          <div className="prop-card-price-banner">
            <span className="prop-card-price-value">
              ${space.price}
            </span>
            <span className="prop-card-price-label">purchase price</span>
          </div>
        )}

        {/* Rent table */}
        <div className="prop-card-body padding-top-8">
          {isColorProp && space.rent && (
            <>
              <RentRow
                label="RENT"
                amount={space.rent[0]}
                active={currentLevel === 0 && isOwned}
              />
              <RentRow
                label="With Color Set"
                amount={space.rent[0] * 2}
                active={false}
                note="(monopoly)"
              />
              <RentRow
                label="With 1 House"
                amount={space.rent[1]}
                active={currentLevel === 1}
                icon="🏠"
              />
              <RentRow
                label="With 2 Houses"
                amount={space.rent[2]}
                active={currentLevel === 2}
                icon="🏠🏠"
              />
              <RentRow
                label="With 3 Houses"
                amount={space.rent[3]}
                active={currentLevel === 3}
                icon="🏠🏠🏠"
              />
              <RentRow
                label="With 4 Houses"
                amount={space.rent[4]}
                active={currentLevel === 4}
                icon="🏠×4"
              />
              <RentRow
                label="With HOTEL"
                amount={space.rent[5]}
                active={currentLevel === 5}
                icon="🏨"
                hotel
              />
            </>
          )}
          {isRailroad && space.rent && (
            <>
              <RentRow
                label="Rent (1 railroad)"
                amount={space.rent[0]}
                active={isOwned}
              />
              <RentRow label="Rent (2 railroads)" amount={space.rent[1]} />
              <RentRow label="Rent (3 railroads)" amount={space.rent[2]} />
              <RentRow label="Rent (4 railroads)" amount={space.rent[3]} />
            </>
          )}
          {isUtility && (
            <>
              <RentRow
                label="Rent (1 utility)"
                amount="4× dice roll"
                active={isOwned}
              />
              <RentRow label="Rent (2 utilities)" amount="10× dice roll" />
            </>
          )}
        </div>

        {/* Build section */}
        {isColorProp && space.houseCost && (
          <div className="prop-build-section">
            <div className="prop-build-info">
              <span className="text-sm text-dim">
                🏠 House cost: <strong>${space.houseCost}</strong>
              </span>
              {isOwned && (
                <span className="text-md">
                  {hasHotel ? "🏨" : houses > 0 ? "🏠".repeat(houses) : "—"}
                </span>
              )}
            </div>
            {isMine && !playerIsOnSpace && !hasHotel && (
              <div className="prop-lock-msg">
                🔒 You can only build here when you land on this property.
              </div>
            )}
            {isMine && playerIsOnSpace && !hasMonopoly && (
              <div className="mono-lock-msg">
                Own all {group.length} properties in this group to build.
              </div>
            )}
            {onBuild && isMyTurn && !hasHotel && (
              <button
                onClick={() => onBuild(spaceId)}
                disabled={!canAfford}
                className={`btn-prop-action ${canAfford ? "btn-success-bg" : "btn-gray-bg"}`}
              >
                {houses >= 4
                  ? `🏨 Build Hotel — $${space.houseCost}`
                  : `🏠 Build House — $${space.houseCost}`}
              </button>
            )}
            {isMine && hasHotel && (
              <div className="hotel-built-msg">
                🏨 Hotel built — maximum level reached!
              </div>
            )}
            {onBuild && isMyTurn && !canAfford && !hasHotel && (
              <div className="no-funds-msg">
                Not enough funds — need ${space.houseCost}
              </div>
            )}
          </div>
        )}

        {/* Buy button */}
        {!isOwned && space.price && (
          <div className="buy-footer">
            {onBuy ? (
              <button
                onClick={onBuy}
                disabled={!me || me.money < space.price}
                className={`btn-prop-action ${(me && me.money >= space.price) ? "btn-success-bg" : "btn-gray-bg"}`}
              >
                Buy for ${space.price}
              </button>
            ) : (
              <div className="buy-status-msg">
                {!isMyTurn
                  ? "Not your turn"
                  : !playerIsOnSpace
                    ? "🔒 Land on this property to buy it"
                    : "Already owned"}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="prop-card-footer">
          <span>
            Mortgage value: <strong>${mortgage ?? "—"}</strong>
          </span>
          {space.houseCost && (
            <span>
              House cost: <strong>${space.houseCost}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
