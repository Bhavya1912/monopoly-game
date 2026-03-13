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
    .replace("Pennsylvania", "PA")
    .replace("North Carolina", "NC")
    .replace("Reading Railroad", "Reading RR")
    .replace("Jail / Just Visiting", "Jail");

  const isCorner = ["go", "jail", "freeparking", "go-to-jail"].includes(space.type);

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

  return (
    <div
      onClick={onClick}
      className={`board-cell board-cell-hover bg-${space.type} ${isFlash ? "cell-pulse" : ""} ${isSelected ? "cell-selected" : ""} ${!isSelected && ownerColor ? "has-owner" : ""} ${isCorner ? "corner-cell" : ""}`}
      style={{
        "--owner-color": ownerColor,
        "--owner-glow": ownerColor ? `${ownerColor}55` : "transparent",
        "--space-color": space.color,
      }}
    >
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
      <div className={`cell-name ${space.name.length > 12 ? "long-name" : ""}`}>
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
  );
}
