// ─────────────────────────────────────────────────────────────────────────────
// DieFace — Renders one die with CSS-class face dots
// ─────────────────────────────────────────────────────────────────────────────
export default function DieFace({ value, shaking, landing }) {
  const dots = value || 1;
  return (
    <div
      className={`die face-${dots} ${shaking ? "dice-shake shaking" : landing ? "dice-land landing" : "die-border-normal"}`}
    >
      {Array.from({ length: dots }).map((_, i) => (
        <div key={i} className="dot" />
      ))}
    </div>
  );
}
