import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update } from "firebase/database";

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const STYLE = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 100%; overflow-x: hidden; }

  @keyframes diceShake {
    0%   { transform: rotate(0deg) scale(1); }
    20%  { transform: rotate(-18deg) scale(1.25); }
    40%  { transform: rotate(18deg) scale(1.3); }
    60%  { transform: rotate(-12deg) scale(1.2); }
    80%  { transform: rotate(10deg) scale(1.15); }
    100% { transform: rotate(0deg) scale(1); }
  }
  @keyframes diceLand {
    0%   { transform: scale(1.4); box-shadow: 0 0 24px 6px rgba(255,215,0,0.9); }
    60%  { transform: scale(0.92); }
    100% { transform: scale(1); box-shadow: 2px 2px 6px rgba(0,0,0,0.3); }
  }
  @keyframes tokenBounce {
    0%   { transform: translateY(0) scale(1); }
    35%  { transform: translateY(-10px) scale(1.4); filter: drop-shadow(0 0 8px gold); }
    65%  { transform: translateY(-5px) scale(1.2); }
    85%  { transform: translateY(-7px) scale(1.25); }
    100% { transform: translateY(0) scale(1); filter: none; }
  }
  @keyframes cellPulse {
    0%   { box-shadow: inset 0 0 0px rgba(255,165,0,0); }
    50%  { box-shadow: inset 0 0 16px rgba(255,165,0,0.9); background: rgba(255,200,0,0.3) !important; }
    100% { box-shadow: inset 0 0 0px rgba(255,165,0,0); }
  }
  @keyframes ownerPulse {
    0%,100% { opacity: 0.6; } 50% { opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes timerPulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes slideIn {
    from { opacity:0; transform: translateY(-10px) scale(0.97); }
    to   { opacity:1; transform: translateY(0) scale(1); }
  }
  @keyframes popIn {
    from { opacity:0; transform: scale(0.8); }
    to   { opacity:1; transform: scale(1); }
  }

  .dice-shake  { animation: diceShake 0.5s ease-in-out infinite; }
  .dice-land   { animation: diceLand 0.45s ease-out forwards; }
  .token-bounce{ animation: tokenBounce 0.55s ease-out forwards; }
  .cell-pulse  { animation: cellPulse 0.35s ease-out; }
  .timer-low   { animation: timerPulse 0.6s ease-in-out infinite; color: #dc2626 !important; }
  .slide-in    { animation: slideIn 0.2s ease-out; }
  .pop-in      { animation: popIn 0.2s ease-out; }

  .die {
    width: 44px; height: 44px;
    background: #fff; border: 2px solid #444; border-radius: 8px;
    position: relative; box-shadow: 2px 2px 6px rgba(0,0,0,0.3);
    flex-shrink: 0;
  }
  .dot {
    width: 8px; height: 8px; background: #1a1a1a;
    border-radius: 50%; position: absolute;
  }
  .face-1 .dot:nth-child(1) { top:50%; left:50%; transform:translate(-50%,-50%); }
  .face-2 .dot:nth-child(1) { top:8px; left:8px; }
  .face-2 .dot:nth-child(2) { bottom:8px; right:8px; }
  .face-3 .dot:nth-child(1) { top:8px; left:8px; }
  .face-3 .dot:nth-child(2) { top:50%; left:50%; transform:translate(-50%,-50%); }
  .face-3 .dot:nth-child(3) { bottom:8px; right:8px; }
  .face-4 .dot:nth-child(1) { top:8px; left:8px; }
  .face-4 .dot:nth-child(2) { top:8px; right:8px; }
  .face-4 .dot:nth-child(3) { bottom:8px; left:8px; }
  .face-4 .dot:nth-child(4) { bottom:8px; right:8px; }
  .face-5 .dot:nth-child(1) { top:8px; left:8px; }
  .face-5 .dot:nth-child(2) { top:8px; right:8px; }
  .face-5 .dot:nth-child(3) { top:50%; left:50%; transform:translate(-50%,-50%); }
  .face-5 .dot:nth-child(4) { bottom:8px; left:8px; }
  .face-5 .dot:nth-child(5) { bottom:8px; right:8px; }
  .face-6 .dot:nth-child(1) { top:8px; left:8px; }
  .face-6 .dot:nth-child(2) { top:8px; right:8px; }
  .face-6 .dot:nth-child(3) { top:50%; left:8px; transform:translateY(-50%); }
  .face-6 .dot:nth-child(4) { top:50%; right:8px; transform:translateY(-50%); }
  .face-6 .dot:nth-child(5) { bottom:8px; left:8px; }
  .face-6 .dot:nth-child(6) { bottom:8px; right:8px; }

  /* Board‑level popup */
  .board-popup {
    position: absolute; z-index: 50;
    background: #fefce8; border: 3px solid #a16207;
    border-radius: 12px; padding: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    min-width: 220px; max-width: 290px;
    animation: popIn 0.18s ease-out;
    pointer-events: all;
  }

  /* Responsive layout */
  .game-root {
    min-height: 100vh;
    background:
      radial-gradient(circle at 15% 20%, rgba(34,197,94,0.16), transparent 44%),
      radial-gradient(circle at 85% 0%, rgba(251,191,36,0.14), transparent 38%),
      linear-gradient(180deg, #14532d 0%, #0f3f24 60%, #0b2f1b 100%);
    font-family: Georgia, serif;
    display: flex; flex-direction: column;
    padding: 10px; gap: 10px; box-sizing: border-box;
  }
  .game-layout {
    display: flex; gap: 10px; align-items: flex-start; flex: 1; min-height: 0;
  }
  .board-wrap {
    flex-shrink: 0; position: relative;
    overflow: visible;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 16px 32px rgba(0,0,0,0.22);
    backdrop-filter: blur(2px);
  }
  .right-panel {
    display: flex; flex-direction: column;
    gap: 8px; flex: 1; min-width: 0;
    overflow-y: auto; max-height: 90vh;
    background: rgba(15, 23, 42, 0.22);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 12px;
    padding: 8px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }
  @media (max-width: 860px) {
    .game-layout { flex-direction: column; }
    .board-wrap { width: 100%; overflow-x: auto; }
    .right-panel { width: 100%; max-height: none; }
  }

  /* Settings pill buttons */
  .pill {
    cursor: pointer; padding: 6px 14px; border-radius: 20px;
    font-size: 13px; font-weight: 600;
    border: 1px solid rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.85); color: #1f2937;
    transition: all 0.15s; white-space: nowrap;
    box-shadow: 0 2px 10px rgba(0,0,0,0.14);
  }
  .pill.active {
    background: linear-gradient(180deg, #16a34a, #14532d);
    color: #fff;
    border-color: #166534;
  }
  .pill:hover:not(.active) { border-color: #16a34a; color: #14532d; transform: translateY(-1px); }

  /* Scrollbars */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #1e293b; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }

  /* Frozen player badge */
  .frozen-badge {
    font-size: 9px; background: #bae6fd; color: #075985;
    padding: 1px 5px; border-radius: 8px; font-weight: bold;
  }
  /* Immunity badge */
  .immune-badge {
    font-size: 9px; background: #d1fae5; color: #065f46;
    padding: 1px 5px; border-radius: 8px; font-weight: bold;
  }

  /* Cell hover glow */
  .board-cell-hover:hover {
    filter: brightness(0.92);
    outline: 2px solid rgba(251,191,36,0.85);
    outline-offset: -2px;
    z-index: 2;
  }

  /* Property card modal */
  .prop-card-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 300; padding: 16px;
    animation: fadeIn 0.15s ease-out;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }

  .prop-card {
    width: 280px;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 0 0 3px #1a1a1a;
    animation: popIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
    font-family: 'Arial Narrow', Arial, sans-serif;
    position: relative;
  }

  .prop-card-header {
    text-align: center;
    padding: 10px 12px 8px;
    border-bottom: 2px solid #1a1a1a;
  }

  .prop-card-title {
    font-size: 17px; font-weight: 900;
    text-transform: uppercase; letter-spacing: 0.5px;
    line-height: 1.1; color: #1a1a1a;
    margin: 6px 0 2px;
  }

  .prop-card-subtitle {
    font-size: 11px; color: #444;
    text-transform: uppercase; letter-spacing: 1px;
  }

  .prop-card-body {
    padding: 0 14px 12px;
  }

  .prop-rent-row {
    display: flex; justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12.5px;
  }
  .prop-rent-row:last-child { border-bottom: none; }
  .prop-rent-row .label { color: #374151; }
  .prop-rent-row .amount { font-weight: 700; color: #1a1a1a; }
  .prop-rent-row.highlight { background: #fef9c3; margin: 0 -14px; padding: 4px 14px; }

  .prop-card-footer {
    background: #f3f4f6;
    border-top: 2px solid #1a1a1a;
    padding: 8px 14px;
    display: flex; justify-content: space-between;
    font-size: 11.5px; color: #374151;
  }

  .prop-build-section {
    padding: 10px 14px 0;
    border-top: 2px solid #1a1a1a;
    margin-top: 4px;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Firebase
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCzd09dkugQ8DMNO-3xKEl-DDzpKS66iFw",
  authDomain: "monopoly-game-1a36c.firebaseapp.com",
  databaseURL: "https://monopoly-game-1a36c-default-rtdb.firebaseio.com",
  projectId: "monopoly-game-1a36c",
  storageBucket: "monopoly-game-1a36c.firebasestorage.app",
  messagingSenderId: "817558285705",
  appId: "1:817558285705:web:efe8bcbf7a6ec093a64558",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ─────────────────────────────────────────────────────────────────────────────
// Board spaces
// ─────────────────────────────────────────────────────────────────────────────
const SPACES = [
  { id:0,  name:"GO",                 type:"go",          color:null,      price:null },
  { id:1,  name:"Mediterranean Ave",  type:"property",    color:"#8B4513", price:60,  rent:[2,10,30,90,160,250],       houseCost:50 },
  { id:2,  name:"Community Chest",    type:"community",   color:null,      price:null },
  { id:3,  name:"Baltic Ave",         type:"property",    color:"#8B4513", price:60,  rent:[4,20,60,180,320,450],      houseCost:50 },
  { id:4,  name:"Income Tax",         type:"tax",         color:null,      price:null, amount:200 },
  { id:5,  name:"Reading Railroad",   type:"railroad",    color:null,      price:200, rent:[25,50,100,200] },
  { id:6,  name:"Oriental Ave",       type:"property",    color:"#87CEEB", price:100, rent:[6,30,90,270,400,550],      houseCost:50 },
  { id:7,  name:"Chance",             type:"chance",      color:null,      price:null },
  { id:8,  name:"Vermont Ave",        type:"property",    color:"#87CEEB", price:100, rent:[6,30,90,270,400,550],      houseCost:50 },
  { id:9,  name:"Connecticut Ave",    type:"property",    color:"#87CEEB", price:120, rent:[8,40,100,300,450,600],     houseCost:50 },
  { id:10, name:"Jail / Just Visiting", type:"jail",      color:null,      price:null },
  { id:11, name:"St. Charles Place",  type:"property",    color:"#FF69B4", price:140, rent:[10,50,150,450,625,750],    houseCost:100 },
  { id:12, name:"Electric Company",   type:"utility",     color:null,      price:150, rent:[] },
  { id:13, name:"States Ave",         type:"property",    color:"#FF69B4", price:140, rent:[10,50,150,450,625,750],    houseCost:100 },
  { id:14, name:"Virginia Ave",       type:"property",    color:"#FF69B4", price:160, rent:[12,60,180,500,700,900],    houseCost:100 },
  { id:15, name:"Pennsylvania RR",    type:"railroad",    color:null,      price:200, rent:[25,50,100,200] },
  { id:16, name:"St. James Place",    type:"property",    color:"#FFA500", price:180, rent:[14,70,200,550,750,950],    houseCost:100 },
  { id:17, name:"Community Chest",    type:"community",   color:null,      price:null },
  { id:18, name:"Tennessee Ave",      type:"property",    color:"#FFA500", price:180, rent:[14,70,200,550,750,950],    houseCost:100 },
  { id:19, name:"New York Ave",       type:"property",    color:"#FFA500", price:200, rent:[16,80,220,600,800,1000],   houseCost:100 },
  { id:20, name:"Free Parking",       type:"freeparking", color:null,      price:null },
  { id:21, name:"Kentucky Ave",       type:"property",    color:"#FF0000", price:220, rent:[18,90,250,700,875,1050],   houseCost:150 },
  { id:22, name:"Chance",             type:"chance",      color:null,      price:null },
  { id:23, name:"Indiana Ave",        type:"property",    color:"#FF0000", price:220, rent:[18,90,250,700,875,1050],   houseCost:150 },
  { id:24, name:"Illinois Ave",       type:"property",    color:"#FF0000", price:240, rent:[20,100,300,750,925,1100],  houseCost:150 },
  { id:25, name:"B&O Railroad",       type:"railroad",    color:null,      price:200, rent:[25,50,100,200] },
  { id:26, name:"Atlantic Ave",       type:"property",    color:"#DAA520", price:260, rent:[22,110,330,800,975,1150],  houseCost:150 },
  { id:27, name:"Ventnor Ave",        type:"property",    color:"#DAA520", price:260, rent:[22,110,330,800,975,1150],  houseCost:150 },
  { id:28, name:"Water Works",        type:"utility",     color:null,      price:150, rent:[] },
  { id:29, name:"Marvin Gardens",     type:"property",    color:"#DAA520", price:280, rent:[24,120,360,850,1025,1200], houseCost:150 },
  { id:30, name:"Go To Jail",         type:"gotojail",    color:null,      price:null },
  { id:31, name:"Pacific Ave",        type:"property",    color:"#228B22", price:300, rent:[26,130,390,900,1100,1275], houseCost:200 },
  { id:32, name:"North Carolina Ave", type:"property",    color:"#228B22", price:300, rent:[26,130,390,900,1100,1275], houseCost:200 },
  { id:33, name:"Community Chest",    type:"community",   color:null,      price:null },
  { id:34, name:"Pennsylvania Ave",   type:"property",    color:"#228B22", price:320, rent:[28,150,450,1000,1200,1400],houseCost:200 },
  { id:35, name:"Short Line RR",      type:"railroad",    color:null,      price:200, rent:[25,50,100,200] },
  { id:36, name:"Chance",             type:"chance",      color:null,      price:null },
  { id:37, name:"Park Place",         type:"property",    color:"#00008B", price:350, rent:[35,175,500,1100,1300,1500],houseCost:200 },
  { id:38, name:"Luxury Tax",         type:"tax",         color:null,      price:null, amount:75 },
  { id:39, name:"Boardwalk",          type:"property",    color:"#00008B", price:400, rent:[50,200,600,1400,1700,2000],houseCost:200 },
];

const COLOR_GROUPS = {};
SPACES.forEach(s => {
  if (s.type === "property" && s.color) {
    if (!COLOR_GROUPS[s.color]) COLOR_GROUPS[s.color] = [];
    COLOR_GROUPS[s.color].push(s.id);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Chance Cards
// ─────────────────────────────────────────────────────────────────────────────
const CHANCE_CARDS = [
  { text:"Advance to GO! Collect $200",
    action:(p)=>({...p, position:0, money:p.money+200}) },
  { text:"Bank pays you a dividend of $50",
    action:(p)=>({...p, money:p.money+50}) },
  { text:"Go back 3 spaces",
    action:(p)=>({...p, position:(p.position-3+40)%40}) },
  { text:"Go directly to Jail! Do not pass GO.",
    action:(p)=>({...p, position:10, inJail:true, jailTurns:0}) },
  { text:"Speeding fine — pay $15",
    action:(p)=>({...p, money:p.money-15}) },
  { text:"Building loan matures — collect $150",
    action:(p)=>({...p, money:p.money+150}) },
  { text:"Skip Jail Free — keep this card!",
    action:(p)=>({...p, jailFreeCards:(p.jailFreeCards||0)+1}) },
  // Advanced effects — these set a special flag the game engine checks
  { text:"Double Rent! Your next rent collection is doubled.",
    action:(p)=>({...p, doubleRentTurns:2}) },
  { text:"Rent Immunity! You pay no rent this turn.",
    action:(p)=>({...p, rentImmuneTurns:1}) },
  { text:"Freeze! An opponent is frozen for one turn. (Host picks target.)",
    action:(p,gs)=>{
      // Pick the richest non-bankrupt opponent
      const players = (gs?.players||[]).filter(op=>op&&!op.bankrupt&&op.id!==p.id);
      if (!players.length) return p;
      const target = players.reduce((a,b)=>a.money>b.money?a:b);
      return {...p, specialEffect:{type:"freeze", targetId:target.id}};
    }, needsGs:true },
  { text:"Steal a Property! Take one property from an opponent.",
    action:(p)=>({...p, specialEffect:{type:"steal"}}), special:true },
  { text:"Property Swap! Swap one of your properties with an opponent's.",
    action:(p)=>({...p, specialEffect:{type:"swap"}}), special:true },
  { text:"Force Transfer! Force an opponent to give you their cheapest property.",
    action:(p,gs)=>{
      const players=(gs?.players||[]).filter(op=>op&&!op.bankrupt&&op.id!==p.id&&op.money>0);
      if (!players.length) return p;
      const target=players.reduce((a,b)=>a.money<b.money?a:b);
      return {...p, specialEffect:{type:"forceTransfer", targetId:target.id}};
    }, needsGs:true },
];

const COMMUNITY_CARDS = [
  { text:"Bank error in your favor — collect $200", action:(p)=>({...p,money:p.money+200}) },
  { text:"Doctor's fees — pay $50",                  action:(p)=>({...p,money:p.money-50}) },
  { text:"From sale of stock — collect $50",         action:(p)=>({...p,money:p.money+50}) },
  { text:"Go to Jail! Do not pass GO.",              action:(p)=>({...p,position:10,inJail:true,jailTurns:0}) },
  { text:"Holiday fund matures — receive $100",      action:(p)=>({...p,money:p.money+100}) },
  { text:"Income tax refund — collect $20",          action:(p)=>({...p,money:p.money+20}) },
  { text:"Life insurance matures — collect $100",    action:(p)=>({...p,money:p.money+100}) },
  { text:"Pay hospital fees of $100",                action:(p)=>({...p,money:p.money-100}) },
  { text:"Pay school fees of $50",                   action:(p)=>({...p,money:p.money-50}) },
  { text:"Consultancy fee — receive $25",            action:(p)=>({...p,money:p.money+25}) },
  { text:"Get Out of Jail Free — keep this card!",  action:(p)=>({...p,jailFreeCards:(p.jailFreeCards||0)+1}) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const PLAYER_COLORS = ["#E74C3C","#3498DB","#27AE60","#F39C12"];
const PLAYER_TOKENS = ["🎩","🚢","🏎️","🐶"];

const CELL_POSITIONS = [];
for (let i=0;i<=10;i++)  CELL_POSITIONS.push({id:i,  gridRow:11, gridColumn:11-i});
for (let i=11;i<=19;i++) CELL_POSITIONS.push({id:i,  gridRow:11-(i-10), gridColumn:1});
for (let i=20;i<=30;i++) CELL_POSITIONS.push({id:i,  gridRow:1,  gridColumn:i-19});
for (let i=31;i<=39;i++) CELL_POSITIONS.push({id:i,  gridRow:i-29, gridColumn:11});

const DEFAULT_SETTINGS = {
  turnTimer:    0,
  gameMode:     "classic",
  timedMinutes: 60,
  targetAmount: 10000,
  aiPlayers:    [],  // array of player indices that are AI
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const generateCode = () => Math.random().toString(36).substring(2,8).toUpperCase();
const safePlayers  = gs => Array.isArray(gs?.players) ? gs.players : [];
const safeProps    = gs => gs?.properties && typeof gs.properties==="object" ? gs.properties : {};
const safeLog      = gs => Array.isArray(gs?.log) ? gs.log : [];
const safeDice     = gs => Array.isArray(gs?.dice)&&gs.dice.length===2 ? gs.dice : [1,1];
const safeSettings = gs => ({...DEFAULT_SETTINGS,...(gs?.settings||{})});

function freshGameState(playerCount, settings={}, aiPlayers=[], aiConfigs={}) {
  return {
    players: Array.from({length:playerCount},(_,i)=>({
      id:i, money:1500, position:0,
      color:PLAYER_COLORS[i], token:PLAYER_TOKENS[i],
      inJail:false, jailTurns:0, bankrupt:false,
      jailFreeCards:0, frozenTurns:0, rentImmuneTurns:0,
      doubleRentTurns:0,
      isAI: aiPlayers.includes(i),
      aiConfig: aiConfigs[i] || { difficulty:"medium", personality:"aggressive" },
    })),
    properties:{}, currentPlayer:0, dice:[1,1],
    rolling:false, rolled:false, doubleCount:0, freePot:0,
    log:["🎲 Game started! Player 1's turn."],
    modal:null, status:"playing", hostPlayerCount:playerCount,
    settings:{...DEFAULT_SETTINGS,...settings,aiPlayers},
    turnStartTime:Date.now(), gameStartTime:Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI System — Difficulty + Personality
// ─────────────────────────────────────────────────────────────────────────────

// Difficulty profiles: each number is a 0–1 weight controlling AI behaviour
const AI_DIFFICULTY = {
  easy:       { buyThreshold:0.45, buildThreshold:0.30, monopolyBonus:0.10, riskTolerance:0.20, cashBuffer:300  },
  medium:     { buyThreshold:0.60, buildThreshold:0.55, monopolyBonus:0.25, riskTolerance:0.45, cashBuffer:200  },
  hard:       { buyThreshold:0.75, buildThreshold:0.75, monopolyBonus:0.45, riskTolerance:0.65, cashBuffer:150  },
  strategic:  { buyThreshold:0.88, buildThreshold:0.90, monopolyBonus:0.70, riskTolerance:0.80, cashBuffer:100  },
};

// Personality modifiers layered on top of difficulty
const AI_PERSONALITY = {
  aggressive:   { buyMod:+0.20, buildMod:+0.25, cashMod:-0.15 },
  conservative: { buyMod:-0.20, buildMod:-0.20, cashMod:+0.25 },
  monopolist:   { buyMod:+0.10, buildMod:+0.15, cashMod:0,    monopolyGroupBonus:0.40 },
  random:       { buyMod:0,     buildMod:0,     cashMod:0,    randomFactor:0.60 },
};

// Per-game AI config stored in player object
// player.aiConfig = { difficulty:"medium", personality:"aggressive" }

function aiShouldBuy(player, space, props, players, gs) {
  if (!space?.price) return false;
  const cfg   = player.aiConfig || { difficulty:"medium", personality:"aggressive" };
  const diff  = AI_DIFFICULTY[cfg.difficulty] || AI_DIFFICULTY.medium;
  const pers  = AI_PERSONALITY[cfg.personality] || AI_PERSONALITY.aggressive;

  // Random personality adds heavy noise
  if (cfg.personality === "random") return Math.random() > 0.45;

  const cashNeeded = space.price + (diff.cashBuffer + pers.cashMod * 200);
  if (player.money < cashNeeded) return false;

  const group      = COLOR_GROUPS[space.color] || [];
  const alreadyOwn = group.filter(id => props[id]?.owner === player.id).length;
  const groupRatio = group.length > 0 ? (alreadyOwn + 1) / group.length : 0;

  // Base score
  let score = diff.buyThreshold + pers.buyMod;

  // Bonus for monopoly potential
  const monoBonus = diff.monopolyBonus + (pers.monopolyGroupBonus || 0);
  score += groupRatio * monoBonus;

  // Railroads & utilities: always fairly attractive
  if (space.type === "railroad" || space.type === "utility") score += 0.15;

  // Blocking: if opponent almost has a monopoly, compete harder
  const opponents = (gs?.players || []).filter(p => p && !p.bankrupt && p.id !== player.id);
  const opponentNearMono = group.some(id =>
    props[id] && props[id].owner !== player.id &&
    group.filter(gid => props[gid]?.owner === props[id]?.owner).length >= group.length - 1
  );
  if (opponentNearMono) score += 0.20 * diff.riskTolerance;

  // Normalise 0–1 randomness threshold
  const roll = Math.random();
  return roll < score;
}

function aiShouldBuild(player, spaceId, props, gs) {
  const space = SPACES[spaceId]; if (!space?.houseCost) return false;
  const prop  = props[spaceId]; if (!prop || prop.hotel) return false;
  const cfg   = player.aiConfig || { difficulty:"medium", personality:"aggressive" };
  const diff  = AI_DIFFICULTY[cfg.difficulty] || AI_DIFFICULTY.medium;
  const pers  = AI_PERSONALITY[cfg.personality] || AI_PERSONALITY.aggressive;

  if (cfg.personality === "random") return Math.random() > 0.55;

  const cost = space.houseCost;
  if (player.money < cost + diff.cashBuffer) return false;

  let score = diff.buildThreshold + pers.buildMod;

  // More houses already built → more pressure to keep building
  score += (prop.houses || 0) * 0.08;

  return Math.random() < score;
}

function aiPickPropertyToSell(player, props) {
  // Sell cheapest non-monopoly property first, then cheapest overall
  const owned = Object.entries(props)
    .filter(([, p]) => p && p.owner === player.id)
    .map(([id]) => +id);

  // Prefer to sell ones that don't break a monopoly
  const nonMono = owned.filter(id => {
    const group = COLOR_GROUPS[SPACES[id]?.color] || [];
    return !group.every(gid => props[gid]?.owner === player.id);
  });

  const pool = nonMono.length > 0 ? nonMono : owned;
  pool.sort((a, b) => (SPACES[a]?.price || 0) - (SPACES[b]?.price || 0));
  return pool[0] ?? null;
}

// Jail strategy: harder difficulties pay fine; easy/random tries doubles
function aiJailStrategy(player) {
  const cfg  = player.aiConfig || { difficulty:"medium", personality:"aggressive" };
  const diff = AI_DIFFICULTY[cfg.difficulty] || AI_DIFFICULTY.medium;
  if ((player.jailFreeCards || 0) > 0) return "card";
  if (player.money >= 50 && diff.riskTolerance > 0.5) return "pay";
  return "roll";
}

// ─────────────────────────────────────────────────────────────────────────────
// DieFace
// ─────────────────────────────────────────────────────────────────────────────
function DieFace({value, shaking, landing}) {
  const dots = value || 1;
  return (
    <div className={`die face-${dots}${shaking?" dice-shake":landing?" dice-land":""}`}
      style={{
        border: shaking?"2px solid #f59e0b":"2px solid #444",
        boxShadow: shaking?"0 0 14px rgba(255,165,0,0.8)":landing?"0 0 20px gold":"2px 2px 6px rgba(0,0,0,0.3)"
      }}>
      {Array.from({length:dots}).map((_,i)=><div key={i} className="dot"/>)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BoardCell – shows property ownership highlight
// ─────────────────────────────────────────────────────────────────────────────
function BoardCell({spaceId, players, properties, isSelected, onClick, flashCell, bouncingPlayer}) {
  const space = SPACES[spaceId];
  if (!space) return <div style={{width:"100%",height:"100%"}}/>;

  const safeP  = Array.isArray(players)?players:[];
  const safeQ  = properties&&typeof properties==="object"?properties:{};
  const prop   = safeQ[spaceId];
  const here   = safeP.filter(p=>p&&p.position===spaceId&&!p.bankrupt);
  const isFlash= flashCell===spaceId;

  // Owner highlight
  const ownerColor = prop ? PLAYER_COLORS[prop.owner] : null;

  const bg =
    space.type==="go"?"#bbf7d0":space.type==="jail"?"#fef9c3":
    space.type==="gotojail"?"#fee2e2":space.type==="freeparking"?"#dcfce7":
    space.type==="chance"?"#ffedd5":space.type==="community"?"#dbeafe":
    space.type==="tax"?"#fce7f3":space.type==="railroad"?"#f5f5f5":
    space.type==="utility"?"#ecfdf5":"#ffffff";

  const shortName = space.name
    .replace(/ Avenue$/i,"").replace(/ Ave$/i,"")
    .replace(/ Place$/i,"").replace(/ Gardens$/i,"")
    .replace("Pennsylvania","PA").replace("North Carolina","NC")
    .replace("Reading Railroad","Reading RR")
    .replace("Jail / Just Visiting","Jail");

  return (
    <div onClick={onClick}
      className={`board-cell-hover${isFlash?" cell-pulse":""}`}
      style={{
        width:"100%",height:"100%",background:bg,
        border: isSelected?"2px solid #fbbf24":
          ownerColor?`2px solid ${ownerColor}`:"1px solid #9ca3af",
        cursor:"pointer",position:"relative",overflow:"hidden",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:1,
        boxShadow: isSelected?"inset 0 0 8px rgba(251,191,36,0.8)":
          ownerColor?`inset 0 0 5px ${ownerColor}55`:"none",
        transition:"box-shadow 0.15s",
      }}>
      {/* Color band */}
      {space.type==="property"&&space.color&&(
        <div style={{position:"absolute",top:0,left:0,right:0,height:7,background:space.color}}/>
      )}
      {/* Owner dot overlay */}
      {ownerColor&&(
        <div style={{
          position:"absolute",top:space.type==="property"?8:2,right:2,
          width:6,height:6,borderRadius:"50%",background:ownerColor,
          boxShadow:`0 0 3px ${ownerColor}`,
        }}/>
      )}
      <div style={{fontSize:6,fontWeight:700,textAlign:"center",lineHeight:1.2,
        marginTop:space.type==="property"?8:0,color:"#1f2937",padding:"0 1px"}}>
        {shortName}
      </div>
      {space.price&&<div style={{fontSize:5.5,color:"#6b7280"}}>${space.price}</div>}
      {prop&&<div style={{fontSize:7}}>{prop.hotel?"🏨":"🏠".repeat(prop.houses||0)}</div>}
      {here.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center"}}>
          {here.map(p=>(
            <span key={p.id} className={bouncingPlayer===p.id?"token-bounce":""}
              style={{fontSize:12,lineHeight:1,display:"inline-block"}}>{p.token}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PropertyCardModal – full Monopoly-style property deed card
// ─────────────────────────────────────────────────────────────────────────────
function PropertyCardModal({ spaceId, prop, players, myIdx, isMyTurn, onClose, onBuild, onBuy, allProps, playerIsOnSpace }) {
  const space = SPACES[spaceId];
  if (!space) return null;

  const owner      = prop != null ? players[prop.owner] : null;
  const isOwned    = prop != null;
  const isMine     = isOwned && prop.owner === myIdx;
  const me         = players[myIdx];
  const houses     = prop?.houses || 0;
  const hasHotel   = prop?.hotel || false;

  // Proper monopoly check using allProps
  const group       = COLOR_GROUPS[space.color] || [];
  const hasMonopoly = space.type === "property" && group.length > 0 &&
    group.every(id => allProps[id]?.owner === myIdx);

  const canAfford  = me && space.houseCost && me.money >= space.houseCost;
  const canBuild   = isMyTurn && isMine && space.type === "property" &&
    !hasHotel && hasMonopoly && canAfford;

  const mortgage   = space.price ? Math.floor(space.price / 2) : null;

  // Current effective rent level for highlight
  const currentLevel = hasHotel ? 5 : houses; // 0=base,1-4=houses,5=hotel

  const isRailroad  = space.type === "railroad";
  const isUtility   = space.type === "utility";
  const isColorProp = space.type === "property";

  // Header band colour
  const headerBg    = space.color || "#1a1a1a";
  const headerLight = ["#87CEEB","#fef9c3","#ffedd5","#ffffff"].includes(space.color);

  return (
    <div className="prop-card-overlay" onClick={onClose}>
      <div className="prop-card" onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button onClick={onClose} style={{
          position:"absolute", top:6, right:8,
          background:"none", border:"none", fontSize:18,
          cursor:"pointer", color: headerLight?"#1a1a1a":"#fff",
          fontWeight:"bold", lineHeight:1, zIndex:10,
        }}>✕</button>

        {/* ── Deed header ── */}
        <div className="prop-card-header"
          style={{ background: headerBg, borderBottom:"2px solid #1a1a1a" }}>
          <div style={{
            fontSize:9, fontWeight:700, textTransform:"uppercase",
            letterSpacing:2, color: headerLight?"#1a1a1a":"rgba(255,255,255,0.85)",
            marginBottom:2,
          }}>
            {isColorProp ? "Title Deed" : isRailroad ? "Railroad" : isUtility ? "Utility" : ""}
          </div>
          <div className="prop-card-title"
            style={{ color: headerLight?"#1a1a1a":"#fff", textShadow: headerLight?"none":"0 1px 3px rgba(0,0,0,0.4)" }}>
            {space.name}
          </div>

          {/* Ownership badge */}
          {isOwned && owner && (
            <div style={{
              display:"inline-flex", alignItems:"center", gap:4,
              marginTop:5, background:"rgba(255,255,255,0.25)",
              borderRadius:20, padding:"2px 10px",
            }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background: owner.color }} />
              <span style={{ fontSize:10, fontWeight:700, color: headerLight?"#1a1a1a":"#fff" }}>
                {owner.token} P{owner.id+1}{isMine?" (You)":""}
              </span>
              {hasMonopoly && isMine && (
                <span style={{ fontSize:9, background:"gold", color:"#1a1a1a",
                  padding:"0 5px", borderRadius:10, fontWeight:800 }}>★ MONOPOLY</span>
              )}
            </div>
          )}
          {!isOwned && (
            <div style={{
              display:"inline-block", marginTop:5,
              background:"rgba(255,255,255,0.25)", borderRadius:20,
              padding:"2px 10px", fontSize:10, color: headerLight?"#1a1a1a":"#fff", fontWeight:700,
            }}>For Sale</div>
          )}
        </div>

        {/* ── Price banner ── */}
        {space.price && (
          <div style={{
            textAlign:"center", padding:"7px 0 5px",
            borderBottom:"1px solid #e5e7eb",
            fontSize:13, color:"#374151",
          }}>
            <span style={{fontWeight:700, fontSize:15, color:"#1a1a1a"}}>${space.price}</span>
            <span style={{marginLeft:4, fontSize:11}}>purchase price</span>
          </div>
        )}

        {/* ── Rent table ── */}
        <div className="prop-card-body" style={{paddingTop:8}}>

          {isColorProp && space.rent && (
            <>
              <RentRow label="RENT"                   amount={space.rent[0]} active={currentLevel===0 && isOwned} />
              <RentRow label="With Color Set"         amount={space.rent[0]*2} active={false} note="(monopoly)" />
              <RentRow label="With 1 House"           amount={space.rent[1]} active={currentLevel===1} icon="🏠" />
              <RentRow label="With 2 Houses"          amount={space.rent[2]} active={currentLevel===2} icon="🏠🏠" />
              <RentRow label="With 3 Houses"          amount={space.rent[3]} active={currentLevel===3} icon="🏠🏠🏠" />
              <RentRow label="With 4 Houses"          amount={space.rent[4]} active={currentLevel===4} icon="🏠×4" />
              <RentRow label="With HOTEL"             amount={space.rent[5]} active={currentLevel===5} icon="🏨" hotel />
            </>
          )}

          {isRailroad && space.rent && (
            <>
              <RentRow label="Rent (1 railroad)"   amount={space.rent[0]} active={isOwned} />
              <RentRow label="Rent (2 railroads)"  amount={space.rent[1]} />
              <RentRow label="Rent (3 railroads)"  amount={space.rent[2]} />
              <RentRow label="Rent (4 railroads)"  amount={space.rent[3]} />
            </>
          )}

          {isUtility && (
            <>
              <RentRow label="Rent (1 utility)"   amount="4× dice roll" active={isOwned} />
              <RentRow label="Rent (2 utilities)" amount="10× dice roll" />
            </>
          )}
        </div>

        {/* ── Build section (own colour property) ── */}
        {isColorProp && space.houseCost && (
          <div className="prop-build-section">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:12, color:"#374151" }}>
                🏠 House cost: <strong>${space.houseCost}</strong>
              </span>
              {isOwned && (
                <span style={{ fontSize:14 }}>
                  {hasHotel ? "🏨" : houses > 0 ? "🏠".repeat(houses) : "—"}
                </span>
              )}
            </div>

            {/* Info: can only build when landed here */}
            {isMine && !playerIsOnSpace && !hasHotel && (
              <div style={{ fontSize:11, color:"#9ca3af", marginBottom:8, fontStyle:"italic",
                background:"#f9fafb", padding:"5px 8px", borderRadius:5 }}>
                🔒 You can only build here when you land on this property.
              </div>
            )}

            {/* Monopoly requirement */}
            {isMine && playerIsOnSpace && !hasMonopoly && (
              <div style={{ fontSize:11, color:"#9ca3af", marginBottom:8, fontStyle:"italic" }}>
                Own all {group.length} properties in this group to build.
              </div>
            )}

            {/* Build button — only when physically on this space AND have monopoly */}
            {onBuild && isMyTurn && !hasHotel && (
              <button
                onClick={() => onBuild(spaceId)}
                disabled={!canAfford}
                style={{
                  width:"100%", padding:"9px 0",
                  background: canAfford ? "#14532d" : "#9ca3af",
                  color:"#fff", border:"none", borderRadius:6,
                  fontSize:13, fontWeight:700,
                  cursor: canAfford ? "pointer" : "not-allowed",
                  marginBottom:8,
                }}>
                {houses >= 4
                  ? `🏨 Build Hotel — $${space.houseCost}`
                  : `🏠 Build House — $${space.houseCost}`}
              </button>
            )}
            {isMine && hasHotel && (
              <div style={{ textAlign:"center", fontSize:12, color:"#16a34a",
                fontWeight:700, marginBottom:8 }}>
                🏨 Hotel built — maximum level reached!
              </div>
            )}
            {onBuild && isMyTurn && !canAfford && !hasHotel && (
              <div style={{ textAlign:"center", fontSize:11, color:"#dc2626", marginBottom:8 }}>
                Not enough funds — need ${space.houseCost}
              </div>
            )}
          </div>
        )}

        {/* ── Buy button — only when physically on this space ── */}
        {!isOwned && space.price && (
          <div style={{ padding:"10px 14px 12px", borderTop:"2px solid #1a1a1a" }}>
            {onBuy ? (
              <button onClick={onBuy}
                disabled={!me || me.money < space.price}
                style={{
                  width:"100%", padding:"9px 0",
                  background: me && me.money >= space.price ? "#14532d" : "#9ca3af",
                  color:"#fff", border:"none", borderRadius:6,
                  fontSize:13, fontWeight:700,
                  cursor: me && me.money >= space.price ? "pointer" : "not-allowed",
                }}>
                Buy for ${space.price}
              </button>
            ) : (
              <div style={{ textAlign:"center", fontSize:11, color:"#9ca3af",
                fontStyle:"italic", padding:"4px 0" }}>
                {!isMyTurn ? "Not your turn" : !playerIsOnSpace ?
                  "🔒 Land on this property to buy it" : "Already owned"}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="prop-card-footer">
          <span>Mortgage value: <strong>${mortgage ?? "—"}</strong></span>
          {space.houseCost && <span>House cost: <strong>${space.houseCost}</strong></span>}
        </div>
      </div>
    </div>
  );
}

// Small helper row for the rent table
function RentRow({ label, amount, active, note, icon, hotel }) {
  return (
    <div className={`prop-rent-row${active ? " highlight" : ""}`}>
      <span className="label" style={{ display:"flex", alignItems:"center", gap:4 }}>
        {icon && <span style={{ fontSize:10 }}>{icon}</span>}
        {label}
        {note && <span style={{ fontSize:10, color:"#9ca3af" }}> {note}</span>}
        {active && <span style={{ fontSize:9, color:"#d97706", fontWeight:700, marginLeft:2 }}>← NOW</span>}
      </span>
      <span className="amount" style={{ color: hotel ? "#7c3aed" : active ? "#14532d" : "#1a1a1a" }}>
        {typeof amount === "number" ? `$${amount}` : amount}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TurnTimer
// ─────────────────────────────────────────────────────────────────────────────
function TurnTimer({turnStartTime, limit, onExpire, isMyTurn}) {
  const [remaining, setRemaining] = useState(limit);
  const expiredRef = useRef(false);

  useEffect(()=>{expiredRef.current=false; setRemaining(limit);},[turnStartTime,limit]);

  useEffect(()=>{
    if (!limit) return;
    const iv=setInterval(()=>{
      const left=Math.max(0,limit-Math.floor((Date.now()-turnStartTime)/1000));
      setRemaining(left);
      if (left===0&&!expiredRef.current) { expiredRef.current=true; if(isMyTurn) onExpire(); }
    },500);
    return ()=>clearInterval(iv);
  },[turnStartTime,limit,isMyTurn,onExpire]);

  if (!limit) return null;
  const pct=remaining/limit;
  const color=pct>0.5?"#16a34a":pct>0.25?"#d97706":"#dc2626";
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
      <div style={{flex:1,height:5,background:"#e5e7eb",borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct*100}%`,background:color,transition:"width 0.5s linear",borderRadius:3}}/>
      </div>
      <span className={remaining<=10?"timer-low":""} style={{fontSize:11,fontWeight:"bold",color,minWidth:26}}>
        {remaining}s
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GameTimer (Timed mode)
// ─────────────────────────────────────────────────────────────────────────────
function GameTimer({gameStartTime, limitMinutes, onExpire}) {
  const [remaining, setRemaining] = useState(limitMinutes*60);
  const expiredRef = useRef(false);
  useEffect(()=>{
    const iv=setInterval(()=>{
      const left=Math.max(0,limitMinutes*60-Math.floor((Date.now()-gameStartTime)/1000));
      setRemaining(left);
      if (left===0&&!expiredRef.current){expiredRef.current=true;onExpire();}
    },1000);
    return ()=>clearInterval(iv);
  },[gameStartTime,limitMinutes,onExpire]);
  const m=Math.floor(remaining/60), s=remaining%60;
  return (
    <span style={{fontSize:11,fontWeight:"bold",
      color:remaining<60?"#dc2626":"#14532d",
      background:remaining<60?"#fee2e2":"#dcfce7",
      padding:"2px 7px",borderRadius:10,flexShrink:0}}>
      ⏱ {m}:{s.toString().padStart(2,"0")}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Modal (popup inside waiting screen)
// ─────────────────────────────────────────────────────────────────────────────
function SettingsModal({settings, onChange, onClose, playerCount, setPlayerCount, maxPlayers}) {
  const [localSettings, setLocalSettings] = useState({...settings});
  const [customTarget, setCustomTarget]   = useState(String(settings.targetAmount||10000));

  const ls = (key,val) => setLocalSettings(p=>({...p,[key]:val}));

  const Pill=({label,active,onClick})=>(
    <button className={`pill${active?" active":""}`} onClick={onClick}>{label}</button>
  );

  const apply=()=>{ onChange(localSettings); onClose(); };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="slide-in" style={{background:"#fefce8",borderRadius:16,
        padding:"24px 28px",maxWidth:480,width:"100%",maxHeight:"88vh",
        overflowY:"auto",border:"4px solid #a16207",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <h2 style={{margin:0,color:"#14532d",fontSize:20}}>⚙️ Game Settings</h2>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#78716c"}}>✕</button>
        </div>

        {/* Players */}
        <SettSection title="👥 Players">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[2,3,4].map(n=>(
              <Pill key={n} label={`${n} Players`} active={playerCount===n}
                onClick={()=>setPlayerCount(Math.min(n,maxPlayers))}/>
            ))}
          </div>
        </SettSection>

        {/* AI Players */}
        <SettSection title="🤖 AI Opponents">
          <p style={{fontSize:12,color:"#78716c",margin:"0 0 8px"}}>
            Select which player slots are AI-controlled:
          </p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {Array.from({length:playerCount-1},(_,i)=>i+1).map(idx=>{
              const isAI=(localSettings.aiPlayers||[]).includes(idx);
              return (
                <Pill key={idx} label={`${PLAYER_TOKENS[idx]} P${idx+1} AI`} active={isAI}
                  onClick={()=>{
                    const ai=localSettings.aiPlayers||[];
                    ls("aiPlayers",isAI?ai.filter(x=>x!==idx):[...ai,idx]);
                  }}/>
              );
            })}
            {playerCount<=2&&<span style={{fontSize:12,color:"#9ca3af"}}>Add more players to enable AI</span>}
          </div>
        </SettSection>

        {/* Turn Timer */}
        <SettSection title="⏳ Turn Timer">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[[0,"No Timer"],[30,"30 sec"],[60,"60 sec"],[90,"90 sec"]].map(([v,label])=>(
              <Pill key={v} label={label} active={localSettings.turnTimer===v} onClick={()=>ls("turnTimer",v)}/>
            ))}
          </div>
          {localSettings.turnTimer>0&&(
            <p style={{fontSize:12,color:"#78716c",margin:"6px 0 0"}}>
              Turn auto-rolls and ends if timer expires.
            </p>
          )}
        </SettSection>

        {/* Game Mode */}
        <SettSection title="🏁 Game Mode">
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {[["classic","⚔️ Classic"],["timed","⏱ Timed"],["target","🎯 Target"]].map(([v,label])=>(
              <Pill key={v} label={label} active={localSettings.gameMode===v} onClick={()=>ls("gameMode",v)}/>
            ))}
          </div>
          {localSettings.gameMode==="classic"&&(
            <p style={{fontSize:12,color:"#78716c",margin:0}}>Last player standing wins.</p>
          )}
          {localSettings.gameMode==="timed"&&(
            <div>
              <p style={{fontSize:12,color:"#78716c",margin:"0 0 8px"}}>Richest player when time runs out wins.</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[[30,"30 min"],[60,"60 min"],[90,"90 min"]].map(([v,label])=>(
                  <Pill key={v} label={label} active={localSettings.timedMinutes===v}
                    onClick={()=>ls("timedMinutes",v)}/>
                ))}
              </div>
            </div>
          )}
          {localSettings.gameMode==="target"&&(
            <div>
              <p style={{fontSize:12,color:"#78716c",margin:"0 0 8px"}}>First to reach target net worth wins.</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {[5000,10000,25000].map(amt=>(
                  <Pill key={amt} label={`$${amt.toLocaleString()}`}
                    active={localSettings.targetAmount===amt}
                    onClick={()=>{ls("targetAmount",amt);setCustomTarget(String(amt));}}/>
                ))}
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13,color:"#555"}}>Custom $:</span>
                  <input value={customTarget}
                    onChange={e=>{
                      const v=e.target.value.replace(/\D/g,"");
                      setCustomTarget(v);
                      if(+v>=1000) ls("targetAmount",+v);
                    }}
                    style={{width:80,padding:"5px 8px",borderRadius:6,border:"2px solid #d6d3d1",fontSize:13,outline:"none"}}
                    placeholder="Amount"/>
                </div>
              </div>
            </div>
          )}
        </SettSection>

        {/* Summary */}
        <div style={{background:"#f0fdf4",border:"2px solid #bbf7d0",borderRadius:10,
          padding:"10px 14px",marginBottom:16,fontSize:12,color:"#333"}}>
          <strong style={{color:"#14532d"}}>Summary: </strong>
          {playerCount} players
          {(localSettings.aiPlayers||[]).length>0&&` (${localSettings.aiPlayers.length} AI)`}
          {" • "}
          {localSettings.turnTimer?`${localSettings.turnTimer}s timer`:"No timer"}
          {" • "}
          {localSettings.gameMode==="classic"?"Classic":
           localSettings.gameMode==="timed"?`Timed ${localSettings.timedMinutes}min`:
           `Target $${(localSettings.targetAmount||10000).toLocaleString()}`}
        </div>

        <button onClick={apply} style={{background:"#14532d",color:"#fff",border:"none",
          padding:"12px 0",borderRadius:10,fontSize:16,fontWeight:"bold",
          cursor:"pointer",width:"100%",letterSpacing:1}}>
          ✓ Apply Settings
        </button>
      </div>
    </div>
  );
}

function SettSection({title,children}) {
  return (
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:"bold",color:"#14532d",marginBottom:8,
        borderBottom:"2px solid #e7d9a0",paddingBottom:5}}>{title}</div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SwapPanel (own component to satisfy React hooks rules)
// ─────────────────────────────────────────────────────────────────────────────
function SwapPanel({props, myIdx, rawPlayers, onSwap, onDismiss}) {
  const [myPick, setMyPick]     = useState(null);
  const [theirPick, setTheirPick] = useState(null);
  const myProps    = Object.entries(props).filter(([,p])=>p&&p.owner===myIdx);
  const theirProps = Object.entries(props).filter(([,p])=>p&&p.owner!==myIdx);
  return (
    <div className="board-popup pop-in"
      style={{top:"50%",left:"50%",transform:"translate(-50%,-50%)",position:"fixed",zIndex:100,
        maxWidth:300,maxHeight:"80vh",overflowY:"auto"}}>
      <div style={{fontWeight:"bold",fontSize:14,color:"#14532d",marginBottom:8}}>🔄 Swap Properties</div>
      <div style={{fontSize:12,marginBottom:6,fontWeight:"bold"}}>Your property:</div>
      <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:10}}>
        {myProps.map(([id])=>{
          const s=SPACES[+id]; if(!s) return null;
          return <button key={id} onClick={()=>setMyPick(+id)}
            style={{padding:"4px 8px",border:`2px solid ${myPick===+id?"#14532d":"#d6d3d1"}`,
              borderRadius:6,cursor:"pointer",fontSize:12,background:myPick===+id?"#dcfce7":"#fff"}}>
            {s.name}
          </button>;
        })}
      </div>
      <div style={{fontSize:12,marginBottom:6,fontWeight:"bold"}}>Their property:</div>
      <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:10}}>
        {theirProps.map(([id,p])=>{
          const s=SPACES[+id]; if(!s) return null;
          return <button key={id} onClick={()=>setTheirPick(+id)}
            style={{padding:"4px 8px",border:`2px solid ${theirPick===+id?PLAYER_COLORS[p.owner]:"#d6d3d1"}`,
              borderRadius:6,cursor:"pointer",fontSize:12,background:theirPick===+id?`${PLAYER_COLORS[p.owner]}22`:"#fff"}}>
            {s.name} ({rawPlayers[p.owner]?.token})
          </button>;
        })}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>myPick&&theirPick&&onSwap(myPick,theirPick)}
          disabled={!myPick||!theirPick}
          style={btnStyle(!myPick||!theirPick?"#9ca3af":"#14532d",true)}>Swap</button>
        <button onClick={onDismiss} style={btnStyle("#6b7280",true)}>Skip</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board-level Popup (replaces full-screen modal for buy/card/jail etc.)
// ─────────────────────────────────────────────────────────────────────────────
function BoardPopup({modal, players, myIdx, isMyTurn, onBuy, onPass, onDismiss,
  onUseJailCard, onPayJailFine, onJailRoll,
  onSteal, onSwap, onBuildHouse, props, rawPlayers}) {

  if (!modal) return null;
  const PCOLORS = PLAYER_COLORS;

  // Jail options panel
  if (modal.type==="jail") {
    const player = players[myIdx];
    if (!player) return null;
    const hasCard=(player.jailFreeCards||0)>0;
    return (
      <div className="board-popup pop-in"
        style={{top:"50%",left:"50%",transform:"translate(-50%,-50%)",position:"fixed",zIndex:100}}>
        <div style={{fontSize:22,textAlign:"center",marginBottom:8}}>🔒</div>
        <div style={{fontWeight:"bold",fontSize:14,textAlign:"center",marginBottom:4,color:"#14532d"}}>
          You're in Jail!
        </div>
        <div style={{fontSize:12,color:"#78716c",textAlign:"center",marginBottom:12}}>
          Turn {(player.jailTurns||0)+1}/3 — Choose an option:
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {hasCard&&(
            <button onClick={onUseJailCard} style={btnStyle("#7c3aed")}>
              🃏 Use Get Out of Jail Free Card
            </button>
          )}
          <button onClick={onPayJailFine} disabled={player.money<50}
            style={btnStyle(player.money>=50?"#d97706":"#9ca3af")}>
            💰 Pay $50 Fine
          </button>
          <button onClick={onJailRoll} style={btnStyle("#14532d")}>
            🎲 Roll for Doubles
          </button>
        </div>
      </div>
    );
  }

  // Buy property
  if (modal.type==="buy") {
    const space=SPACES[modal.spaceId];
    const p=rawPlayers[modal.playerIdx];
    const isMe=modal.playerIdx===myIdx;
    if (!space||!p) return null;
    return (
      <div className="board-popup pop-in"
        style={{top:"50%",left:"50%",transform:"translate(-50%,-50%)",position:"fixed",zIndex:100}}>
        <div style={{fontSize:30,textAlign:"center",marginBottom:4}}>🏠</div>
        <div style={{fontWeight:"bold",fontSize:15,textAlign:"center",color:"#14532d",marginBottom:2}}>
          {space.name}
        </div>
        {space.color&&<div style={{height:8,background:space.color,borderRadius:3,margin:"6px 0"}}/>}
        <div style={{fontSize:13,textAlign:"center",margin:"6px 0"}}>
          Price: <strong>${space.price}</strong>
        </div>
        {isMe?(
          <>
            <div style={{fontSize:11,color:"#78716c",textAlign:"center",marginBottom:10}}>
              Your balance: ${p.money.toLocaleString()}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={onBuy} disabled={p.money<space.price}
                style={btnStyle(p.money>=space.price?"#14532d":"#9ca3af",true)}>
                Buy ✓
              </button>
              <button onClick={onPass} style={btnStyle("#dc2626",true)}>
                Pass ✗
              </button>
            </div>
          </>
        ):(
          <p style={{fontSize:12,color:"#78716c",textAlign:"center",margin:0}}>
            {p.token} P{p.id+1} is deciding...
          </p>
        )}
      </div>
    );
  }

  // Build house (own property)
  if (modal.type==="build") {
    const space=SPACES[modal.spaceId];
    const prop=props[modal.spaceId];
    if (!space||!prop) return null;
    const houses=prop.houses||0;
    const canBuild=!prop.hotel&&modal.canBuild;
    return (
      <div className="board-popup pop-in"
        style={{top:"50%",left:"50%",transform:"translate(-50%,-50%)",position:"fixed",zIndex:100}}>
        <div style={{fontWeight:"bold",fontSize:14,color:"#14532d",marginBottom:6}}>{space.name}</div>
        {space.color&&<div style={{height:8,background:space.color,borderRadius:3,margin:"4px 0 8px"}}/>}
        <div style={{fontSize:12,marginBottom:8}}>
          {prop.hotel?"🏨 Hotel built":houses>0?`🏠 × ${houses} houses`:"No buildings yet"}
        </div>
        <div style={{fontSize:12,color:"#78716c",marginBottom:10}}>
          Build cost: ${space.houseCost}/house
        </div>
        <div style={{display:"flex",gap:8}}>
          {canBuild&&(
            <button onClick={()=>onBuildHouse(modal.spaceId)} style={btnStyle("#14532d",true)}>
              {houses>=4?"🏨 Build Hotel":"🏠 Build House"}
            </button>
          )}
          <button onClick={onDismiss} style={btnStyle("#6b7280",true)}>Close</button>
        </div>
        {!canBuild&&<p style={{fontSize:11,color:"#dc2626",margin:"8px 0 0"}}>
          {prop.hotel?"Max level!":"Need full color group first."}
        </p>}
      </div>
    );
  }

  // Card (Chance / Community)
  if (modal.type==="card") {
    return (
      <div className="board-popup pop-in"
        style={{top:"50%",left:"50%",transform:"translate(-50%,-50%)",position:"fixed",zIndex:100}}>
        <div style={{fontSize:28,textAlign:"center",marginBottom:6}}>
          {modal.title?.startsWith("❓")?"❓":"📋"}
        </div>
        <div style={{fontWeight:"bold",color:"#14532d",fontSize:14,textAlign:"center",marginBottom:6}}>
          {modal.title}
        </div>
        <p style={{fontStyle:"italic",fontSize:13,textAlign:"center",color:"#292524",margin:"0 0 12px"}}>
          "{modal.text}"
        </p>
        {isMyTurn?(
          <button onClick={onDismiss} style={btnStyle("#14532d")}>OK</button>
        ):(
          <p style={{fontSize:11,color:"#78716c",textAlign:"center",margin:0}}>
            Waiting for current player...
          </p>
        )}
      </div>
    );
  }

  // Special card effect: steal
  if (modal.type==="steal") {
    return (
      <div className="board-popup pop-in"
        style={{top:"50%",left:"50%",transform:"translate(-50%,-50%)",position:"fixed",zIndex:100}}>
        <div style={{fontWeight:"bold",fontSize:14,color:"#14532d",marginBottom:8}}>🃏 Steal a Property!</div>
        <p style={{fontSize:12,color:"#555",marginBottom:12}}>Pick an opponent's property to take:</p>
        <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
          {Object.entries(props).map(([id,p])=>{
            if (!p||p.owner===myIdx) return null;
            const space=SPACES[+id]; if(!space) return null;
            return (
              <button key={id} onClick={()=>onSteal(+id)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",
                  background:`${PLAYER_COLORS[p.owner]}22`,border:`1px solid ${PLAYER_COLORS[p.owner]}`,
                  borderRadius:6,cursor:"pointer",fontSize:12}}>
                {space.color&&<div style={{width:8,height:8,borderRadius:"50%",background:space.color}}/>}
                <span style={{flex:1,textAlign:"left"}}>{space.name}</span>
                <span>{rawPlayers[p.owner]?.token}</span>
              </button>
            );
          })}
        </div>
        <button onClick={onDismiss} style={{...btnStyle("#6b7280"),marginTop:8}}>Skip</button>
      </div>
    );
  }

  // Special card effect: swap
  if (modal.type==="swap") {
    return <SwapPanel props={props} myIdx={myIdx} rawPlayers={rawPlayers} onSwap={onSwap} onDismiss={onDismiss}/>;
  }

  // Notification (other player action)
  if (modal.type==="notify") {
    return (
      <div className="board-popup pop-in"
        style={{bottom:16,right:16,position:"fixed",zIndex:100,maxWidth:240,animation:"slideIn 0.2s ease-out"}}>
        <div style={{fontSize:13,color:"#14532d",fontWeight:"bold",marginBottom:4}}>{modal.title}</div>
        <div style={{fontSize:12,color:"#555"}}>{modal.text}</div>
        <button onClick={onDismiss} style={{...btnStyle("#14532d"),marginTop:8,fontSize:11,padding:"4px 12px"}}>OK</button>
      </div>
    );
  }

  return null;
}

function btnStyle(bg, half=false) {
  return {
    background:bg,color:"#fff",border:"none",padding:"9px 0",
    borderRadius:8,fontSize:14,fontWeight:"bold",cursor:"pointer",
    width:half?"50%":"100%",transition:"opacity 0.15s"
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── State ──
  const [screen, setScreen]               = useState("lobby");
  const [lobbyMode, setLobbyMode]         = useState("multiplayer"); // "multiplayer" | "ai"
  const [playerCount, setPlayerCount]     = useState(2);
  const [roomCode, setRoomCode]           = useState("");
  const [joinCode, setJoinCode]           = useState("");
  const [myIdx, setMyIdx]                 = useState(null);
  const [isHost, setIsHost]               = useState(false);
  const [gameState, setGameState]         = useState(null);
  const [isLocalGame, setIsLocalGame]     = useState(false); // true for AI-only games
  const [lobbyPlayers, setLobbyPlayers]   = useState([]);
  const [error, setError]                 = useState("");
  const [processing, setProcessing]       = useState(false);
  const [settings, setSettings]           = useState({...DEFAULT_SETTINGS});
  const [showSettings, setShowSettings]   = useState(false);
  const [chatMessages, setChatMessages]   = useState([]);
  const [chatInput, setChatInput]         = useState("");
  const chatEndRef                        = useRef(null);

  // AI mode config
  const [aiOpponentCount, setAiOpponentCount] = useState(1);
  const [aiDifficulty, setAiDifficulty]       = useState("medium");
  const [aiPersonality, setAiPersonality]     = useState("aggressive");

  // Animation state
  const [diceLanding, setDiceLanding]     = useState(false);
  const [flashCell, setFlashCell]         = useState(null);
  const [bouncingPlayer, setBouncingPlayer] = useState(null);
  const [visualPositions, setVisualPositions] = useState({});

  // Sell-to-pay flow
  const [sellToPay, setSellToPay]         = useState(null); // {amount, playerId}
  // Property card viewer
  const [selectedSpace, setSelectedSpace] = useState(null);

  const gsRef            = useRef(null);
  const myIdxRef         = useRef(null);
  const prevDiceRef      = useRef([1,1]);
  const prevPositionsRef = useRef(null);
  const aiTimerRef       = useRef(null);

  gsRef.current    = gameState;
  myIdxRef.current = myIdx;

  // Inject CSS once
  useEffect(()=>{
    if (document.getElementById("mono-style")) return;
    const el=document.createElement("style");
    el.id="mono-style"; el.textContent=STYLE;
    document.head.appendChild(el);
  },[]);

  // ── Firebase: game state ──
  useEffect(()=>{
    if (!roomCode||screen==="lobby") return;
    const gameRef=ref(db,`games/${roomCode}/state`);
    const unsub=onValue(gameRef,snap=>{
      if (!snap.exists()) return;
      const data=snap.val();
      if (data.properties==null)      data.properties={};
      if (!Array.isArray(data.log))   data.log=[];
      if (!Array.isArray(data.dice))  data.dice=[1,1];
      if (!Array.isArray(data.players)) data.players=[];

      const prev=prevDiceRef.current, nd=data.dice;
      if ((prev[0]!==nd[0]||prev[1]!==nd[1])&&!data.rolling) {
        prevDiceRef.current=nd;
        setDiceLanding(true);
        setTimeout(()=>setDiceLanding(false),500);
      }
      if (data.rolling) setDiceLanding(false);
      setGameState(data);
      if (data.status==="playing"&&screen==="waiting") setScreen("game");
    });
    return ()=>unsub();
  },[roomCode,screen]);

  // ── Firebase: lobby ──
  useEffect(()=>{
    if (!roomCode||screen!=="waiting") return;
    const lobbyRef=ref(db,`games/${roomCode}/lobby`);
    const unsub=onValue(lobbyRef,snap=>{
      if (snap.exists()) setLobbyPlayers(Object.values(snap.val()).filter(Boolean));
    });
    return ()=>unsub();
  },[roomCode,screen]);

  // ── Firebase: chat ──
  useEffect(()=>{
    if (!roomCode||screen==="lobby") return;
    const chatRef=ref(db,`games/${roomCode}/chat`);
    const unsub=onValue(chatRef,snap=>{
      if (snap.exists()) {
        const msgs=Object.values(snap.val()).sort((a,b)=>a.ts-b.ts);
        setChatMessages(msgs);
        setTimeout(()=>chatEndRef.current?.scrollIntoView({behavior:"smooth"}),50);
      } else setChatMessages([]);
    });
    return ()=>unsub();
  },[roomCode,screen]);

  // ── Non-host: watch for game start ──
  useEffect(()=>{
    if (screen!=="waiting"||isHost) return;
    const stRef=ref(db,`games/${roomCode}/state/status`);
    const unsub=onValue(stRef,snap=>{
      if (snap.exists()&&snap.val()==="playing") setScreen("game");
    });
    return ()=>unsub();
  },[screen,isHost,roomCode]);

  // ── Position animation ──
  useEffect(()=>{
    if (!gameState) return;
    const players=safePlayers(gameState);
    if (!players.length) return;
    if (prevPositionsRef.current===null) {
      const seed={};
      players.forEach(p=>{if(p) seed[p.id]=p.position;});
      prevPositionsRef.current=seed; return;
    }
    players.forEach(p=>{
      if (!p||p.bankrupt) return;
      const prev=prevPositionsRef.current[p.id];
      if (prev===undefined){prevPositionsRef.current[p.id]=p.position;return;}
      if (prev!==p.position){
        const steps=p.position>prev?p.position-prev:(40-prev)+p.position;
        prevPositionsRef.current[p.id]=p.position;
        animateSteps(p.id,prev,steps);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gameState?.players?.map(p=>p?.position+"").join(","),gameState?.status]);

  // ── Close property card when a game-modal appears ──
  useEffect(()=>{
    if (gameState?.modal) setSelectedSpace(null);
  },[gameState?.modal]);

  // ── Target-win check ──
  useEffect(()=>{
    if (!gameState||gameState.status!=="playing") return;
    const s=safeSettings(gameState);
    if (s.gameMode!=="target") return;
    const winner=safePlayers(gameState).find(p=>!p.bankrupt&&p.money>=(s.targetAmount||10000));
    if (winner) {
      const log=safeLog(gameState);
      log.unshift(`🏆 ${winner.token} reached $${s.targetAmount}! WINNER!`);
      pushState({...gameState,status:"gameover",log:log.slice(0,25)});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gameState?.players?.map(p=>p?.money+"").join(",")]);

  // ── AI turn trigger ──
  useEffect(()=>{
    if (!gameState||gameState.status!=="playing") return;
    if (gameState.modal) return; // wait for modal to clear
    const s=safeSettings(gameState);
    const cur=safePlayers(gameState)[gameState.currentPlayer];
    if (!cur||!cur.isAI||cur.bankrupt) return;
    if (processing) return;

    clearTimeout(aiTimerRef.current);
    aiTimerRef.current=setTimeout(()=>{
      runAITurn();
    }, 1200);
    return ()=>clearTimeout(aiTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gameState?.currentPlayer, gameState?.rolled, gameState?.status, gameState?.modal, processing]);

  const animateSteps=(playerId,from,steps)=>{
    const STEP_MS=200; let step=0;
    const tick=()=>{
      if (step>=steps){
        setFlashCell(null); setBouncingPlayer(playerId);
        setTimeout(()=>setBouncingPlayer(null),600);
        setVisualPositions(prev=>{const n={...prev};delete n[playerId];return n;});
        return;
      }
      const curPos=(from+step+1)%40;
      setFlashCell(curPos);
      setVisualPositions(prev=>({...prev,[playerId]:curPos}));
      step++; setTimeout(tick,STEP_MS);
    };
    setTimeout(tick,50);
  };

  // ── pushState — works for local AI games and Firebase multiplayer ──
  const isLocalGameRef = useRef(false);
  isLocalGameRef.current = isLocalGame;

  const pushState=useCallback((s)=>{
    const safe={...s,
      properties:s.properties&&typeof s.properties==="object"?s.properties:{},
      log:Array.isArray(s.log)?s.log:[],
      dice:Array.isArray(s.dice)?s.dice:[1,1],
      players:Array.isArray(s.players)?s.players:[],
      rolling:s.rolling??false,
    };
    if (isLocalGameRef.current) {
      // Local AI game: update state directly, return a resolved promise
      setGameState(safe);
      return Promise.resolve();
    }
    return set(ref(db,`games/${roomCode}/state`),safe);
  },[roomCode]);

  const isMyTurn=gameState&&myIdx===gameState.currentPlayer;

  // ── Rent calculation ──
  const calcRent=(space,prop,props,dice,attacker)=>{
    const p2=props&&typeof props==="object"?props:{};
    let rent=0;
    if (space.type==="railroad"){
      const count=Object.entries(p2).filter(([k,v])=>v&&v.owner===prop.owner&&SPACES[+k]?.type==="railroad").length;
      rent=space.rent[Math.min(count-1,3)];
    } else if (space.type==="utility"){
      const count=Object.entries(p2).filter(([k,v])=>v&&v.owner===prop.owner&&SPACES[+k]?.type==="utility").length;
      const d=Array.isArray(dice)?dice:[1,1];
      rent=(d[0]+d[1])*(count===2?10:4);
    } else {
      const group=COLOR_GROUPS[space.color]||[];
      const monopoly=group.every(id=>p2[id]?.owner===prop.owner);
      rent=prop.hotel?space.rent[5]:(prop.houses||0)>0?space.rent[prop.houses]:monopoly?space.rent[0]*2:space.rent[0];
    }
    // Double rent effect on owner
    const owner=safePlayers(gsRef.current)[prop.owner];
    if ((owner?.doubleRentTurns||0)>0) rent*=2;
    return rent;
  };

  // ── Sell property (for bankruptcy prevention) ──
  const sellProperty=(spaceId)=>{
    if (!gameState) return;
    const gs=gsRef.current;
    const players=safePlayers(gs).map(p=>({...p}));
    const props=safeProps(gs);
    const prop=props[spaceId];
    if (!prop) return;
    const space=SPACES[spaceId];
    const sellPrice=Math.floor((space.price||0)/2);
    players[prop.owner]={...players[prop.owner],money:players[prop.owner].money+sellPrice};
    const newProps={...props};
    delete newProps[spaceId];
    const log=safeLog(gs);
    log.unshift(`${players[prop.owner].token} sold ${space.name} for $${sellPrice}`);
    // Check if debt cleared
    if (sellToPay&&players[prop.owner].money>=sellToPay.amount) {
      setSellToPay(null);
    }
    pushState({...gs,players,properties:newProps,log:log.slice(0,25)});
  };

  // ── Space action handler ──
  const doSpaceAction=(spaceId,player,gs,props,isDouble)=>{
    const space=SPACES[spaceId];
    if (!space){pushState({...gs,rolled:true,rolling:false});setProcessing(false);return;}
    const players=safePlayers(gs).map(p=>({...p}));
    const log=safeLog(gs);
    const curIdx=gs.currentPlayer;
    const s=safeSettings(gs);
    const now=Date.now();

    const finishTurn=(updP,updProps,updFP,modal,forceEnd)=>{
      const finalPlayers=updP||players;
      // Decrement special-effect counters
      finalPlayers.forEach((p,i)=>{
        if (p&&(p.doubleRentTurns||0)>0) finalPlayers[i]={...p,doubleRentTurns:p.doubleRentTurns-1};
        if (p&&(p.rentImmuneTurns||0)>0) finalPlayers[i]={...finalPlayers[i],rentImmuneTurns:p.rentImmuneTurns-1};
      });
      // Target win check
      if (s.gameMode==="target"){
        const w=finalPlayers.find(p=>!p.bankrupt&&p.money>=(s.targetAmount||10000));
        if (w){
          log.unshift(`🏆 ${w.token} reached $${s.targetAmount}!`);
          pushState({...gs,players:finalPlayers,properties:updProps!==undefined?updProps:props,
            freePot:updFP!==undefined?updFP:(gs.freePot||0),rolling:false,status:"gameover",
            modal:null,log:log.slice(0,25)}).then(()=>setProcessing(false));
          return;
        }
      }
      pushState({...gs,players:finalPlayers,
        properties:updProps!==undefined?updProps:props,
        freePot:updFP!==undefined?updFP:(gs.freePot||0),
        rolled:forceEnd?true:!isDouble, rolling:false,
        modal:modal||null, log,
        turnStartTime:forceEnd||!isDouble?now:gs.turnStartTime,
      }).then(()=>setProcessing(false));
    };

    if (space.type==="go"||space.type==="jail"){
      finishTurn(null,undefined,undefined,null,false);
    } else if (space.type==="gotojail"){
      log.unshift(`${player.token} — Go To Jail! 🔒`);
      players[curIdx]={...player,position:10,inJail:true,jailTurns:0};
      finishTurn(players,undefined,undefined,null,true);
    } else if (space.type==="tax"){
      const amt=space.amount||0;
      log.unshift(`${player.token} pays ${space.name}: $${amt}`);
      players[curIdx]={...player,money:player.money-amt};
      if (players[curIdx].money<0) checkBankruptcy(curIdx,amt,players,props,gs,log,finishTurn); else
      finishTurn(players,undefined,(gs.freePot||0)+amt,null,false);
    } else if (space.type==="freeparking"){
      const pot=gs.freePot||0;
      log.unshift(`${player.token} collects Free Parking: $${pot}!`);
      players[curIdx]={...player,money:player.money+pot};
      finishTurn(players,undefined,0,null,false);
    } else if (space.type==="chance"){
      const card=CHANCE_CARDS[Math.floor(Math.random()*CHANCE_CARDS.length)];
      log.unshift(`❓ Chance: ${card.text}`);
      const acted=card.needsGs?card.action(player,gs):card.action(player);
      const specialEffect=acted.specialEffect;
      const cleanPlayer={...acted};delete cleanPlayer.specialEffect;
      players[curIdx]=cleanPlayer;

      if (specialEffect?.type==="freeze"){
        const tid=specialEffect.targetId;
        if (players[tid]) players[tid]={...players[tid],frozenTurns:(players[tid].frozenTurns||0)+1};
        log.unshift(`❄️ ${player.token} froze ${players[tid]?.token||"?"}!`);
        finishTurn(players,undefined,undefined,{type:"card",title:"❓ Chance!",text:card.text},false);
      } else if (specialEffect?.type==="steal"){
        finishTurn(players,undefined,undefined,{type:"steal"},false);
      } else if (specialEffect?.type==="swap"){
        finishTurn(players,undefined,undefined,{type:"swap"},false);
      } else if (specialEffect?.type==="forceTransfer"){
        const tid=specialEffect.targetId;
        const cheapest=Object.entries(props).find(([,p])=>p&&p.owner===tid);
        if (cheapest){
          const [cid]=cheapest;
          log.unshift(`💸 ${player.token} took ${SPACES[+cid]?.name} from ${players[tid]?.token}!`);
          const newProps={...props,[cid]:{...props[cid],owner:curIdx}};
          finishTurn(players,newProps,undefined,{type:"card",title:"❓ Chance!",text:card.text},false);
        } else {
          finishTurn(players,undefined,undefined,{type:"card",title:"❓ Chance!",text:card.text},false);
        }
      } else {
        finishTurn(players,undefined,undefined,{type:"card",title:"❓ Chance!",text:card.text},false);
      }
    } else if (space.type==="community"){
      const card=COMMUNITY_CARDS[Math.floor(Math.random()*COMMUNITY_CARDS.length)];
      log.unshift(`📋 Community: ${card.text}`);
      players[curIdx]=card.action(player);
      finishTurn(players,undefined,undefined,{type:"card",title:"📋 Community Chest!",text:card.text},false);
    } else if (space.type==="property"||space.type==="railroad"||space.type==="utility"){
      const prop=props[spaceId];
      if (!prop){
        // AI auto-decides
        if (player.isAI){
          const shouldBuy = aiShouldBuy(player, space, props, players, gs);
          if (shouldBuy){
            log.unshift(`🤖 ${player.token} bought ${space.name}!`);
            players[curIdx]={...player,money:player.money-space.price};
            finishTurn(players,{...props,[spaceId]:{owner:curIdx,houses:0,hotel:false}},undefined,null,false);
          } else {
            finishTurn(null,undefined,undefined,null,false);
          }
        } else {
          finishTurn(null,undefined,undefined,{type:"buy",spaceId,playerIdx:curIdx},false);
        }
      } else if (prop.owner!==curIdx){
        // Rent immunity?
        if ((player.rentImmuneTurns||0)>0){
          log.unshift(`🛡️ ${player.token} is rent-immune this turn!`);
          finishTurn(null,undefined,undefined,null,false);
          return;
        }
        const rent=calcRent(space,prop,props,gs.dice,player);
        log.unshift(`${player.token} pays $${rent} rent to ${players[prop.owner]?.token||"?"}`);
        const newMoney=player.money-rent;
        players[curIdx]={...player,money:newMoney};
        if (players[prop.owner]) players[prop.owner]={...players[prop.owner],money:players[prop.owner].money+rent};
        if (newMoney<0){
          // Trigger sell-to-pay
          if (!player.isAI){
            setSellToPay({amount:Math.abs(newMoney),playerId:curIdx});
            finishTurn(players,undefined,undefined,null,false);
          } else {
            // AI sells automatically
            let debt=Math.abs(newMoney); const newProps={...props};
            const ownedIds=Object.entries(newProps).filter(([,p])=>p&&p.owner===curIdx).map(([id])=>+id);
            ownedIds.forEach(id=>{
              if (debt<=0) return;
              const sellPrice=Math.floor((SPACES[id]?.price||0)/2);
              players[curIdx]={...players[curIdx],money:players[curIdx].money+sellPrice};
              delete newProps[id]; debt-=sellPrice;
              log.unshift(`🤖 ${player.token} sold ${SPACES[id]?.name} to pay debt`);
            });
            if (players[curIdx].money<0){
              log.unshift(`${player.token} is BANKRUPT! 💸`);
              players[curIdx]={...players[curIdx],bankrupt:true};
            }
            finishTurn(players,newProps,undefined,null,false);
          }
        } else {
          finishTurn(players,undefined,undefined,null,false);
        }
      } else {
        // Own property — open the property card so player can choose to build
        const group=COLOR_GROUPS[space.color]||[];
        const hasMonopoly=space.type==="property"&&group.every(id=>props[id]?.owner===curIdx);
        if (!player.isAI){
          // Open the property card; build button lives inside it
          finishTurn(null,undefined,undefined,null,false);
          // Use a short delay so finishTurn writes to Firebase first
          setTimeout(()=>setSelectedSpace(spaceId), 350);
        } else {
          // AI: auto-build using personality/difficulty logic
          if (hasMonopoly&&!props[spaceId]?.hotel&&aiShouldBuild(player,spaceId,props,gs)){
            const prop=props[spaceId];
            const newProp=(prop.houses||0)>=4
              ?{...prop,houses:0,hotel:true}
              :{...prop,houses:(prop.houses||0)+1};
            players[curIdx]={...player,money:player.money-(space.houseCost||100)};
            const log2=safeLog(gs);
            log2.unshift(`🤖 ${player.token} built ${newProp.hotel?"🏨 hotel":"🏠 house"} on ${space.name}!`);
            finishTurn(players,{...props,[spaceId]:newProp},undefined,null,false);
          } else {
            finishTurn(null,undefined,undefined,null,false);
          }
        }
      }
    } else {
      finishTurn(null,undefined,undefined,null,false);
    }
  };

  function checkBankruptcy(curIdx,amount,players,props,gs,log,finishTurn){
    // handled via sellToPay UI or AI auto-sell
    log.unshift(`${players[curIdx].token} is BANKRUPT! 💸`);
    players[curIdx]={...players[curIdx],bankrupt:true};
    finishTurn(players,undefined,(gs.freePot||0)+amount,null,false);
  }

  const doMoveAndAction=(player,steps,gs,props,isDouble,d1,d2)=>{
    const players=safePlayers(gs).map(p=>({...p}));
    const oldPos=player.position, newPos=(oldPos+steps)%40;
    const log=safeLog(gs);
    let bonus=0;
    if (oldPos+steps>=40){bonus=200;log.unshift(`${player.token} passed GO — +$200!`);}
    log.unshift(`${player.token} → ${SPACES[newPos].name}`);
    const updPlayer={...player,position:newPos,money:player.money+bonus};
    players[gs.currentPlayer]=updPlayer;
    const newGs={...gs,players,dice:[d1,d2],log:log.slice(0,25),rolling:false};
    const TOTAL_ANIM_MS=steps*200+300;
    pushState(newGs).then(()=>{
      setTimeout(()=>doSpaceAction(newPos,updPlayer,newGs,props,isDouble),TOTAL_ANIM_MS);
    });
  };

  // ── Jail escape ──
  const handleJailRoll=()=>{
    if (!isMyTurn||processing) return;
    setProcessing(true);
    const gs=gsRef.current;
    const players=safePlayers(gs).map(p=>({...p}));
    const props=safeProps(gs);
    const player=players[gs.currentPlayer];
    const d1=Math.ceil(Math.random()*6), d2=Math.ceil(Math.random()*6);
    const isDouble=d1===d2;
    const log=safeLog(gs);
    log.unshift(`${player.token} rolls ${d1}+${d2}${isDouble?" 🎲 Doubles!":""}`);
    pushState({...gs,rolling:true,log:log.slice(0,25)});
    setTimeout(()=>{
      if (isDouble){
        log.unshift(`${player.token} escaped jail with doubles!`);
        const freed={...player,inJail:false,jailTurns:0};
        players[gs.currentPlayer]=freed;
        const newGs={...gs,players,dice:[d1,d2],doubleCount:0,rolling:false,
          log:log.slice(0,25),modal:null};
        pushState(newGs).then(()=>setTimeout(()=>doMoveAndAction(freed,d1+d2,newGs,props,false,d1,d2),300));
      } else {
        const newJT=(player.jailTurns||0)+1;
        players[gs.currentPlayer]={...player,jailTurns:newJT};
        if (newJT>=3){
          log.unshift(`${player.token} served 3 turns — released!`);
          players[gs.currentPlayer]={...players[gs.currentPlayer],inJail:false,jailTurns:0};
          const freed=players[gs.currentPlayer];
          const newGs={...gs,players,dice:[d1,d2],rolling:false,log:log.slice(0,25),modal:null};
          pushState(newGs).then(()=>setTimeout(()=>doMoveAndAction(freed,d1+d2,newGs,props,false,d1,d2),300));
        } else {
          log.unshift(`${player.token} still in jail (${newJT}/3 turns)`);
          pushState({...gs,players,dice:[d1,d2],rolled:true,rolling:false,
            log:log.slice(0,25),modal:null}).then(()=>setProcessing(false));
        }
      }
    },900);
  };

  const handlePayJailFine=()=>{
    if (!isMyTurn||processing) return;
    const gs=gsRef.current;
    const players=safePlayers(gs).map(p=>({...p}));
    const player=players[myIdx];
    if (!player||player.money<50) return;
    setProcessing(true);
    players[myIdx]={...player,money:player.money-50,inJail:false,jailTurns:0};
    const log=safeLog(gs); log.unshift(`${player.token} paid $50 fine — released!`);
    pushState({...gs,players,log:log.slice(0,25),modal:null}).then(()=>setProcessing(false));
  };

  const handleUseJailCard=()=>{
    if (!isMyTurn||processing) return;
    const gs=gsRef.current;
    const players=safePlayers(gs).map(p=>({...p}));
    const player=players[myIdx];
    if (!player||(player.jailFreeCards||0)<=0) return;
    setProcessing(true);
    players[myIdx]={...player,jailFreeCards:player.jailFreeCards-1,inJail:false,jailTurns:0};
    const log=safeLog(gs); log.unshift(`${player.token} used a Get Out of Jail Free card! 🃏`);
    pushState({...gs,players,log:log.slice(0,25),modal:null}).then(()=>setProcessing(false));
  };

  // ── Roll ──
  const handleRoll=()=>{
    if (!isMyTurn||gameState.rolled||processing) return;
    const gs=gsRef.current;
    const players=safePlayers(gs).map(p=>({...p}));
    const player=players[gs.currentPlayer];
    if (!player||player.bankrupt){advanceTurn(gs);return;}

    // Frozen check
    if ((player.frozenTurns||0)>0){
      const log=safeLog(gs); log.unshift(`❄️ ${player.token} is frozen this turn!`);
      players[gs.currentPlayer]={...player,frozenTurns:player.frozenTurns-1};
      setProcessing(true);
      pushState({...gs,players,rolled:true,log:log.slice(0,25)}).then(()=>setProcessing(false));
      return;
    }

    // Jail check
    if (player.inJail){
      pushState({...gs,modal:{type:"jail"}});
      return;
    }

    setProcessing(true);
    const d1=Math.ceil(Math.random()*6), d2=Math.ceil(Math.random()*6);
    const isDouble=d1===d2, newDC=isDouble?(gs.doubleCount||0)+1:0;
    const log=safeLog(gs);
    log.unshift(`${player.token} rolls ${d1}+${d2}=${d1+d2}${isDouble?" 🎲 Doubles!":""}`);
    pushState({...gs,rolling:true,log:log.slice(0,25)});

    setTimeout(()=>{
      if (newDC===3){
        log.unshift(`${player.token} rolled 3 doubles — Jail! 🔒`);
        players[gs.currentPlayer]={...player,position:10,inJail:true,jailTurns:0};
        pushState({...gs,players,dice:[d1,d2],rolled:true,rolling:false,doubleCount:0,log:log.slice(0,25)})
          .then(()=>setProcessing(false));
        return;
      }
      doMoveAndAction(player,d1+d2,{...gs,players,doubleCount:newDC,log:log.slice(0,25)},safeProps(gs),isDouble,d1,d2);
    },900);
  };

  // ── AI Turn ──
  const runAITurn=()=>{
    const gs=gsRef.current;
    if (!gs||gs.status!=="playing"||gs.modal) return;
    const players=safePlayers(gs).map(p=>({...p}));
    const cur=players[gs.currentPlayer];
    if (!cur||!cur.isAI||cur.bankrupt) return;
    setProcessing(true);

    if (gs.rolled){
      // AI ends turn
      setTimeout(()=>advanceTurn(gs),800);
      return;
    }

    if (cur.inJail){
      const jailStrat = aiJailStrategy(cur);
      const log=safeLog(gs);
      if (jailStrat === "card" && (cur.jailFreeCards||0)>0) {
        log.unshift(`🤖 ${cur.token} used Get Out of Jail Free card!`);
        players[gs.currentPlayer]={...cur,jailFreeCards:cur.jailFreeCards-1,inJail:false,jailTurns:0};
        const d1=Math.ceil(Math.random()*6),d2=Math.ceil(Math.random()*6);
        pushState({...gs,rolling:true,log:log.slice(0,25)});
        setTimeout(()=>{
          const newGs={...gs,players,dice:[d1,d2],rolling:false,log:log.slice(0,25)};
          pushState(newGs).then(()=>setTimeout(()=>doMoveAndAction(players[gs.currentPlayer],d1+d2,newGs,safeProps(gs),false,d1,d2),300));
        },900);
      } else if (jailStrat === "pay" && cur.money >= 50) {
        log.unshift(`🤖 ${cur.token} paid $50 jail fine`);
        players[gs.currentPlayer]={...cur,money:cur.money-50,inJail:false,jailTurns:0};
        const d1=Math.ceil(Math.random()*6),d2=Math.ceil(Math.random()*6);
        pushState({...gs,rolling:true,log:log.slice(0,25)});
        setTimeout(()=>{
          const newGs={...gs,players,dice:[d1,d2],rolling:false,log:log.slice(0,25)};
          pushState(newGs).then(()=>setTimeout(()=>doMoveAndAction(players[gs.currentPlayer],d1+d2,newGs,safeProps(gs),false,d1,d2),300));
        },900);
      } else {
        // Roll for doubles
        const d1=Math.ceil(Math.random()*6),d2=Math.ceil(Math.random()*6);
        const isDouble=d1===d2;
        log.unshift(`🤖 ${cur.token} rolls for doubles: ${d1}+${d2}${isDouble?" 🎲 FREE!":""}`);
        pushState({...gs,rolling:true,log:log.slice(0,25)});
        setTimeout(()=>{
          if (isDouble){
            players[gs.currentPlayer]={...cur,inJail:false,jailTurns:0};
            const newGs={...gs,players,dice:[d1,d2],rolling:false,log:log.slice(0,25)};
            pushState(newGs).then(()=>setTimeout(()=>doMoveAndAction(players[gs.currentPlayer],d1+d2,newGs,safeProps(gs),false,d1,d2),300));
          } else {
            const newJT=(cur.jailTurns||0)+1;
            if (newJT>=3){
              players[gs.currentPlayer]={...cur,inJail:false,jailTurns:0};
              const newGs={...gs,players,dice:[d1,d2],rolling:false,log:log.slice(0,25)};
              pushState(newGs).then(()=>setTimeout(()=>doMoveAndAction(players[gs.currentPlayer],d1+d2,newGs,safeProps(gs),false,d1,d2),300));
            } else {
              players[gs.currentPlayer]={...cur,jailTurns:newJT};
              pushState({...gs,players,dice:[d1,d2],rolled:true,rolling:false,log:log.slice(0,25)}).then(()=>setProcessing(false));
            }
          }
        },900);
      }
      return;
    }

    if ((cur.frozenTurns||0)>0){
      const log=safeLog(gs); log.unshift(`❄️ ${cur.token} is frozen!`);
      players[gs.currentPlayer]={...cur,frozenTurns:cur.frozenTurns-1};
      pushState({...gs,players,rolled:true,log:log.slice(0,25)}).then(()=>setProcessing(false));
      return;
    }

    const d1=Math.ceil(Math.random()*6),d2=Math.ceil(Math.random()*6);
    const isDouble=d1===d2,newDC=isDouble?(gs.doubleCount||0)+1:0;
    const log=safeLog(gs); log.unshift(`🤖 ${cur.token} rolls ${d1}+${d2}=${d1+d2}`);
    pushState({...gs,rolling:true,log:log.slice(0,25)});
    setTimeout(()=>{
      if (newDC===3){
        players[gs.currentPlayer]={...cur,position:10,inJail:true,jailTurns:0};
        pushState({...gs,players,dice:[d1,d2],rolled:true,rolling:false,doubleCount:0,log:log.slice(0,25)})
          .then(()=>setProcessing(false));
        return;
      }
      doMoveAndAction(cur,d1+d2,{...gs,players,doubleCount:newDC,log:log.slice(0,25)},safeProps(gs),isDouble,d1,d2);
    },900);
  };

  const advanceTurn=(gs)=>{
    const players=safePlayers(gs);
    const active=players.filter(p=>p&&!p.bankrupt);
    if (active.length<=1){
      pushState({...gs,status:"gameover"}).then(()=>setProcessing(false)); return;
    }
    let next=(gs.currentPlayer+1)%players.length;
    while(players[next]?.bankrupt) next=(next+1)%players.length;
    const log=safeLog(gs);
    const isAI=players[next]?.isAI;
    log.unshift(`▶ Player ${next+1}${isAI?" 🤖":""}'s turn`);
    pushState({...gs,currentPlayer:next,rolled:false,doubleCount:0,rolling:false,
      log:log.slice(0,25),turnStartTime:Date.now(),modal:null})
      .then(()=>setProcessing(false));
  };

  const endTurn=()=>{
    if (!isMyTurn||!gameState.rolled||processing) return;
    setProcessing(true); advanceTurn(gsRef.current);
  };

  const handleTimerExpire=()=>{
    if (!isMyTurn||processing) return;
    const gs=gsRef.current;
    if (!gs.rolled){
      const d1=Math.ceil(Math.random()*6),d2=Math.ceil(Math.random()*6);
      const log=safeLog(gs); log.unshift(`⏰ Time expired! Auto-rolling...`);
      const players=safePlayers(gs).map(p=>({...p}));
      const player=players[gs.currentPlayer];
      if (player&&!player.bankrupt)
        doMoveAndAction(player,d1+d2,{...gs,players,doubleCount:0,log:log.slice(0,25)},safeProps(gs),false,d1,d2);
      else advanceTurn(gs);
    } else advanceTurn(gs);
  };

  // ── Property actions ──
  const dismissModal=()=>{
    if (!gameState?.modal) return;
    if (!isMyTurn&&gameState.modal.type!=="notify") return;
    pushState({...gameState,modal:null});
  };

  const buyProperty=()=>{
    if (!isMyTurn||!gameState?.modal) return;
    const {spaceId,playerIdx}=gameState.modal;
    const space=SPACES[spaceId];
    const players=safePlayers(gameState).map(p=>({...p}));
    const props=safeProps(gameState);
    const player=players[playerIdx];
    const log=safeLog(gameState);
    if (!player||player.money<space.price){pushState({...gameState,modal:null});return;}
    players[playerIdx]={...player,money:player.money-space.price};
    log.unshift(`${player.token} bought ${space.name} for $${space.price}`);
    pushState({...gameState,players,
      properties:{...props,[spaceId]:{owner:playerIdx,houses:0,hotel:false}},
      modal:null,log:log.slice(0,25)});
  };

  const buildHouse=(spaceId)=>{
    if (!isMyTurn||processing) return;
    const gs=gsRef.current;
    const space=SPACES[spaceId]; if (!space) return;
    const props=safeProps(gs); const prop=props[spaceId];
    if (!prop||prop.owner!==myIdx) return;
    const players=safePlayers(gs).map(p=>({...p})); const player=players[myIdx];
    const group=COLOR_GROUPS[space.color]||[];
    if (!group.every(id=>props[id]?.owner===myIdx)||prop.hotel) return;
    const cost=space.houseCost||100; if (player.money<cost) return;
    players[myIdx]={...player,money:player.money-cost};
    const log=safeLog(gs);
    const newProp=(prop.houses||0)>=4
      ?(log.unshift(`${player.token} built 🏨 hotel on ${space.name}!`),{...prop,houses:0,hotel:true})
      :(log.unshift(`${player.token} built 🏠 house on ${space.name}!`),{...prop,houses:(prop.houses||0)+1});
    pushState({...gs,players,properties:{...props,[spaceId]:newProp},log:log.slice(0,25),modal:null});
  };

  const handleSteal=(targetSpaceId)=>{
    const gs=gsRef.current;
    const props=safeProps(gs);
    if (!props[targetSpaceId]||props[targetSpaceId].owner===myIdx) return;
    const log=safeLog(gs);
    log.unshift(`${safePlayers(gs)[myIdx]?.token} stole ${SPACES[targetSpaceId]?.name}!`);
    pushState({...gs,properties:{...props,[targetSpaceId]:{...props[targetSpaceId],owner:myIdx}},
      modal:null,log:log.slice(0,25)});
  };

  const handleSwap=(mySpaceId,theirSpaceId)=>{
    const gs=gsRef.current;
    const props=safeProps(gs);
    const myProp=props[mySpaceId], theirProp=props[theirSpaceId];
    if (!myProp||!theirProp) return;
    const log=safeLog(gs);
    log.unshift(`🔄 ${safePlayers(gs)[myIdx]?.token} swapped ${SPACES[mySpaceId]?.name} ↔ ${SPACES[theirSpaceId]?.name}!`);
    pushState({...gs,properties:{...props,
      [mySpaceId]:{...myProp,owner:theirProp.owner},
      [theirSpaceId]:{...theirProp,owner:myIdx}},
      modal:null,log:log.slice(0,25)});
  };

  // ── Create / Join ──
  const createGame=async()=>{
    const code=generateCode();
    setRoomCode(code); setIsHost(true); setMyIdx(0); myIdxRef.current=0;
    await set(ref(db,`games/${code}`),{
      lobby:{0:{id:0,token:PLAYER_TOKENS[0],color:PLAYER_COLORS[0]}},
      state:{hostPlayerCount:playerCount,status:"waiting",properties:{},players:[],
             log:[],dice:[1,1],rolling:false},
    });
    setScreen("waiting");
  };

  const joinGame=async()=>{
    const code=joinCode.toUpperCase().trim();
    if (code.length<4){setError("Enter a valid room code");return;}
    setError("");
    const snap=await get(ref(db,`games/${code}`));
    if (!snap.exists()){setError("Room not found!");return;}
    const data=snap.val();
    const lobbyCount=data.lobby?Object.keys(data.lobby).length:0;
    const maxPlayers=data.state?.hostPlayerCount||2;
    if (lobbyCount>=maxPlayers){setError("Room is full!");return;}
    const idx=lobbyCount;
    setMyIdx(idx); myIdxRef.current=idx;
    setRoomCode(code); setIsHost(false);
    await update(ref(db,`games/${code}/lobby`),{
      [idx]:{id:idx,token:PLAYER_TOKENS[idx],color:PLAYER_COLORS[idx]}
    });
    setScreen("waiting");
  };

  const startGame=async(count)=>{
    const aiP=settings.aiPlayers||[];
    const aiConfigs={};
    aiP.forEach(idx=>{ aiConfigs[idx]={difficulty:aiDifficulty,personality:aiPersonality}; });
    const gs=freshGameState(count,settings,aiP,aiConfigs);
    await set(ref(db,`games/${roomCode}/state`),gs);
    setScreen("game");
  };

  // Start a fully local AI game (no Firebase, no room code)
  const startAIGame=()=>{
    const totalPlayers = 1 + aiOpponentCount; // human is P0
    const aiPlayerIndices = Array.from({length:aiOpponentCount},(_,i)=>i+1);
    const aiConfigs={};
    aiPlayerIndices.forEach(idx=>{
      // Give each opponent slightly different personality for variety
      const personalities=["aggressive","conservative","monopolist","random"];
      aiConfigs[idx]={
        difficulty: aiDifficulty,
        personality: personalities[(idx-1) % personalities.length],
      };
    });
    const gs=freshGameState(totalPlayers,{...DEFAULT_SETTINGS},[...aiPlayerIndices],aiConfigs);
    setMyIdx(0);
    myIdxRef.current=0;
    setIsLocalGame(true);
    prevPositionsRef.current=null;
    setGameState(gs);
    setScreen("game");
  };

  const sendChat=async()=>{
    const text=chatInput.trim(); if (!text||myIdx===null) return;
    setChatInput("");
    const me=safePlayers(gsRef.current)[myIdx];
    const token=me?.token||PLAYER_TOKENS[myIdx]||"?";
    const msgId=Date.now()+"_"+Math.random().toString(36).slice(2,6);
    await update(ref(db,`games/${roomCode}/chat`),{[msgId]:{id:myIdx,token,text,ts:Date.now()}});
  };

  const resetToLobby=()=>{
    setScreen("lobby"); setGameState(null); setRoomCode(""); setMyIdx(null);
    setShowSettings(false); prevPositionsRef.current=null; setSellToPay(null);
    setIsLocalGame(false); setSelectedSpace(null);
  };

  const CORNER=68, CELL=46;
  const cols=[CORNER,...Array(9).fill(CELL),CORNER];
  const rows=[CORNER,...Array(9).fill(CELL),CORNER];

  // ════════════════════════════════════════════════════════════
  // LOBBY
  // ════════════════════════════════════════════════════════════
  if (screen==="lobby") {
    const DIFF_INFO = {
      easy:     { label:"Easy",      emoji:"🟢", desc:"Buys casually, builds slowly" },
      medium:   { label:"Medium",    emoji:"🟡", desc:"Balanced — competes seriously" },
      hard:     { label:"Hard",      emoji:"🟠", desc:"Monopoly-focused, long-term" },
      strategic:{ label:"Strategic", emoji:"🔴", desc:"Calculates risk, targets leaders" },
    };
    const PERS_INFO = {
      aggressive:   { label:"Aggressive",   emoji:"⚔️",  desc:"Buys everything, builds fast" },
      conservative: { label:"Conservative", emoji:"🛡️",  desc:"Saves cash, avoids risk" },
      monopolist:   { label:"Monopolist",   emoji:"🏠",  desc:"Obsessed with color sets" },
      random:       { label:"Random",       emoji:"🎲",  desc:"Unpredictable & chaotic" },
    };
    return (
      <div style={{minHeight:"100vh",
        background:"linear-gradient(145deg,#14532d 0%,#166534 50%,#15803d 100%)",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontFamily:"Georgia,serif",padding:16}}>
        <div style={{background:"#fefce8",borderRadius:20,
          boxShadow:"0 24px 64px rgba(0,0,0,0.55)",border:"4px solid #a16207",
          maxWidth:480,width:"100%",overflow:"hidden"}}>

          {/* Title */}
          <div style={{textAlign:"center",padding:"28px 32px 20px",
            borderBottom:"2px solid #e7d9a0"}}>
            <div style={{fontSize:60,lineHeight:1,marginBottom:6}}>🎲</div>
            <h1 style={{margin:"0 0 4px",fontSize:30,letterSpacing:4,color:"#14532d",fontFamily:"Georgia"}}>
              MONOPOLY
            </h1>
            <p style={{color:"#78716c",fontSize:13,margin:0}}>Online Multiplayer &amp; AI Mode</p>
          </div>

          {/* Mode tabs */}
          <div style={{display:"flex",borderBottom:"2px solid #e7d9a0"}}>
            {[["multiplayer","🌐 Multiplayer"],["ai","🤖 vs AI"]].map(([mode,label])=>(
              <button key={mode} onClick={()=>setLobbyMode(mode)} style={{
                flex:1,padding:"12px 0",fontSize:14,fontWeight:"bold",
                border:"none",cursor:"pointer",
                background:lobbyMode===mode?"#14532d":"#fefce8",
                color:lobbyMode===mode?"#fff":"#78716c",
                borderBottom:lobbyMode===mode?"3px solid #14532d":"3px solid transparent",
                transition:"all 0.15s",
              }}>{label}</button>
            ))}
          </div>

          <div style={{padding:"24px 28px 28px"}}>
            {/* ── MULTIPLAYER TAB ── */}
            {lobbyMode==="multiplayer" && (<>
              <div style={{marginBottom:20,padding:18,background:"#f0fdf4",
                borderRadius:10,border:"2px solid #bbf7d0"}}>
                <h3 style={{margin:"0 0 10px",color:"#14532d",fontSize:15}}>🏠 Create a Game</h3>
                <p style={{fontSize:12,color:"#555",margin:"0 0 10px"}}>Number of Players</p>
                <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:14}}>
                  {[2,3,4].map(n=>(
                    <button key={n} onClick={()=>setPlayerCount(n)} style={{
                      width:46,height:46,borderRadius:"50%",fontSize:17,fontWeight:"bold",
                      border:playerCount===n?"3px solid #14532d":"2px solid #d4c89a",
                      background:playerCount===n?"#14532d":"#fff",
                      color:playerCount===n?"#fff":"#333",cursor:"pointer"}}>
                      {n}
                    </button>
                  ))}
                </div>
                <button onClick={createGame} style={{background:"#14532d",color:"#fff",border:"none",
                  padding:"12px 0",borderRadius:8,fontSize:15,fontWeight:"bold",cursor:"pointer",width:"100%"}}>
                  Create Game →
                </button>
              </div>

              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{flex:1,height:1,background:"#d6d3d1"}}/>
                <span style={{color:"#a8a29e",fontSize:12}}>OR</span>
                <div style={{flex:1,height:1,background:"#d6d3d1"}}/>
              </div>

              <div style={{padding:18,background:"#eff6ff",borderRadius:10,border:"2px solid #bfdbfe"}}>
                <h3 style={{margin:"0 0 10px",color:"#1e40af",fontSize:15}}>🔗 Join a Game</h3>
                <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e=>e.key==="Enter"&&joinGame()} placeholder="Enter room code" maxLength={6}
                  style={{width:"100%",padding:"10px 14px",fontSize:20,textAlign:"center",
                    border:"2px solid #93c5fd",borderRadius:8,fontFamily:"monospace",letterSpacing:6,
                    marginBottom:10,outline:"none",fontWeight:"bold",boxSizing:"border-box"}}/>
                {error&&<p style={{color:"#dc2626",fontSize:12,margin:"0 0 8px"}}>{error}</p>}
                <button onClick={joinGame} style={{background:"#1e40af",color:"#fff",border:"none",
                  padding:"12px 0",borderRadius:8,fontSize:15,fontWeight:"bold",cursor:"pointer",width:"100%"}}>
                  Join Game →
                </button>
              </div>
            </>)}

            {/* ── AI MODE TAB ── */}
            {lobbyMode==="ai" && (<>
              <div style={{background:"#f0fdf4",borderRadius:12,padding:16,
                border:"2px solid #bbf7d0",marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:"bold",color:"#14532d",marginBottom:10,
                  display:"flex",alignItems:"center",gap:6}}>
                  🤖 <span>AI Opponents</span>
                  <span style={{fontWeight:"normal",color:"#78716c",fontSize:12}}>(you are always Player 1)</span>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                  {[1,2,3].map(n=>(
                    <button key={n} onClick={()=>setAiOpponentCount(n)} style={{
                      flex:1,padding:"10px 0",borderRadius:8,fontSize:13,fontWeight:"bold",
                      border:aiOpponentCount===n?"3px solid #14532d":"2px solid #d4c89a",
                      background:aiOpponentCount===n?"#14532d":"#fff",
                      color:aiOpponentCount===n?"#fff":"#333",cursor:"pointer",
                    }}>
                      {n} AI{n>1?"s":""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:"bold",color:"#14532d",marginBottom:8}}>
                  🎯 Difficulty
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {Object.entries(DIFF_INFO).map(([key,{label,emoji,desc}])=>(
                    <button key={key} onClick={()=>setAiDifficulty(key)} style={{
                      padding:"10px 12px",borderRadius:8,fontSize:12,fontWeight:"bold",
                      border:aiDifficulty===key?"3px solid #14532d":"2px solid #d6d3d1",
                      background:aiDifficulty===key?"#dcfce7":"#fff",
                      cursor:"pointer",textAlign:"left",lineHeight:1.3,
                    }}>
                      <div style={{fontSize:14,marginBottom:2}}>{emoji} {label}</div>
                      <div style={{fontWeight:"normal",color:"#78716c",fontSize:11}}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:"bold",color:"#14532d",marginBottom:8}}>
                  🎭 AI Play Style
                  <span style={{fontWeight:"normal",color:"#78716c",fontSize:11,marginLeft:6}}>
                    (each AI gets a different style automatically)
                  </span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {Object.entries(PERS_INFO).map(([key,{label,emoji,desc}])=>(
                    <div key={key} style={{
                      padding:"8px 10px",borderRadius:8,fontSize:11,
                      border:"2px solid #e5e7eb",
                      background:"#f9fafb",lineHeight:1.3,
                    }}>
                      <div style={{fontWeight:"bold",marginBottom:2}}>{emoji} {label}</div>
                      <div style={{color:"#78716c"}}>{desc}</div>
                    </div>
                  ))}
                </div>
                <p style={{fontSize:11,color:"#9ca3af",margin:"8px 0 0",textAlign:"center"}}>
                  With {aiOpponentCount} opponent{aiOpponentCount>1?"s":""}, each gets a unique style
                </p>
              </div>

              {/* Summary */}
              <div style={{background:"#fef3c7",border:"2px solid #f59e0b",borderRadius:8,
                padding:"8px 12px",marginBottom:16,fontSize:12,color:"#92400e"}}>
                <strong>You vs {aiOpponentCount} AI</strong> — {DIFF_INFO[aiDifficulty].label} difficulty
                {aiOpponentCount===1&&` • ${Object.values(PERS_INFO)[0].label} style`}
              </div>

              <button onClick={startAIGame} style={{
                background:"linear-gradient(135deg,#14532d,#15803d)",
                color:"#fff",border:"none",padding:"14px 0",borderRadius:10,
                fontSize:16,fontWeight:"bold",cursor:"pointer",width:"100%",
                boxShadow:"0 4px 14px rgba(20,83,45,0.4)",letterSpacing:0.5,
              }}>
                🎮 Play vs AI — Start Game
              </button>
            </>)}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // WAITING
  // ════════════════════════════════════════════════════════════
  if (screen==="waiting") {
    const maxPlayers=gameState?.hostPlayerCount||playerCount;
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#14532d,#166534)",
        display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
        <div style={{background:"#fefce8",borderRadius:16,padding:"36px 40px",textAlign:"center",
          boxShadow:"0 24px 64px rgba(0,0,0,0.5)",border:"4px solid #a16207",maxWidth:440,width:"100%"}}>
          <div style={{fontSize:44,marginBottom:8}}>⏳</div>
          <h2 style={{color:"#14532d",margin:"0 0 6px",fontSize:20}}>Waiting for Players</h2>
          <p style={{color:"#78716c",fontSize:13,marginBottom:20}}>{lobbyPlayers.length}/{maxPlayers} joined</p>

          <div style={{background:"#14532d",borderRadius:10,padding:"14px 24px",marginBottom:20}}>
            <p style={{color:"#86efac",fontSize:11,margin:"0 0 4px",letterSpacing:2}}>ROOM CODE</p>
            <div style={{color:"#fff",fontSize:36,fontWeight:900,letterSpacing:10,fontFamily:"monospace"}}>{roomCode}</div>
            <p style={{color:"#86efac",fontSize:11,margin:"6px 0 0"}}>Share with friends</p>
          </div>

          {Array.from({length:maxPlayers},(_,i)=>{
            const p=lobbyPlayers[i];
            const isAI=(settings.aiPlayers||[]).includes(i);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",
                borderRadius:8,marginBottom:6,background:p?"#f0fdf4":"#f5f5f4",
                border:p?"2px solid #bbf7d0":"2px dashed #d6d3d1"}}>
                <span style={{fontSize:20}}>{isAI?"🤖":p?PLAYER_TOKENS[i]:"⬜"}</span>
                <span style={{fontWeight:"bold",color:p?PLAYER_COLORS[i]:"#a8a29e",fontSize:13}}>
                  {isAI?`P${i+1} AI`:p?`Player ${i+1}${i===myIdx?" (You)":""}`:i===0?"Connecting...":"Waiting..."}
                </span>
                {p&&<span style={{marginLeft:"auto",color:"#16a34a",fontSize:12}}>✓</span>}
              </div>
            );
          })}

          {/* Settings summary */}
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,
            padding:"8px 12px",margin:"12px 0",fontSize:12,color:"#555",textAlign:"left"}}>
            <strong style={{color:"#14532d"}}>Settings: </strong>
            {settings.turnTimer?`${settings.turnTimer}s timer`:"No timer"} •{" "}
            {settings.gameMode==="classic"?"Classic":
             settings.gameMode==="timed"?`Timed ${settings.timedMinutes}min`:
             `Target $${(settings.targetAmount||10000).toLocaleString()}`}
            {(settings.aiPlayers||[]).length>0&&` • ${settings.aiPlayers.length} AI`}
          </div>

          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
            {isHost&&(
              <button onClick={()=>setShowSettings(true)} style={{background:"#1e40af",color:"#fff",
                border:"none",padding:"11px 0",borderRadius:8,fontSize:14,fontWeight:"bold",cursor:"pointer"}}>
                ⚙️ Change Game Settings
              </button>
            )}
            {isHost&&lobbyPlayers.length>=2&&(
              <button onClick={()=>startGame(lobbyPlayers.length)} style={{background:"#14532d",color:"#fff",
                border:"none",padding:"11px 0",borderRadius:8,fontSize:14,fontWeight:"bold",cursor:"pointer"}}>
                ▶ Start Game ({lobbyPlayers.length} players)
              </button>
            )}
            {isHost&&lobbyPlayers.length<2&&(
              <p style={{color:"#78716c",fontSize:13}}>Need at least 2 players to start</p>
            )}
            {!isHost&&<p style={{color:"#78716c",fontSize:13}}>Waiting for host to start...</p>}
          </div>
        </div>

        {/* Settings popup */}
        {showSettings&&isHost&&(
          <SettingsModal
            settings={settings} onChange={setSettings}
            onClose={()=>setShowSettings(false)}
            playerCount={playerCount} setPlayerCount={setPlayerCount}
            maxPlayers={lobbyPlayers.length||playerCount}
          />
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // GAME OVER
  // ════════════════════════════════════════════════════════════
  if (gameState?.status==="gameover") {
    const ps=safePlayers(gameState);
    const alive=ps.filter(p=>!p.bankrupt);
    const winner=alive.length>0?alive.reduce((a,b)=>a.money>b.money?a:b):ps[0];
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#14532d,#15803d)",
        display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
        <div style={{background:"#fefce8",borderRadius:16,padding:"40px 36px",textAlign:"center",
          border:"4px solid gold",boxShadow:"0 24px 64px rgba(0,0,0,0.5)",maxWidth:380,width:"100%"}}>
          <div style={{fontSize:80}}>🏆</div>
          <h2 style={{fontSize:28,color:"#14532d"}}>GAME OVER!</h2>
          {winner&&<>
            <p style={{fontSize:20}}>{winner.token} Player {winner.id+1}{winner.isAI?" 🤖":""} wins!</p>
            <p style={{color:"#333",fontWeight:"bold"}}>💰 ${winner.money.toLocaleString()}</p>
          </>}
          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
            {ps.sort((a,b)=>b.money-a.money).map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",
                background:p.id===winner?.id?"#dcfce7":"#f5f5f4",borderRadius:8,
                border:p.id===winner?.id?"2px solid #14532d":"1px solid #e5e7eb"}}>
                {p.id===winner?.id&&<span>🏆</span>}
                <span style={{fontSize:20}}>{p.token}</span>
                <span style={{fontWeight:"bold",color:PLAYER_COLORS[p.id]}}>P{p.id+1}{p.isAI?" 🤖":""}</span>
                <span style={{marginLeft:"auto",fontWeight:"bold",color:"#111"}}>${p.money.toLocaleString()}</span>
                {p.bankrupt&&<span style={{fontSize:11,color:"#dc2626"}}>💸</span>}
              </div>
            ))}
          </div>
          <button onClick={resetToLobby} style={{marginTop:20,background:"#14532d",color:"#fff",
            border:"none",padding:"12px 32px",borderRadius:8,fontSize:15,cursor:"pointer",fontWeight:"bold",width:"100%"}}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════
  if (!gameState||!Array.isArray(gameState.players)||gameState.players.length===0) {
    return (
      <div style={{minHeight:"100vh",background:"#14532d",display:"flex",alignItems:"center",
        justifyContent:"center",flexDirection:"column",gap:16}}>
        <div style={{width:40,height:40,border:"4px solid #86efac",borderTopColor:"transparent",
          borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
        <div style={{color:"#86efac",fontSize:18,fontFamily:"Georgia"}}>Joining game...</div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // GAME BOARD
  // ════════════════════════════════════════════════════════════
  const rawPlayers=safePlayers(gameState);
  const displayPlayers=rawPlayers.map(p=>{
    if (!p) return p;
    const vis=visualPositions[p.id];
    return vis!==undefined?{...p,position:vis}:p;
  });
  const props    =safeProps(gameState);
  const logArr   =safeLog(gameState);
  const diceArr  =safeDice(gameState);
  const isRolling=gameState.rolling===true;
  const cur      =rawPlayers[gameState.currentPlayer];
  const me       =rawPlayers[myIdx]||null;
  const modal    =gameState.modal||null;
  const gs_s     =safeSettings(gameState);

  // My properties for building panel
  const myProps=Object.entries(props).filter(([,p])=>p&&p.owner===myIdx);
  const myPropIds=new Set(myProps.map(([id])=>+id));

  return (
    <div className="game-root">

      {/* ── Header ── */}
      <div style={{background:"#fefce8",borderRadius:8,padding:"5px 12px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        border:"2px solid #a16207",flexShrink:0,flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:14,fontWeight:"bold",letterSpacing:2,color:"#14532d"}}>🎲 MONOPOLY</span>
          <span style={{fontSize:10,background:"#14532d",color:"#fff",padding:"2px 7px",
            borderRadius:10,fontFamily:"monospace"}}>{roomCode}</span>
          <span style={{fontSize:10,background:"#1e40af",color:"#fff",padding:"2px 7px",borderRadius:10}}>
            {gs_s.gameMode==="classic"?"⚔️ Classic":
             gs_s.gameMode==="timed"?`⏱ ${gs_s.timedMinutes}min`:
             `🎯 $${(gs_s.targetAmount||10000).toLocaleString()}`}
          </span>
        </div>
        {/* Player chips */}
        <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
          {rawPlayers.map((p,i)=>p?(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4,opacity:p.bankrupt?0.4:1,
              background:gameState.currentPlayer===i?"#dcfce7":i===myIdx?"#fef9c3":"#f9f5e8",
              border:gameState.currentPlayer===i?"2px solid #14532d":i===myIdx?"2px solid #ca8a04":"2px solid #e5e7eb",
              borderRadius:6,padding:"2px 7px",transition:"background 0.3s"}}>
              <span style={{fontSize:14}}>{p.token}</span>
              <div>
                <div style={{fontSize:9,fontWeight:"bold",color:p.color}}>
                  P{i+1}{p.isAI?" 🤖":""}{i===myIdx?" ★":""}
                </div>
                <div style={{fontSize:9,color:"#111",fontWeight:"bold"}}>${p.money.toLocaleString()}</div>
              </div>
              {p.inJail&&<span style={{fontSize:9}}>🔒</span>}
              {(p.frozenTurns||0)>0&&<span className="frozen-badge">❄️{p.frozenTurns}</span>}
              {(p.rentImmuneTurns||0)>0&&<span className="immune-badge">🛡️</span>}
              {(p.jailFreeCards||0)>0&&<span style={{fontSize:9}}>🃏×{p.jailFreeCards}</span>}
              {p.bankrupt&&<span style={{fontSize:9}}>💸</span>}
            </div>
          ):null)}
          {gs_s.gameMode==="timed"&&gameState.gameStartTime&&(
            <GameTimer gameStartTime={gameState.gameStartTime} limitMinutes={gs_s.timedMinutes||60}
              onExpire={()=>{
                if (myIdx===0){
                  const log=safeLog(gsRef.current);log.unshift("⏰ Time's up!");
                  pushState({...gsRef.current,status:"gameover",log:log.slice(0,25)});
                }
              }}/>
          )}
        </div>
        <button onClick={resetToLobby} style={{background:"#dc2626",color:"#fff",border:"none",
          padding:"4px 10px",borderRadius:4,fontSize:11,cursor:"pointer"}}>Leave</button>
      </div>

      {/* ── Turn banner ── */}
      <div style={{textAlign:"center",fontSize:12,fontWeight:"bold",
        color:isMyTurn?"#86efac":"#fca5a5",padding:"1px 0"}}>
        {isRolling?`🎲 ${cur?.token||""} P${(gameState.currentPlayer||0)+1}${cur?.isAI?" 🤖":""} is rolling...`:
         isMyTurn?"✅ YOUR TURN — Roll the dice!":
         `⏳ ${cur?.token||""} P${(gameState.currentPlayer||0)+1}${cur?.isAI?" 🤖":""}'s turn...`}
      </div>

      {/* ── Sell-to-pay banner ── */}
      {sellToPay&&sellToPay.playerId===myIdx&&(
        <div style={{background:"#fee2e2",border:"2px solid #dc2626",borderRadius:8,padding:"8px 14px",
          display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:13,fontWeight:"bold",color:"#dc2626"}}>
            💸 You owe ${sellToPay.amount.toLocaleString()}! Sell properties to pay your debt:
          </span>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {myProps.map(([id])=>{
              const space=SPACES[+id];
              return (
                <button key={id} onClick={()=>sellProperty(+id)} style={{
                  background:"#dc2626",color:"#fff",border:"none",padding:"4px 10px",
                  borderRadius:6,fontSize:11,cursor:"pointer",fontWeight:"bold"}}>
                  Sell {space?.name} (${Math.floor((space?.price||0)/2)})
                </button>
              );
            })}
          </div>
          {myProps.length===0&&(
            <button onClick={()=>setSellToPay(null)} style={{background:"#dc2626",color:"#fff",
              border:"none",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer"}}>
              Declare Bankruptcy
            </button>
          )}
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="game-layout">

        {/* Board */}
        <div className="board-wrap">
          <div style={{display:"grid",
            gridTemplateColumns:cols.map(w=>`${w}px`).join(" "),
            gridTemplateRows:rows.map(h=>`${h}px`).join(" "),
            gap:1,background:"#82b366",border:"3px solid #4d7c0f",borderRadius:6,padding:1}}>
            {CELL_POSITIONS.map(({id,gridRow,gridColumn})=>(
              <div key={id} style={{gridRow,gridColumn,display:"flex"}}>
                <BoardCell spaceId={id} players={displayPlayers} properties={props}
                  isSelected={selectedSpace===id}
                  onClick={()=>{
                    // Toggle selection — any space is clickable for info
                    setSelectedSpace(prev => prev===id ? null : id);
                  }}
                  flashCell={flashCell} bouncingPlayer={bouncingPlayer}/>
              </div>
            ))}
            {/* Center */}
            <div style={{gridRow:"2/11",gridColumn:"2/11",background:"#c8e6c9",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              gap:6,borderRadius:4,position:"relative"}}>
              <div style={{fontSize:20,fontWeight:900,letterSpacing:5,color:"#14532d",
                fontFamily:"Times New Roman",transform:"rotate(-35deg)",userSelect:"none"}}>MONOPOLY</div>
              <div style={{fontSize:11,color:"#555",background:"#fff8",padding:"2px 8px",borderRadius:4}}>
                🅿️ ${gameState.freePot||0}
              </div>
              <div style={{display:"flex",gap:12}}>
                {diceArr.map((d,i)=>(
                  <DieFace key={i} value={d} shaking={isRolling} landing={diceLanding&&!isRolling}/>
                ))}
              </div>
              {gs_s.turnTimer>0&&isMyTurn&&(
                <div style={{width:100}}>
                  <TurnTimer turnStartTime={gameState.turnStartTime||Date.now()}
                    limit={gs_s.turnTimer} onExpire={handleTimerExpire} isMyTurn={isMyTurn}/>
                </div>
              )}
            </div>
          </div>

          {/* Board-level popup */}
          <BoardPopup modal={modal} players={rawPlayers} myIdx={myIdx} isMyTurn={isMyTurn}
            onBuy={buyProperty} onPass={()=>pushState({...gameState,modal:null})}
            onDismiss={dismissModal}
            onUseJailCard={handleUseJailCard} onPayJailFine={handlePayJailFine}
            onJailRoll={handleJailRoll}
            onSteal={handleSteal} onSwap={handleSwap}
            onBuildHouse={buildHouse}
            props={props} rawPlayers={rawPlayers}/>
        </div>

        {/* Right panel */}
        <div className="right-panel">

          {/* Controls */}
          {me&&!me.bankrupt&&(
            <div style={{background:"#fefce8",border:"2px solid #a16207",borderRadius:8,padding:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:24}}>{me.token}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:"bold",color:me.color,fontSize:13}}>
                    You (P{myIdx+1})
                  </div>
                  <div style={{fontSize:12,color:"#111",fontWeight:"bold"}}>${me.money.toLocaleString()}</div>
                  {(me.jailFreeCards||0)>0&&<div style={{fontSize:10,color:"#7c3aed"}}>🃏 Jail Free ×{me.jailFreeCards}</div>}
                  {(me.doubleRentTurns||0)>0&&<div style={{fontSize:10,color:"#d97706"}}>💰 Double rent ×{me.doubleRentTurns}</div>}
                  {(me.rentImmuneTurns||0)>0&&<div style={{fontSize:10,color:"#16a34a"}}>🛡️ Rent immune</div>}
                  {(me.frozenTurns||0)>0&&<div style={{fontSize:10,color:"#0284c7"}}>❄️ Frozen {me.frozenTurns} turn(s)</div>}
                </div>
                {me.inJail&&<span style={{fontSize:10,background:"#fef08a",padding:"2px 5px",borderRadius:4}}>🔒 JAIL</span>}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={handleRoll} disabled={!isMyTurn||gameState.rolled||processing||!!sellToPay}
                  style={{background:(!isMyTurn||gameState.rolled||processing||sellToPay)?"#e5e7eb":"#14532d",
                    color:(!isMyTurn||gameState.rolled||processing||sellToPay)?"#9ca3af":"#fff",
                    border:"none",padding:"8px 14px",borderRadius:6,fontSize:13,
                    cursor:(!isMyTurn||gameState.rolled||processing||sellToPay)?"default":"pointer",fontWeight:"bold"}}>
                  🎲 Roll
                </button>
                <button onClick={endTurn} disabled={!isMyTurn||!gameState.rolled||processing||!!sellToPay}
                  style={{background:(!isMyTurn||!gameState.rolled||processing||sellToPay)?"#e5e7eb":"#dc2626",
                    color:(!isMyTurn||!gameState.rolled||processing||sellToPay)?"#9ca3af":"#fff",
                    border:"none",padding:"8px 14px",borderRadius:6,fontSize:13,
                    cursor:(!isMyTurn||!gameState.rolled||processing||sellToPay)?"default":"pointer",fontWeight:"bold"}}>
                  End →
                </button>
              </div>
            </div>
          )}

          {/* My Properties panel */}
          {myProps.length>0&&(
            <div style={{background:"#fefce8",border:"2px solid #a16207",borderRadius:8,padding:10}}>
              <div style={{fontSize:11,fontWeight:"bold",color:"#14532d",marginBottom:6,
                borderBottom:"1px solid #e7d9a0",paddingBottom:4}}>🏠 Your Properties</div>
              <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:130,overflowY:"auto"}}>
                {myProps.map(([id,prop])=>{
                  const space=SPACES[+id]; if(!space) return null;
                  const group=COLOR_GROUPS[space.color]||[];
                  const hasMonopoly=space.type==="property"&&group.every(sid=>props[sid]?.owner===myIdx);
                  // Only allow building from side panel if on that exact property
                  const playerOnThisProp = me && me.position===+id;
                  return (
                    <div key={id} style={{display:"flex",alignItems:"center",gap:5,
                      fontSize:10,padding:"3px 6px",borderRadius:4,
                      background:hasMonopoly?`${space.color}22`:"#f9f5e8",
                      border:`1px solid ${space.color||"#e5e7eb"}`}}>
                      {space.color&&<div style={{width:7,height:7,borderRadius:"50%",background:space.color,flexShrink:0}}/>}
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{space.name}</span>
                      {hasMonopoly&&<span style={{fontSize:9,color:"#14532d",fontWeight:"bold"}}>MONO</span>}
                      <span>{prop.hotel?"🏨":prop.houses>0?"🏠".repeat(prop.houses):""}</span>
                      {hasMonopoly&&!prop.hotel&&isMyTurn&&playerOnThisProp&&(
                        <button onClick={()=>buildHouse(+id)}
                          style={{fontSize:9,background:"#14532d",color:"#fff",border:"none",
                            padding:"1px 6px",borderRadius:4,cursor:"pointer"}}>
                          +🏠
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Properties */}
          <div style={{background:"#fefce8",border:"2px solid #a16207",borderRadius:8,padding:10,
            overflowY:"auto",maxHeight:170}}>
            <div style={{fontSize:11,fontWeight:"bold",borderBottom:"1px solid #e7d9a0",
              paddingBottom:4,marginBottom:6}}>🗺️ All Properties</div>
            {Object.keys(props).length===0
              ?<div style={{color:"#bbb",fontSize:11,textAlign:"center",padding:8}}>None sold yet</div>
              :Object.entries(props).map(([id,prop])=>{
                if (!prop) return null;
                const space=SPACES[+id]; if (!space) return null;
                return (
                  <div key={id} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,
                    padding:"2px 4px",borderRadius:3,marginBottom:2,
                    background:`${PLAYER_COLORS[prop.owner]||"#888"}18`,
                    border:`1px solid ${PLAYER_COLORS[prop.owner]||"#888"}44`}}>
                    {space.color&&<div style={{width:8,height:8,borderRadius:"50%",background:space.color,flexShrink:0}}/>}
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{space.name}</span>
                    <span>{rawPlayers[prop.owner]?.token||"?"}</span>
                    {prop.hotel&&<span>🏨</span>}
                    {!prop.hotel&&(prop.houses||0)>0&&<span>{"🏠".repeat(prop.houses)}</span>}
                  </div>
                );
              })
            }
          </div>

          {/* Log */}
          <div style={{background:"#0f172a",borderRadius:8,padding:10,height:100,
            overflowY:"auto",border:"2px solid #334155",flexShrink:0}}>
            {logArr.map((msg,i)=>(
              <div key={i} style={{color:i===0?"#86efac":"#64748b",fontSize:10,lineHeight:1.5}}>{msg}</div>
            ))}
          </div>

          {/* Chat */}
          <div style={{background:"#1e293b",border:"2px solid #334155",borderRadius:8,
            display:"flex",flexDirection:"column",minHeight:160,maxHeight:220,flexShrink:0}}>
            <div style={{padding:"5px 10px",borderBottom:"1px solid #334155",
              fontSize:11,fontWeight:"bold",color:"#94a3b8",letterSpacing:1}}>💬 CHAT</div>
            <div style={{flex:1,overflowY:"auto",padding:"6px 10px",display:"flex",flexDirection:"column",gap:3}}>
              {chatMessages.length===0&&(
                <div style={{color:"#475569",fontSize:10,textAlign:"center",marginTop:12}}>Say hi! 👋</div>
              )}
              {chatMessages.map((msg,i)=>{
                const isMe=msg.id===myIdx;
                return (
                  <div key={i} style={{display:"flex",flexDirection:isMe?"row-reverse":"row",
                    alignItems:"flex-end",gap:3}}>
                    <span style={{fontSize:12,flexShrink:0}}>{msg.token}</span>
                    <div style={{background:isMe?"#14532d":"#334155",color:"#f1f5f9",
                      padding:"4px 8px",borderRadius:isMe?"10px 10px 2px 10px":"10px 10px 10px 2px",
                      fontSize:11,maxWidth:"80%",wordBreak:"break-word",lineHeight:1.4}}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef}/>
            </div>
            <div style={{display:"flex",borderTop:"1px solid #334155",padding:5,gap:4}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")sendChat();}}
                placeholder="Type..." maxLength={120}
                style={{flex:1,background:"#0f172a",border:"1px solid #475569",borderRadius:6,
                  padding:"4px 8px",color:"#f1f5f9",fontSize:11,outline:"none"}}/>
              <button onClick={sendChat} disabled={!chatInput.trim()} style={{
                background:chatInput.trim()?"#14532d":"#1e293b",
                color:chatInput.trim()?"#fff":"#475569",border:"none",borderRadius:6,
                padding:"4px 10px",fontSize:13,cursor:chatInput.trim()?"pointer":"default",fontWeight:"bold"}}>
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Property Card Modal (triggered by clicking any board space) ── */}
      {selectedSpace !== null && (() => {
        const selSpace   = SPACES[selectedSpace];
        if (!selSpace) return null;
        const selProp    = props[selectedSpace] ?? null;
        const mePlayer   = rawPlayers[myIdx];
        // ── BUG FIX 1: buy only if physically on the space ──
        const playerIsOnSpace = mePlayer && mePlayer.position === selectedSpace;
        // ── BUG FIX 2: build only on the specific landed space ──
        const group       = COLOR_GROUPS[selSpace.color] || [];
        const hasMonopoly = selSpace.type==="property" && group.length > 0 &&
          group.every(id => props[id]?.owner === myIdx);
        // Build only allowed on the exact space the player just landed on
        const isMyLandedProp = selProp && selProp.owner === myIdx && playerIsOnSpace;

        const handleCardBuild = (spaceId) => {
          // Extra guard: must be on this specific space
          if (!isMyLandedProp || !hasMonopoly || spaceId !== selectedSpace) return;
          buildHouse(spaceId);
        };

        const handleCardBuy = () => {
          // Must be on the space AND it must be unowned AND it must be my turn
          if (!isMyTurn || selProp || !playerIsOnSpace) return;
          setSelectedSpace(null);
          pushState({...gameState, modal:{type:"buy", spaceId:selectedSpace, playerIdx:myIdx}});
        };

        return (
          <PropertyCardModal
            spaceId={selectedSpace}
            prop={selProp}
            players={rawPlayers}
            myIdx={myIdx}
            isMyTurn={isMyTurn}
            allProps={props}
            playerIsOnSpace={playerIsOnSpace}
            onClose={() => setSelectedSpace(null)}
            onBuild={isMyLandedProp && hasMonopoly ? handleCardBuild : null}
            onBuy={selSpace.price && !selProp && isMyTurn && playerIsOnSpace ? handleCardBuy : null}
          />
        );
      })()}
    </div>
  );
}
