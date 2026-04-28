import PropTypes from "prop-types";
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

  let color = "var(--red-base)";
  if (pct > 0.5) {
    color = "var(--green-base)";
  } else if (pct > 0.25) {
    color = "var(--player-3)";
  }

  return (
    <div className="turn-timer-container" style={{ "--pct": `${pct * 100}%`, "--bar-color": color }}>
      <div className="turn-timer-track">
        <div className="turn-timer-bar" />
      </div>
      <span
        className={`weight-bold text-xs timer-text ${remaining <= 10 ? "timer-low" : ""}`}
      >
        {remaining}s
      </span>
    </div>
  );
}

TurnTimer.propTypes = {
  turnStartTime: PropTypes.number.isRequired,
  limit: PropTypes.number,
  onExpire: PropTypes.func.isRequired,
  isMyTurn: PropTypes.bool.isRequired,
};

TurnTimer.defaultProps = {
  limit: null,
};
