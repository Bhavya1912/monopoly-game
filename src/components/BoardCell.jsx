import PropTypes from "prop-types";
import { SPACES, PLAYER_COLORS } from "../constants";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers to reduce Cognitive Complexity
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simplifies space names for board display.
 */
function getShortName(name) {
  return name
    .replace(/ Avenue$/i, "")
    .replace(/ Ave$/i, "")
    .replace(/ Place$/i, "")
    .replace(/ Gardens$/i, "")
    .replace(/ Railroad$/i, " RR")
    .replace(/ Company$/i, " Co")
    .replace("Pennsylvania", "PA")
    .replace("North Carolina", "NC")
    .replace("Community Chest", "Comm. Chest")
    .replace("Jail / Just Visiting", "Jail");
}

/**
 * Returns the appropriate emoji for special board tiles.
 */
function getTileFigure(type) {
  const figures = {
    go: "🏁",
    jail: "⚖️",
    freeparking: "🅿️",
    "go-to-jail": "👮",
    chance: "❓",
    community: "🎁",
    roulette: "🎡",
  };
  return figures[type] || null;
}

/**
 * Determines which side of the board the cell is on.
 */
function getSide(spaceId) {
  if (spaceId === 0 || spaceId === 10 || spaceId === 20 || spaceId === 30) return "corner";
  if (spaceId > 0 && spaceId < 10) return "bottom";
  if (spaceId > 10 && spaceId < 20) return "left";
  if (spaceId > 20 && spaceId < 30) return "top";
  if (spaceId > 30 && spaceId < 40) return "right";
  return "corner";
}

/**
 * Renders building status (houses/hotels).
 */
function renderBuildings(prop) {
  if (!prop) return "";
  if (prop.hotel) return "🏨";
  return "🏠".repeat(prop.houses || 0);
}

/**
 * Gets the CSS class for name length.
 */
function getNameClass(nameLen) {
  if (nameLen >= 11) return "very-long-name";
  if (nameLen >= 8) return "long-name";
  return "";
}

/**
 * Gets the consolidated class string for the board cell.
 */
function getCellClasses({ type, side, isFlash, isSelected, ownerColor, isCorner }) {
  let ownerClass = "";
  if (!isSelected && ownerColor) {
    ownerClass = "has-owner";
  }

  return [
    "board-cell",
    "board-cell-hover",
    `bg-${type}`,
    `cell-side-${side}`,
    isFlash ? "cell-pulse" : "",
    isSelected ? "cell-selected" : "",
    ownerClass,
    isCorner ? "corner-cell" : "",
  ].filter(Boolean).join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// BoardCell — One square on the board grid
// ─────────────────────────────────────────────────────────────────────────────

export default function BoardCell({
  spaceId,
  players,
  properties,
  isSelected,
  onClick,
  flashCell,
  bouncingPlayer,
  width,
  height,
}) {
  const space = SPACES[spaceId];
  if (!space) return <div className="h-full w-full" />;

  const safeP = Array.isArray(players) ? players : [];
  const safeQ = properties && typeof properties === "object" ? properties : {};
  const prop = safeQ[spaceId];
  const here = safeP.filter((p) => p && p.position === spaceId && !p.bankrupt);
  const isFlash = flashCell === spaceId;

  const ownerColor = prop ? PLAYER_COLORS[prop.owner] : null;
  const shortName = getShortName(space.name);
  const isCorner = ["go", "jail", "freeparking", "go-to-jail"].includes(space.type);
  const tileFigure = getTileFigure(space.type);
  const side = getSide(spaceId);

  // Styling helpers
  const nameClass = getNameClass(shortName.length);
  const cellClasses = getCellClasses({
    type: space.type,
    side,
    isFlash,
    isSelected,
    ownerColor,
    isCorner,
  });

  // Accessibility label
  let ariaLabel = space.name;
  if (typeof prop?.owner === "number") {
    ariaLabel += `, owned by Player ${prop.owner + 1}`;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cellClasses}
      style={{
        "--owner-color": ownerColor,
        "--owner-glow": ownerColor ? `${ownerColor}55` : "transparent",
        "--space-color": space.color,
        "--cell-w": `${width}px`,
        "--cell-h": `${height}px`,
      }}
      aria-label={ariaLabel}
    >
      <div className="cell-content">
        {space.type === "property" && space.color && <div className="cell-color-band" />}
        
        {ownerColor && (
          <div className={`cell-owner-dot ${space.type === "property" ? "owner-dot-prop" : "owner-dot-other"}`} />
        )}

        <div className={`cell-name ${nameClass}`}>{shortName}</div>

        {tileFigure && (
          <div className={`cell-figure ${isCorner ? "corner-figure" : ""}`}>{tileFigure}</div>
        )}

        <div className="cell-price">{space.price ? `$${space.price}` : ""}</div>

        <div className="cell-buildings">{renderBuildings(prop)}</div>

        <div className="cell-tokens">
          {here.map((p) => (
            <span key={p.id} className={`cell-token ${bouncingPlayer === p.id ? "token-bounce" : ""}`}>
              {p.token}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

BoardCell.propTypes = {
  spaceId: PropTypes.number.isRequired,
  players: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    position: PropTypes.number,
    bankrupt: PropTypes.bool,
    token: PropTypes.string,
  })).isRequired,
  properties: PropTypes.objectOf(PropTypes.shape({
    owner: PropTypes.number,
    houses: PropTypes.number,
    hotel: PropTypes.bool,
  })).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  flashCell: PropTypes.number,
  bouncingPlayer: PropTypes.number,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};

BoardCell.defaultProps = {
  flashCell: null,
  bouncingPlayer: null,
};
