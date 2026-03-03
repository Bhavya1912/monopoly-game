import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TurnTimer — Displays a countdown bar for the current player's turn
// ─────────────────────────────────────────────────────────────────────────────
export default function TurnTimer({
  turnStartTime,
  limit,
  onExpire,
  isMyTurn,
}) {
  const [now, setNow] = useState(() => Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
  }, [turnStartTime, limit]);

  useEffect(() => {
    if (!limit) return;
    const iv = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(iv);
  }, [turnStartTime, limit]);

  const remaining = limit
    ? Math.max(0, limit - Math.floor((now - turnStartTime) / 1000))
    : 0;

  useEffect(() => {
    if (!limit || remaining !== 0 || expiredRef.current) return;
    expiredRef.current = true;
    if (isMyTurn) onExpire();
  }, [limit, remaining, isMyTurn, onExpire]);

  if (!limit) return null;
  const pct = remaining / limit;
  const color = pct > 0.5 ? "#16a34a" : pct > 0.25 ? "#d97706" : "#dc2626";

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}
    >
      <div
        style={{
          flex: 1,
          height: 5,
          background: "#e5e7eb",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            background: color,
            transition: "width 0.5s linear",
            borderRadius: 3,
          }}
        />
      </div>
      <span
        className={remaining <= 10 ? "timer-low" : ""}
        style={{ fontSize: 11, fontWeight: "bold", color, minWidth: 26 }}
      >
        {remaining}s
      </span>
    </div>
  );
}
