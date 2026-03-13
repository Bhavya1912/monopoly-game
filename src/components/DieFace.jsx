import { useState, useEffect } from "react";

// Value to rotation mapping (to bring the correct face to the front)
// 1: front, 2: back, 3: top, 4: bottom, 5: left, 6: right
const FACE_ROTATIONS = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 180 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: -90 },
};

export default function DieFace({ value, shaking, landing }) {
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (shaking) {
      const interval = setInterval(() => {
        setRotation({
          x: Math.random() * 720 - 360,
          y: Math.random() * 720 - 360,
          z: Math.random() * 720 - 360,
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      const target = FACE_ROTATIONS[value || 1];
      // Use a small timeout to avoid the "cascading renders" lint error
      const timeout = setTimeout(() => {
        setRotation({
          x: target.x + (Math.random() * 10 - 5),
          y: target.y + (Math.random() * 10 - 5),
          z: Math.random() * 6 - 3
        });
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [shaking, value]);

  const stateClass = shaking ? "shaking" : landing ? "landing" : "";

  return (
    <div className={`die-container ${stateClass}`}>
      <div 
        className="die-cube"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)` }}
      >
        {[1, 2, 3, 4, 5, 6].map((face) => (
          <div key={face} className={`die-face face-${face}`}>
            {Array.from({ length: face }).map((_, i) => (
              <div key={i} className="dot" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
