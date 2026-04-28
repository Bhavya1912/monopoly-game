import { useState, useEffect } from "react";
import PropTypes from "prop-types";

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
    if (!shaking) {
      const target = FACE_ROTATIONS[value || 1];
      const timeout = setTimeout(() => {
        setRotation({
          x: target.x + (Math.random() * 8 - 4),
          y: target.y + (Math.random() * 8 - 4),
          z: Math.random() * 4 - 2
        });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [shaking, value]);

  let stateClass = "";
  if (shaking) {
    stateClass = "shaking";
  } else if (landing) {
    stateClass = "landing";
  }

  return (
    <div className={`die-container ${stateClass}`}>
      <div 
        className="die-cube"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)` }}
      >
        {[1, 2, 3, 4, 5, 6].map((face) => (
          <div key={`face-${face}`} className={`die-face face-${face}`}>
            {Array.from({ length: face }).map((_, i) => (
              <div key={`dot-${face}-${i}`} className="dot" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

DieFace.propTypes = {
  value: PropTypes.number,
  shaking: PropTypes.bool,
  landing: PropTypes.bool,
};

DieFace.defaultProps = {
  value: 1,
  shaking: false,
  landing: false,
};
