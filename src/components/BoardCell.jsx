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
  if (!space) return <div style={{ width: "100%", height: "100%" }} />;

  const safeP = Array.isArray(players) ? players : [];
  const safeQ = properties && typeof properties === "object" ? properties : {};
  const prop = safeQ[spaceId];
  const here = safeP.filter((p) => p && p.position === spaceId && !p.bankrupt);
  const isFlash = flashCell === spaceId;

  const ownerColor = prop ? PLAYER_COLORS[prop.owner] : null;

  const bg =
    space.type === "go"
      ? "#bbf7d0"
      : space.type === "jail"
        ? "#fef9c3"
        : space.type === "gotojail"
          ? "#fee2e2"
          : space.type === "freeparking"
            ? "#dcfce7"
            : space.type === "chance"
              ? "#ffedd5"
              : space.type === "community"
                ? "#dbeafe"
                : space.type === "tax"
                  ? "#fce7f3"
                  : space.type === "railroad"
                    ? "#f5f5f5"
                    : space.type === "utility"
                      ? "#ecfdf5"
                      : "#ffffff";

  const shortName = space.name
    .replace(/ Avenue$/i, "")
    .replace(/ Ave$/i, "")
    .replace(/ Place$/i, "")
    .replace(/ Gardens$/i, "")
    .replace("Pennsylvania", "PA")
    .replace("North Carolina", "NC")
    .replace("Reading Railroad", "Reading RR")
    .replace("Jail / Just Visiting", "Jail");

  return (
    <div
      onClick={onClick}
      className={`board-cell-hover${isFlash ? " cell-pulse" : ""}`}
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        border: isSelected
          ? "2px solid #fbbf24"
          : ownerColor
            ? `2px solid ${ownerColor}`
            : "1px solid #9ca3af",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 1,
        boxShadow: isSelected
          ? "inset 0 0 8px rgba(251,191,36,0.8)"
          : ownerColor
            ? `inset 0 0 5px ${ownerColor}55`
            : "none",
        transition: "box-shadow 0.15s",
      }}
    >
      {/* Color band */}
      {space.type === "property" && space.color && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 7,
            background: space.color,
          }}
        />
      )}
      {/* Owner dot overlay */}
      {ownerColor && (
        <div
          style={{
            position: "absolute",
            top: space.type === "property" ? 8 : 2,
            right: 2,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: ownerColor,
            boxShadow: `0 0 3px ${ownerColor}`,
          }}
        />
      )}
      <div
        style={{
          fontSize: 6,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.2,
          marginTop: space.type === "property" ? 8 : 0,
          color: "#1f2937",
          padding: "0 1px",
        }}
      >
        {shortName}
      </div>
      {space.price && (
        <div style={{ fontSize: 5.5, color: "#6b7280" }}>${space.price}</div>
      )}
      {prop && (
        <div style={{ fontSize: 7 }}>
          {prop.hotel ? "🏨" : "🏠".repeat(prop.houses || 0)}
        </div>
      )}
      {here.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {here.map((p) => (
            <span
              key={p.id}
              className={bouncingPlayer === p.id ? "token-bounce" : ""}
              style={{ fontSize: 12, lineHeight: 1, display: "inline-block" }}
            >
              {p.token}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
