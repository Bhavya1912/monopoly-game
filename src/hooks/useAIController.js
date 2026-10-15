import { useEffect, useRef, useCallback } from "react";
import { safePlayers, safeProps } from "../utils";
import { aiJailStrategy, aiShouldBuild, aiShouldBuy } from "../ai";
import { SPACES } from "../constants";

export function useAIController(gameState, processing, canControlAI, aiActions) {
  const {
    pushState,
    advanceTurn,
    buildHouse,
    buyProperty,
    handleRouletteSpin,
    handleJailRoll,
    handleRoll,
  } = aiActions;
  const aiTimerRef = useRef(null);
  const gsRef = useRef(gameState);

  useEffect(() => {
    gsRef.current = gameState;
  }, [gameState]);

  const runAITurnLogic = useCallback(() => {
    const gs = gsRef.current;
    if (gs?.status !== "playing" || gs?.modal) return;

    if (gs.rolled) {
      const players = safePlayers(gs);
      const cur = players[gs.currentPlayer];
      const spaceId = cur?.position;
      if (
        cur?.isAI &&
        canControlAI &&
        aiShouldBuild(cur, spaceId, safeProps(gs))
      ) {
        buildHouse(spaceId, true);
        return;
      }
      setTimeout(() => advanceTurn(), 800);
      return;
    }

    const players = safePlayers(gs);
    const curIdx = gs.currentPlayer;
    const cur = players[curIdx];

    if (cur.inJail) {
      const jailStrat = aiJailStrategy(cur);
      handleJailRoll(jailStrat);
      return;
    }

    handleRoll();
  }, [advanceTurn, buildHouse, canControlAI, handleJailRoll, handleRoll]);

  // AI Modal Handler
  useEffect(() => {
    if (gameState?.status !== "playing" || !gameState?.modal) return;
    if (processing) return;

    const players = safePlayers(gameState);
    const curIdx = gameState.currentPlayer;
    const cur = players[curIdx];
    if (!canControlAI || !cur?.isAI || cur?.bankrupt) return;

    clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      const gs = gsRef.current;
      if (!gs?.modal || gs.currentPlayer !== curIdx) return;

      const modal = gs.modal;
      if (modal.type === "roulette") {
        handleRouletteSpin();
        return;
      }

      if (modal.type === "buy") {
        const spaceId = modal.spaceId;
        if (aiShouldBuy(cur, SPACES[spaceId], safeProps(gs))) {
          buyProperty(spaceId, true);
        } else {
          pushState((c) => ({ ...c, modal: null }));
        }
        return;
      }

      if (modal.type === "steal" || modal.type === "swap") {
        pushState((c) => ({ ...c, modal: null }));
        return;
      }

      pushState((c) => ({ ...c, modal: null }));
    }, 700);
    return () => clearTimeout(aiTimerRef.current);
  }, [gameState?.modal, gameState?.currentPlayer, gameState?.status, processing, canControlAI, pushState, handleRouletteSpin, buyProperty, gameState]);

  // AI Turn Handler
  useEffect(() => {
    if (gameState?.status !== "playing") return;
    if (gameState?.modal) return;

    const cur = safePlayers(gameState)[gameState?.currentPlayer];
    if (!canControlAI || !cur?.isAI || cur?.bankrupt) return;
    if (processing) return;

    clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      runAITurnLogic();
    }, 1200);
    return () => clearTimeout(aiTimerRef.current);
  }, [gameState?.currentPlayer, gameState?.rolled, gameState?.status, gameState?.modal, processing, canControlAI, runAITurnLogic, gameState]);

  return {};
}
