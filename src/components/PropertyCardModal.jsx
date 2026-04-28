import PropTypes from "prop-types";
import { SPACES, COLOR_GROUPS } from "../constants";

// Small helper row used inside the rent table
function RentRow({ label, amount, active, note, icon, hotel }) {
  let amountClass = "text-black";
  if (hotel) {
    amountClass = "text-purple";
  } else if (active) {
    amountClass = "text-success-dark";
  }

  return (
    <div className={`prop-rent-row${active ? " highlight" : ""}`}>
      <span className="label flex align-center gap-4">
        {icon && <span className="text-xs">{icon}</span>}
        {label}
        {note && <span className="text-xs text-dim"> {note}</span>}
        {active && (
          <span className="text-xs text-warning weight-bold margin-left-2">
            ← NOW
          </span>
        )}
      </span>
      <span className={`amount ${amountClass}`}>
        {typeof amount === "number" ? `$${amount}` : amount}
      </span>
    </div>
  );
}

RentRow.propTypes = {
  label: PropTypes.string.isRequired,
  amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  active: PropTypes.bool,
  note: PropTypes.string,
  icon: PropTypes.string,
  hotel: PropTypes.bool,
};

RentRow.defaultProps = {
  active: false,
  note: null,
  icon: null,
  hotel: false,
};

// Sub-components to reduce complexity

function DeedHeader({ deedTypeLabel, name, isOwned, owner, isMine, hasMonopoly, isBuyable, headerLight }) {
  return (
    <div className={`prop-card-header ${headerLight ? "light-text" : "dark-text"}`}>
      <div className="prop-card-type">{deedTypeLabel}</div>
      <div className="prop-card-title">{name}</div>
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
            <span className="prop-card-monopoly-badge">★ MONOPOLY</span>
          )}
        </div>
      )}
      {!isOwned && isBuyable && (
        <div className="prop-card-for-sale">For Sale</div>
      )}
    </div>
  );
}

DeedHeader.propTypes = {
  deedTypeLabel: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  isOwned: PropTypes.bool.isRequired,
  owner: PropTypes.object,
  isMine: PropTypes.bool.isRequired,
  hasMonopoly: PropTypes.bool.isRequired,
  isBuyable: PropTypes.bool.isRequired,
  headerLight: PropTypes.bool.isRequired,
};

function PriceBanner({ price }) {
  if (!price) return null;
  return (
    <div className="prop-card-price-banner">
      <span className="prop-card-price-value">${price}</span>
      <span className="prop-card-price-label">purchase price</span>
    </div>
  );
}

PriceBanner.propTypes = {
  price: PropTypes.number,
};

function RentTable({ isColorProp, isRailroad, isUtility, space, currentLevel, isOwned }) {
  if (isColorProp && space.rent) {
    return (
      <div className="prop-card-body padding-top-8">
        <RentRow label="RENT" amount={space.rent[0]} active={currentLevel === 0 && isOwned} />
        <RentRow label="With Color Set" amount={space.rent[0] * 2} active={false} note="(monopoly)" />
        <RentRow label="With 1 House" amount={space.rent[1]} active={currentLevel === 1} icon="🏠" />
        <RentRow label="With 2 Houses" amount={space.rent[2]} active={currentLevel === 2} icon="🏠🏠" />
        <RentRow label="With 3 Houses" amount={space.rent[3]} active={currentLevel === 3} icon="🏠🏠🏠" />
        <RentRow label="With 4 Houses" amount={space.rent[4]} active={currentLevel === 4} icon="🏠×4" />
        <RentRow label="With HOTEL" amount={space.rent[5]} active={currentLevel === 5} icon="🏨" hotel />
      </div>
    );
  }
  if (isRailroad && space.rent) {
    return (
      <div className="prop-card-body padding-top-8">
        <RentRow label="Rent (1 railroad)" amount={space.rent[0]} active={isOwned} />
        <RentRow label="Rent (2 railroads)" amount={space.rent[1]} />
        <RentRow label="Rent (3 railroads)" amount={space.rent[2]} />
        <RentRow label="Rent (4 railroads)" amount={space.rent[3]} />
      </div>
    );
  }
  if (isUtility) {
    return (
      <div className="prop-card-body padding-top-8">
        <RentRow label="Rent (1 utility)" amount="4× dice roll" active={isOwned} />
        <RentRow label="Rent (2 utilities)" amount="10× dice roll" />
      </div>
    );
  }
  return null;
}

RentTable.propTypes = {
  isColorProp: PropTypes.bool.isRequired,
  isRailroad: PropTypes.bool.isRequired,
  isUtility: PropTypes.bool.isRequired,
  space: PropTypes.object.isRequired,
  currentLevel: PropTypes.number.isRequired,
  isOwned: PropTypes.bool.isRequired,
};

function BuildSection({ isColorProp, space, isOwned, isMine, playerIsOnSpace, hasHotel, hasMonopoly, houses, canAfford, onBuild, buildingStatusLabel, groupLength, spaceId, isMyTurn }) {
  if (!isColorProp || !space.houseCost) return null;

  return (
    <div className="prop-build-section">
      <div className="prop-build-info">
        <span className="text-sm text-dim">
          🏠 House cost: <strong>${space.houseCost}</strong>
        </span>
        {isOwned && (
          <span className="text-md">{buildingStatusLabel}</span>
        )}
      </div>
      {isMine && !playerIsOnSpace && !hasHotel && (
        <div className="prop-lock-msg">
          🔒 You can only build here when you land on this property.
        </div>
      )}
      {isMine && playerIsOnSpace && !hasMonopoly && (
        <div className="mono-lock-msg">
          Own all {groupLength} properties in this group to build.
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
  );
}

BuildSection.propTypes = {
  isColorProp: PropTypes.bool.isRequired,
  space: PropTypes.object.isRequired,
  isOwned: PropTypes.bool.isRequired,
  isMine: PropTypes.bool.isRequired,
  playerIsOnSpace: PropTypes.bool.isRequired,
  hasHotel: PropTypes.bool.isRequired,
  hasMonopoly: PropTypes.bool.isRequired,
  houses: PropTypes.number.isRequired,
  canAfford: PropTypes.bool.isRequired,
  onBuild: PropTypes.func,
  buildingStatusLabel: PropTypes.string.isRequired,
  groupLength: PropTypes.number.isRequired,
  spaceId: PropTypes.number.isRequired,
  isMyTurn: PropTypes.bool.isRequired,
};

function BuyFooter({ isOwned, price, onBuy, me, buyStatusMsg }) {
  if (isOwned || !price) return null;

  return (
    <div className="buy-footer">
      {onBuy ? (
        <button
          onClick={onBuy}
          disabled={!me || me.money < price}
          className={`btn-prop-action ${me && me.money >= price ? "btn-success-bg" : "btn-gray-bg"}`}
        >
          Buy for ${price}
        </button>
      ) : (
        <div className="buy-status-msg">{buyStatusMsg}</div>
      )}
    </div>
  );
}

BuyFooter.propTypes = {
  isOwned: PropTypes.bool.isRequired,
  price: PropTypes.number,
  onBuy: PropTypes.func,
  me: PropTypes.object,
  buyStatusMsg: PropTypes.string.isRequired,
};

function DeedFooter({ isBuyable, mortgage, houseCost }) {
  return (
    <div className="prop-card-footer">
      {isBuyable ? (
        <>
          <span>Mortgage value: <strong>${mortgage ?? "—"}</strong></span>
          {Boolean(houseCost) && (
            <span>House cost: <strong>${houseCost}</strong></span>
          )}
        </>
      ) : (
        <span>Event Space</span>
      )}
    </div>
  );
}

DeedFooter.propTypes = {
  isBuyable: PropTypes.bool.isRequired,
  mortgage: PropTypes.number,
  houseCost: PropTypes.number,
};

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

  const isOwned = prop != null;
  const owner = isOwned ? players[prop.owner] : null;
  const isMine = isOwned && prop.owner === myIdx;
  const me = players[myIdx];
  const houses = prop?.houses || 0;
  const hasHotel = prop?.hotel || false;

  const group = COLOR_GROUPS[space.color] || [];
  const hasMonopoly =
    space.type === "property" &&
    group.length > 0 &&
    group.every((id) => allProps[id]?.owner === myIdx);

  const canAfford = Boolean(me && space.houseCost && me.money >= space.houseCost);
  const mortgage = space.price ? Math.floor(space.price / 2) : null;
  const currentLevel = hasHotel ? 5 : houses;

  const isRailroad = space.type === "railroad";
  const isUtility = space.type === "utility";
  const isColorProp = space.type === "property";
  const isBuyable = isColorProp || isRailroad || isUtility;

  const headerLight = [
    "var(--prop-light-blue)",
    "var(--bg-jail)",
    "var(--bg-chance)",
    "var(--bg-primary)",
  ].includes(space.color);

  // Extract labels
  let deedTypeLabel = "";
  if (isColorProp) deedTypeLabel = "Title Deed";
  else if (isRailroad) deedTypeLabel = "Railroad";
  else if (isUtility) deedTypeLabel = "Utility";

  let buildingStatusLabel = "No buildings yet";
  if (hasHotel) buildingStatusLabel = "🏨";
  else if (houses > 0) buildingStatusLabel = "🏠".repeat(houses);

  let buyStatusMsg = "Already owned";
  if (!isMyTurn) buyStatusMsg = "Not your turn";
  else if (!playerIsOnSpace) buyStatusMsg = "🔒 Land on this property to buy it";

  const handleBackdropEvent = (e) => {
    if (e.key === "Enter" || e.key === " " || e.type === "click") {
      onClose();
    }
  };

  return (
    <button
      className="prop-card-overlay"
      onClick={handleBackdropEvent}
      onKeyDown={handleBackdropEvent}
      aria-label="Close property details"
      style={{ "--prop-color": space.color || "var(--slate-900)" }}
    >
      <div
        className="prop-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="none"
      >
        <button
          onClick={onClose}
          className={`prop-card-close ${headerLight ? "light-theme" : "dark-theme"}`}
        >
          ✕
        </button>

        <DeedHeader
          deedTypeLabel={deedTypeLabel}
          name={space.name}
          isOwned={isOwned}
          owner={owner}
          isMine={isMine}
          hasMonopoly={hasMonopoly}
          isBuyable={isBuyable}
          headerLight={headerLight}
        />

        <PriceBanner price={space.price} />

        <RentTable
          isColorProp={isColorProp}
          isRailroad={isRailroad}
          isUtility={isUtility}
          space={space}
          currentLevel={currentLevel}
          isOwned={isOwned}
        />

        <BuildSection
          isColorProp={isColorProp}
          space={space}
          isOwned={isOwned}
          isMine={isMine}
          playerIsOnSpace={playerIsOnSpace}
          hasHotel={hasHotel}
          hasMonopoly={hasMonopoly}
          houses={houses}
          canAfford={canAfford}
          onBuild={onBuild}
          buildingStatusLabel={buildingStatusLabel}
          groupLength={group.length}
          spaceId={spaceId}
          isMyTurn={isMyTurn}
        />

        <BuyFooter
          isOwned={isOwned}
          price={space.price}
          onBuy={onBuy}
          me={me}
          buyStatusMsg={buyStatusMsg}
        />

        <DeedFooter
          isBuyable={isBuyable}
          mortgage={mortgage}
          houseCost={space.houseCost}
        />
      </div>
    </button>
  );
}

PropertyCardModal.propTypes = {
  spaceId: PropTypes.number.isRequired,
  prop: PropTypes.shape({
    owner: PropTypes.number,
    houses: PropTypes.number,
    hotel: PropTypes.bool,
  }),
  players: PropTypes.arrayOf(
    PropTypes.shape({
      token: PropTypes.string,
      color: PropTypes.string,
      id: PropTypes.number,
      money: PropTypes.number,
    }),
  ).isRequired,
  myIdx: PropTypes.number.isRequired,
  isMyTurn: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onBuild: PropTypes.func,
  onBuy: PropTypes.func,
  allProps: PropTypes.objectOf(
    PropTypes.shape({ owner: PropTypes.number }),
  ).isRequired,
  playerIsOnSpace: PropTypes.bool.isRequired,
};

PropertyCardModal.defaultProps = {
  prop: null,
  onBuild: null,
  onBuy: null,
};
