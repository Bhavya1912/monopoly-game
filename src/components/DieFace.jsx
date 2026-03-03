// ─────────────────────────────────────────────────────────────────────────────
// DieFace — Renders one die with CSS-class face dots
// ─────────────────────────────────────────────────────────────────────────────
export default function DieFace({ value, shaking, landing }) {
  const dots = value || 1;
  return (
    <div
      className={`die face-${dots}${shaking ? " dice-shake" : landing ? " dice-land" : ""}`}
      style={{
        border: shaking ? "2px solid #f59e0b" : "2px solid #444",
        boxShadow: shaking
          ? "0 0 14px rgba(255,165,0,0.8)"
          : landing
            ? "0 0 20px gold"
            : "2px 2px 6px rgba(0,0,0,0.3)",
      }}
    >
      {Array.from({ length: dots }).map((_, i) => (
        <div key={i} className="dot" />
      ))}
    </div>
  );
}
