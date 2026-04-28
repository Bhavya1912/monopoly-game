import { useEffect, useRef, useCallback } from "react";
import { safePlayers } from "../utils";
import { aiJailStrategy } from "../ai";

export function useAIController(gameState, myIdx, processing, aiActions) {
  const { pushState, advanceTurn, handleRouletteSpin, handleJailRoll, handleRoll } = aiActions;
  const aiTimerRef = useRef(null);
  const gsRef = useRef(gameState);

  useEffect(() => {
    gsRef.current = gameState;
  }, [gameState]);

  const runAITurnLogic = useCallback(() => {
    const gs = gsRef.current;
    if (gs?.status !== "playing" || gs?.modal) return;

    if (gs.rolled) {
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
  }, [advanceTurn, handleJailRoll, handleRoll]);

  // AI Modal Handler
  useEffect(() => {
    if (gameState?.status !== "playing" || !gameState?.modal) return;
    if (processing) return;

    const players = safePlayers(gameState);
    const curIdx = gameState.currentPlayer;
    const cur = players[curIdx];
    if (!cur?.isAI || cur?.bankrupt) return;

    clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      const gs = gsRef.current;
      if (!gs?.modal || gs.currentPlayer !== curIdx) return;

      const modal = gs.modal;
      if (modal.type === "roulette") {
        handleRouletteSpin();
        return;
      }

      if (modal.type === "steal" || modal.type === "swap") {
        pushState((c) => ({ ...c, modal: null }));
        return;
      }

      pushState((c) => ({ ...c, modal: null }));
    }, 700);
    return () => clearTimeout(aiTimerRef.current);
  }, [gameState?.modal, gameState?.currentPlayer, gameState?.status, processing, pushState, handleRouletteSpin, gameState]);

  // AI Turn Handler
  useEffect(() => {
    if (gameState?.status !== "playing") return;
    if (gameState?.modal) return;

    const cur = safePlayers(gameState)[gameState?.currentPlayer];
    if (!cur?.isAI || cur?.bankrupt) return;
    if (processing) return;

    clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      runAITurnLogic();
    }, 1200);
    return () => clearTimeout(aiTimerRef.current);
  }, [gameState?.currentPlayer, gameState?.rolled, gameState?.status, gameState?.modal, processing, runAITurnLogic, gameState]);

  return {};
}
