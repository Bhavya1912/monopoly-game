import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TurnTimer — Displays a countdown bar for the current player's turn
// ─────────────────────────────────────────────────────────────────────────────
export default function TurnTimer({ turnStartTime, limit, onExpire, isMyTurn }) {
    const [remaining, setRemaining] = useState(limit);
    const expiredRef = useRef(false);

    useEffect(() => {
        expiredRef.current = false;
        setRemaining(limit);
    }, [turnStartTime, limit]);

    useEffect(() => {
        if (!limit) return;
        const iv = setInterval(() => {
            const left = Math.max(0, limit - Math.floor((Date.now() - turnStartTime) / 1000));
            setRemaining(left);
            if (left === 0 && !expiredRef.current) {
                expiredRef.current = true;
                if (isMyTurn) onExpire();
            }
        }, 500);
        return () => clearInterval(iv);
    }, [turnStartTime, limit, isMyTurn, onExpire]);

    if (!limit) return null;
    const pct = remaining / limit;
    const color = pct > 0.5 ? "#16a34a" : pct > 0.25 ? "#d97706" : "#dc2626";

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{ flex: 1, height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                    height: "100%", width: `${pct * 100}%`, background: color,
                    transition: "width 0.5s linear", borderRadius: 3,
                }} />
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
