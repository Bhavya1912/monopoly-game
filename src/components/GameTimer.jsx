import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// GameTimer — Full-game countdown for "Timed" game mode
// ─────────────────────────────────────────────────────────────────────────────
export default function GameTimer({ gameStartTime, limitMinutes, onExpire }) {
  const [remaining, setRemaining] = useState(limitMinutes * 60);
  const expiredRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      const left = Math.max(
        0,
        limitMinutes * 60 - Math.floor((Date.now() - gameStartTime) / 1000),
      );
      setRemaining(left);
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [gameStartTime, limitMinutes, onExpire]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <span className={remaining < 60 ? "timer-urgent" : "timer-normal"}>
      ⏱ {m}:{s.toString().padStart(2, "0")}
    </span>
  );
}
