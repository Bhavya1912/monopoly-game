import { SPACES, PLAYER_COLORS } from "../constants";

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

  const shortName = space.name
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

  const isCorner = ["go", "jail", "freeparking", "go-to-jail"].includes(space.type);

  // Use the length of the *short* name to decide if we need the smaller font
  const nameLen = shortName.length;
  let nameClass = "";
  if (nameLen >= 11) nameClass = "very-long-name";
  else if (nameLen >= 8) nameClass = "long-name";

  const tileFigure =
    space.type === "go"
      ? "🏁"
      : space.type === "jail"
        ? "⚖️"
        : space.type === "freeparking"
          ? "🅿️"
          : space.type === "go-to-jail"
            ? "👮"
            : space.type === "chance"
              ? "❓"
              : space.type === "community"
                ? "🎁"
                : space.type === "roulette"
                  ? "🎡"
                  : null;

  // Rotation side logic
  const side =
    spaceId > 0 && spaceId < 10 ? "bottom" :
    spaceId > 10 && spaceId < 20 ? "left" :
    spaceId > 20 && spaceId < 30 ? "top" :
    spaceId > 30 && spaceId < 40 ? "right" : "corner";

  return (
    <div
      onClick={onClick}
      className={`board-cell board-cell-hover bg-${space.type} cell-side-${side} ${isFlash ? "cell-pulse" : ""} ${isSelected ? "cell-selected" : ""} ${!isSelected && ownerColor ? "has-owner" : ""} ${isCorner ? "corner-cell" : ""}`}
      style={{
        "--owner-color": ownerColor,
        "--owner-glow": ownerColor ? `${ownerColor}55` : "transparent",
        "--space-color": space.color,
        "--cell-w": `${width}px`,
        "--cell-h": `${height}px`,
      }}
    >
      {/* Container for rotation to maintain layout within square grid */}
      <div className="cell-content">
        {/* Color band */}
        {space.type === "property" && space.color && (
          <div className="cell-color-band" />
        )}
        {/* Owner dot overlay */}
        {ownerColor && (
          <div
            className={`cell-owner-dot ${space.type === "property" ? "owner-dot-prop" : "owner-dot-other"}`}
          />
        )}
        <div className={`cell-name ${nameClass}`}>
          {shortName}
        </div>
        {tileFigure && (
          <div className={`cell-figure ${isCorner ? "corner-figure" : ""}`}>
            {tileFigure}
          </div>
        )}
        <div className="cell-price">{space.price ? `$${space.price}` : ""}</div>
        <div className="cell-buildings">
          {prop ? (prop.hotel ? "🏨" : "🏠".repeat(prop.houses || 0)) : ""}
        </div>
        <div className="cell-tokens">
          {here.map((p) => (
            <span
              key={p.id}
              className={`cell-token ${bouncingPlayer === p.id ? "token-bounce" : ""}`}
            >
              {p.token}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
