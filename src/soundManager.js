let ctx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone({ freq = 440, duration = 0.12, type = "sine", gain = 0.08, delay = 0 }) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const start = ac.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playSound(effect, audioSettings) {
  const settings = audioSettings || {};
  if (settings.muted) return;
  const master = settings.masterVolume ?? 0.8;
  const fx = settings.effectsVolume ?? 0.9;
  const gain = Math.max(0.01, Math.min(0.3, master * fx * 0.12));

  if (effect === "diceRoll") {
    tone({ freq: 180, duration: 0.08, type: "square", gain });
    tone({ freq: 220, duration: 0.08, type: "square", gain, delay: 0.08 });
  } else if (effect === "purchase") {
    tone({ freq: 523, duration: 0.1, type: "triangle", gain });
    tone({ freq: 659, duration: 0.12, type: "triangle", gain, delay: 0.1 });
  } else if (effect === "rent") {
    tone({ freq: 330, duration: 0.12, type: "sine", gain });
  } else if (effect === "bankrupt") {
    tone({ freq: 240, duration: 0.2, type: "sawtooth", gain });
    tone({ freq: 140, duration: 0.25, type: "sawtooth", gain, delay: 0.16 });
  } else if (effect === "event") {
    tone({ freq: 740, duration: 0.08, type: "triangle", gain });
    tone({ freq: 880, duration: 0.12, type: "triangle", gain, delay: 0.08 });
  }
}
