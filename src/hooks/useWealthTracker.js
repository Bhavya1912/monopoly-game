import { useState, useEffect } from "react";
import { safePlayers, safeProps, safeLog, estimateAssetValueForPlayer } from "../utils";

export function useWealthTracker(gameState, screen) {
  const [wealthHistory, setWealthHistory] = useState([]);

  useEffect(() => {
    if (screen !== "game" || !gameState) return;
    const players = safePlayers(gameState);
    const props = safeProps(gameState);
    if (!players.length) return;

    const topLog = safeLog(gameState)[0] || "";
    const marker = /BANKRUPT|rent|MONO|reached/i.test(topLog) ? topLog : "";

    const playerStatusKeys = players.map((p) => {
      const money = p?.money || 0;
      const pos = p?.position || 0;
      const bankrupt = p?.bankrupt ? 1 : 0;
      return `${money}-${pos}-${bankrupt}`;
    }).join("|");

    const point = {
      t: Date.now(),
      key: `${gameState.turnStartTime || 0}|${playerStatusKeys}|${Object.keys(props).length}|${topLog}`,
      values: players.map((pl, i) => ({
        id: i,
        net: (pl?.money || 0) + estimateAssetValueForPlayer(i, props),
        assets: estimateAssetValueForPlayer(i, props),
      })),
      event: marker,
    };

    requestAnimationFrame(() => {
      setWealthHistory((prev) => {
        if (prev.at(-1)?.key === point.key) return prev;
        return [...prev.slice(-19), point];
      });
    });
  }, [screen, gameState?.turnStartTime, gameState]);

  return { wealthHistory };
}
