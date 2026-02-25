import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update } from "firebase/database";

// ── CSS ───────────────────────────────────────────────────────────────────────
const STYLE = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 100%; }

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
    50%  { box-shadow: inset 0 0 14px rgba(255,165,0,0.8); background: rgba(255,200,0,0.3) !important; }
    100% { box-shadow: inset 0 0 0px rgba(255,165,0,0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes timerPulse {
    0%,100% { opacity:1; } 50% { opacity:0.4; }
  }

  .dice-shake { animation: diceShake 0.5s ease-in-out infinite; }
  .dice-land  { animation: diceLand  0.45s ease-out forwards; }
  .token-bounce { animation: tokenBounce 0.55s ease-out forwards; }
  .cell-pulse { animation: cellPulse 0.35s ease-out; }
  .timer-low  { animation: timerPulse 0.6s ease-in-out infinite; color: #dc2626 !important; }

  .die {
    width: 44px; height: 44px;
    background: #fff; border: 2px solid #444; border-radius: 8px;
    position: relative; box-shadow: 2px 2px 6px rgba(0,0,0,0.3);
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

  /* Responsive board */
  .game-layout {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: flex-start;
    flex: 1;
    overflow: hidden;
  }
  .board-wrap {
    flex-shrink: 0;
    overflow: auto;
  }
  .right-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }

  /* On small screens, stack vertically */
  @media (max-width: 900px) {
    .game-layout {
      flex-direction: column;
      overflow: visible;
    }
    .board-wrap {
      width: 100%;
      overflow-x: auto;
    }
    .right-panel {
      width: 100%;
    }
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #1e293b; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }

  /* Settings toggle pill */
  .pill-option {
    cursor: pointer;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    border: 2px solid #d6d3d1;
    background: #fff;
    color: #44403c;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .pill-option.active {
    background: #14532d;
    color: #fff;
    border-color: #14532d;
  }
  .pill-option:hover:not(.active) {
    border-color: #14532d;
    color: #14532d;
  }
`;

// ── Firebase ──────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCzd09dkugQ8DMNO-3xKEl-DDzpKS66iFw",
  authDomain: "monopoly-game-1a36c.firebaseapp.com",
  databaseURL: "https://monopoly-game-1a36c-default-rtdb.firebaseio.com",
  projectId: "monopoly-game-1a36c",
  storageBucket: "monopoly-game-1a36c.firebasestorage.app",
  messagingSenderId: "817558285705",
  appId: "1:817558285705:web:efe8bcbf7a6ec093a64558",
  measurementId: "G-5W3KBDW4LT"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ── Game Data ─────────────────────────────────────────────────────────────────
const SPACES = [
  { id:0,  name:"GO",                type:"go",          color:null,      price:null },
  { id:1,  name:"Mediterranean Ave", type:"property",    color:"#8B4513", price:60,  rent:[2,10,30,90,160,250],       houseCost:50 },
  { id:2,  name:"Community Chest",   type:"community",   color:null,      price:null },
  { id:3,  name:"Baltic Ave",        type:"property",    color:"#8B4513", price:60,  rent:[4,20,60,180,320,450],      houseCost:50 },
  { id:4,  name:"Income Tax",        type:"tax",         color:null,      price:null, amount:200 },
  { id:5,  name:"Reading Railroad",  type:"railroad",    color:null,      price:200, rent:[25,50,100,200] },
  { id:6,  name:"Oriental Ave",      type:"property",    color:"#87CEEB", price:100, rent:[6,30,90,270,400,550],      houseCost:50 },
  { id:7,  name:"Chance",            type:"chance",      color:null,      price:null },
  { id:8,  name:"Vermont Ave",       type:"property",    color:"#87CEEB", price:100, rent:[6,30,90,270,400,550],      houseCost:50 },
  { id:9,  name:"Connecticut Ave",   type:"property",    color:"#87CEEB", price:120, rent:[8,40,100,300,450,600],     houseCost:50 },
  { id:10, name:"Jail",              type:"jail",        color:null,      price:null },
  { id:11, name:"St. Charles Place", type:"property",    color:"#FF69B4", price:140, rent:[10,50,150,450,625,750],    houseCost:100 },
  { id:12, name:"Electric Company",  type:"utility",     color:null,      price:150, rent:[] },
  { id:13, name:"States Ave",        type:"property",    color:"#FF69B4", price:140, rent:[10,50,150,450,625,750],    houseCost:100 },
  { id:14, name:"Virginia Ave",      type:"property",    color:"#FF69B4", price:160, rent:[12,60,180,500,700,900],    houseCost:100 },
  { id:15, name:"Pennsylvania RR",   type:"railroad",    color:null,      price:200, rent:[25,50,100,200] },
  { id:16, name:"St. James Place",   type:"property",    color:"#FFA500", price:180, rent:[14,70,200,550,750,950],    houseCost:100 },
  { id:17, name:"Community Chest",   type:"community",   color:null,      price:null },
  { id:18, name:"Tennessee Ave",     type:"property",    color:"#FFA500", price:180, rent:[14,70,200,550,750,950],    houseCost:100 },
  { id:19, name:"New York Ave",      type:"property",    color:"#FFA500", price:200, rent:[16,80,220,600,800,1000],   houseCost:100 },
  { id:20, name:"Free Parking",      type:"freeparking", color:null,      price:null },
  { id:21, name:"Kentucky Ave",      type:"property",    color:"#FF0000", price:220, rent:[18,90,250,700,875,1050],   houseCost:150 },
  { id:22, name:"Chance",            type:"chance",      color:null,      price:null },
  { id:23, name:"Indiana Ave",       type:"property",    color:"#FF0000", price:220, rent:[18,90,250,700,875,1050],   houseCost:150 },
  { id:24, name:"Illinois Ave",      type:"property",    color:"#FF0000", price:240, rent:[20,100,300,750,925,1100],  houseCost:150 },
  { id:25, name:"B&O Railroad",      type:"railroad",    color:null,      price:200, rent:[25,50,100,200] },
  { id:26, name:"Atlantic Ave",      type:"property",    color:"#DAA520", price:260, rent:[22,110,330,800,975,1150],  houseCost:150 },
  { id:27, name:"Ventnor Ave",       type:"property",    color:"#DAA520", price:260, rent:[22,110,330,800,975,1150],  houseCost:150 },
  { id:28, name:"Water Works",       type:"utility",     color:null,      price:150, rent:[] },
  { id:29, name:"Marvin Gardens",    type:"property",    color:"#DAA520", price:280, rent:[24,120,360,850,1025,1200], houseCost:150 },
  { id:30, name:"Go To Jail",        type:"gotojail",    color:null,      price:null },
  { id:31, name:"Pacific Ave",       type:"property",    color:"#228B22", price:300, rent:[26,130,390,900,1100,1275], houseCost:200 },
  { id:32, name:"North Carolina Ave",type:"property",    color:"#228B22", price:300, rent:[26,130,390,900,1100,1275], houseCost:200 },
  { id:33, name:"Community Chest",   type:"community",   color:null,      price:null },
  { id:34, name:"Pennsylvania Ave",  type:"property",    color:"#228B22", price:320, rent:[28,150,450,1000,1200,1400],houseCost:200 },
  { id:35, name:"Short Line RR",     type:"railroad",    color:null,      price:200, rent:[25,50,100,200] },
  { id:36, name:"Chance",            type:"chance",      color:null,      price:null },
  { id:37, name:"Park Place",        type:"property",    color:"#00008B", price:350, rent:[35,175,500,1100,1300,1500],houseCost:200 },
  { id:38, name:"Luxury Tax",        type:"tax",         color:null,      price:null, amount:75 },
  { id:39, name:"Boardwalk",         type:"property",    color:"#00008B", price:400, rent:[50,200,600,1400,1700,2000],houseCost:200 },
];

const COLOR_GROUPS = {};
SPACES.forEach(s => {
  if (s.type === "property" && s.color) {
    if (!COLOR_GROUPS[s.color]) COLOR_GROUPS[s.color] = [];
    COLOR_GROUPS[s.color].push(s.id);
  }
});

const CHANCE_CARDS = [
  { text:"Advance to GO! Collect $200",             action:(p)=>({...p,position:0,money:p.money+200}) },
  { text:"Bank pays you a dividend of $50",          action:(p)=>({...p,money:p.money+50}) },
  { text:"Go back 3 spaces",                         action:(p)=>({...p,position:(p.position-3+40)%40}) },
  { text:"Go directly to Jail!",                     action:(p)=>({...p,position:10,inJail:true,jailTurns:0}) },
  { text:"Speeding fine — pay $15",                  action:(p)=>({...p,money:p.money-15}) },
  { text:"Building loan matures — collect $150",    action:(p)=>({...p,money:p.money+150}) },
  { text:"Won crossword competition — collect $100",action:(p)=>({...p,money:p.money+100}) },
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
];

const PLAYER_COLORS = ["#E74C3C","#3498DB","#27AE60","#F39C12"];
const PLAYER_TOKENS = ["🎩","🚢","🏎️","🐶"];

const CELL_POSITIONS = [];
for (let i=0;i<=10;i++)  CELL_POSITIONS.push({id:i, gridRow:11, gridColumn:11-i});
for (let i=11;i<=19;i++) CELL_POSITIONS.push({id:i, gridRow:11-(i-10), gridColumn:1});
for (let i=20;i<=30;i++) CELL_POSITIONS.push({id:i, gridRow:1, gridColumn:i-19});
for (let i=31;i<=39;i++) CELL_POSITIONS.push({id:i, gridRow:i-29, gridColumn:11});

const DEFAULT_SETTINGS = {
  turnTimer: 0,       // 0=none, 30, 60, 90 (seconds)
  gameMode: "classic",// classic | timed | target
  timedMinutes: 60,   // for timed mode
  targetAmount: 10000,// for target mode
};

function generateCode() { return Math.random().toString(36).substring(2,8).toUpperCase(); }

function freshGameState(playerCount, settings={}) {
  return {
    players: Array.from({length:playerCount},(_,i)=>({
      id:i, money:1500, position:0,
      color:PLAYER_COLORS[i], token:PLAYER_TOKENS[i],
      inJail:false, jailTurns:0, bankrupt:false,
    })),
    properties:{}, currentPlayer:0, dice:[1,1],
    rolling:false, rolled:false, doubleCount:0, freePot:0,
    log:["🎲 Game started! Player 1's turn."],
    modal:null, status:"playing", hostPlayerCount:playerCount,
    settings:{...DEFAULT_SETTINGS,...settings},
    turnStartTime: Date.now(),
    gameStartTime: Date.now(),
  };
}

function safePlayers(gs) { return Array.isArray(gs?.players)?gs.players:[]; }
function safeProps(gs)   { return gs?.properties&&typeof gs.properties==="object"?gs.properties:{}; }
function safeLog(gs)     { return Array.isArray(gs?.log)?gs.log:[]; }
function safeDice(gs)    { return Array.isArray(gs?.dice)&&gs.dice.length===2?gs.dice:[1,1]; }

// ── DieFace ───────────────────────────────────────────────────────────────────
function DieFace({value,shaking,landing}) {
  const dots = value||1;
  return (
    <div className={`die face-${dots}${shaking?" dice-shake":landing?" dice-land":""}`}
      style={{border:shaking?"2px solid #f59e0b":"2px solid #444",
        boxShadow:shaking?"0 0 14px rgba(255,165,0,0.8)":landing?"0 0 20px gold":"2px 2px 6px rgba(0,0,0,0.3)"}}>
      {Array.from({length:dots}).map((_,i)=><div key={i} className="dot"/>)}
    </div>
  );
}

// ── BoardCell ─────────────────────────────────────────────────────────────────
function BoardCell({spaceId,players,properties,isSelected,onClick,flashCell,bouncingPlayer}) {
  const space = SPACES[spaceId];
  if (!space) return <div style={{width:"100%",height:"100%"}}/>;
  const safeP = Array.isArray(players)?players:[];
  const safeQ = properties&&typeof properties==="object"?properties:{};
  const prop  = safeQ[spaceId];
  const here  = safeP.filter(p=>p&&p.position===spaceId&&!p.bankrupt);
  const isFlash = flashCell===spaceId;

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
    .replace("Reading Railroad","Reading RR");

  return (
    <div onClick={onClick} className={isFlash?"cell-pulse":""} style={{
      width:"100%",height:"100%",background:bg,
      border:isSelected?"2px solid #fbbf24":"1px solid #9ca3af",
      cursor:"pointer",position:"relative",overflow:"hidden",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:1,
      boxShadow:isSelected?"inset 0 0 6px rgba(251,191,36,0.6)":"none",
    }}>
      {space.type==="property"&&space.color&&(
        <div style={{position:"absolute",top:0,left:0,right:0,height:7,background:space.color}}/>
      )}
      <div style={{fontSize:6,fontWeight:700,textAlign:"center",lineHeight:1.2,
        marginTop:space.type==="property"?8:0,color:"#1f2937",padding:"0 1px"}}>
        {shortName}
      </div>
      {space.price&&<div style={{fontSize:5.5,color:"#6b7280"}}>${space.price}</div>}
      {prop&&<div style={{fontSize:8}}>{prop.hotel?"🏨":"🏠".repeat(prop.houses||0)}</div>}
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

// ── TurnTimer ─────────────────────────────────────────────────────────────────
function TurnTimer({turnStartTime, limit, onExpire, isMyTurn}) {
  const [remaining, setRemaining] = useState(limit);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    setRemaining(limit);
  }, [turnStartTime, limit]);

  useEffect(() => {
    if (!limit) return;
    const iv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
      const left = Math.max(0, limit - elapsed);
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
    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
      <div style={{flex:1,height:6,background:"#e5e7eb",borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct*100}%`,background:color,transition:"width 0.5s linear",borderRadius:3}}/>
      </div>
      <span className={remaining<=10?"timer-low":""} style={{fontSize:12,fontWeight:"bold",color,minWidth:28,textAlign:"right"}}>
        {remaining}s
      </span>
    </div>
  );
}

// ── GameTimer (timed mode) ────────────────────────────────────────────────────
function GameTimer({gameStartTime, limitMinutes, onExpire}) {
  const [remaining, setRemaining] = useState(limitMinutes * 60);
  const expiredRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
      const left = Math.max(0, limitMinutes * 60 - elapsed);
      setRemaining(left);
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [gameStartTime, limitMinutes, onExpire]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <span style={{fontSize:11,fontWeight:"bold",color:remaining<60?"#dc2626":"#14532d",
      background:remaining<60?"#fee2e2":"#dcfce7",padding:"2px 7px",borderRadius:10}}>
      ⏱ {m}:{s.toString().padStart(2,"0")}
    </span>
  );
}

// ── Settings Screen ───────────────────────────────────────────────────────────
function SettingsScreen({settings, onChange, onBack, onStart, playerCount, setPlayerCount, lobbyPlayers, isHost}) {
  const [customTarget, setCustomTarget] = useState(String(settings.targetAmount || 10000));

  const set = (key, val) => onChange({...settings, [key]: val});

  const Pill = ({label, active, onClick}) => (
    <button className={`pill-option${active?" active":""}`} onClick={onClick}>{label}</button>
  );

  return (
    <div style={{
      background:"#fefce8",borderRadius:16,padding:"28px 32px",
      boxShadow:"0 24px 64px rgba(0,0,0,0.5)",border:"4px solid #a16207",
      maxWidth:500,width:"95%",maxHeight:"90vh",overflowY:"auto",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#78716c"}}>←</button>
        <h2 style={{margin:0,color:"#14532d",fontSize:22}}>⚙️ Game Settings</h2>
      </div>

      {/* Players */}
      <Section title="👥 Players">
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {[2,3,4].map(n=>(
            <Pill key={n} label={`${n} Players`} active={playerCount===n} onClick={()=>setPlayerCount(n)}/>
          ))}
        </div>
      </Section>

      {/* Turn Timer */}
      <Section title="⏳ Turn Timer">
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Pill label="No Timer" active={settings.turnTimer===0} onClick={()=>set("turnTimer",0)}/>
          <Pill label="30 sec"   active={settings.turnTimer===30} onClick={()=>set("turnTimer",30)}/>
          <Pill label="60 sec"   active={settings.turnTimer===60} onClick={()=>set("turnTimer",60)}/>
          <Pill label="90 sec"   active={settings.turnTimer===90} onClick={()=>set("turnTimer",90)}/>
        </div>
        {settings.turnTimer>0&&(
          <p style={{fontSize:12,color:"#78716c",margin:"8px 0 0"}}>
            If a player doesn't roll in time, their turn is skipped automatically.
          </p>
        )}
      </Section>

      {/* Game Mode */}
      <Section title="🏁 Game Mode">
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          <Pill label="Classic"      active={settings.gameMode==="classic"} onClick={()=>set("gameMode","classic")}/>
          <Pill label="Timed"        active={settings.gameMode==="timed"}   onClick={()=>set("gameMode","timed")}/>
          <Pill label="Target Worth" active={settings.gameMode==="target"}  onClick={()=>set("gameMode","target")}/>
        </div>

        {settings.gameMode==="classic"&&(
          <p style={{fontSize:12,color:"#78716c",margin:0}}>
            Play until all but one player goes bankrupt. The last player standing wins!
          </p>
        )}

        {settings.gameMode==="timed"&&(
          <div>
            <p style={{fontSize:12,color:"#78716c",margin:"0 0 8px"}}>Game ends when time is up. Richest player wins.</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Pill label="30 min" active={settings.timedMinutes===30} onClick={()=>set("timedMinutes",30)}/>
              <Pill label="60 min" active={settings.timedMinutes===60} onClick={()=>set("timedMinutes",60)}/>
              <Pill label="90 min" active={settings.timedMinutes===90} onClick={()=>set("timedMinutes",90)}/>
            </div>
          </div>
        )}

        {settings.gameMode==="target"&&(
          <div>
            <p style={{fontSize:12,color:"#78716c",margin:"0 0 8px"}}>First player to reach the target net worth wins!</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              {[5000,10000,25000].map(amt=>(
                <Pill key={amt} label={`$${amt.toLocaleString()}`}
                  active={settings.targetAmount===amt}
                  onClick={()=>{set("targetAmount",amt);setCustomTarget(String(amt));}}/>
              ))}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,color:"#555"}}>Custom:</span>
                <input
                  value={customTarget}
                  onChange={e=>{
                    const v=e.target.value.replace(/\D/g,"");
                    setCustomTarget(v);
                    if(+v>=1000) set("targetAmount",+v);
                  }}
                  style={{width:90,padding:"5px 8px",borderRadius:6,border:"2px solid #d6d3d1",
                    fontSize:13,outline:"none",fontWeight:"bold"}}
                  placeholder="Amount"
                />
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Summary */}
      <div style={{background:"#f0fdf4",border:"2px solid #bbf7d0",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13}}>
        <strong style={{color:"#14532d"}}>Summary:</strong>{" "}
        {playerCount} players •{" "}
        {settings.turnTimer?`${settings.turnTimer}s turn timer`:"No turn timer"} •{" "}
        {settings.gameMode==="classic"?"Classic mode":
         settings.gameMode==="timed"?`Timed (${settings.timedMinutes} min)`:
         `Target $${(settings.targetAmount||10000).toLocaleString()}`}
      </div>

      {isHost ? (
        <button onClick={onStart} disabled={lobbyPlayers.length<2}
          style={{
            background:lobbyPlayers.length>=2?"#14532d":"#9ca3af",
            color:"#fff",border:"none",padding:"14px 0",
            borderRadius:10,fontSize:16,fontWeight:"bold",
            cursor:lobbyPlayers.length>=2?"pointer":"default",
            width:"100%",letterSpacing:1,
          }}>
          {lobbyPlayers.length<2?"Need at least 2 players":"▶ Start Game"}
        </button>
      ):(
        <p style={{textAlign:"center",color:"#78716c",fontSize:13}}>Waiting for host to start...</p>
      )}
    </div>
  );
}

function Section({title,children}) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:14,fontWeight:"bold",color:"#14532d",marginBottom:8,
        borderBottom:"2px solid #e7d9a0",paddingBottom:6}}>{title}</div>
      {children}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]             = useState("lobby");
  const [playerCount, setPlayerCount]   = useState(2);
  const [roomCode, setRoomCode]         = useState("");
  const [joinCode, setJoinCode]         = useState("");
  const [myIdx, setMyIdx]               = useState(null);
  const [isHost, setIsHost]             = useState(false);
  const [gameState, setGameState]       = useState(null);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [error, setError]               = useState("");
  const [processing, setProcessing]     = useState(false);
  const [settings, setSettings]         = useState({...DEFAULT_SETTINGS});
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState("");
  const chatEndRef                      = useRef(null);

  const [diceLanding, setDiceLanding]   = useState(false);
  const [flashCell, setFlashCell]       = useState(null);
  const [bouncingPlayer, setBouncingPlayer] = useState(null);
  const [visualPositions, setVisualPositions] = useState({});

  const gsRef        = useRef(null);
  const myIdxRef     = useRef(null);
  const prevDiceRef  = useRef([1,1]);
  const prevPositionsRef = useRef(null);
  gsRef.current    = gameState;
  myIdxRef.current = myIdx;

  // Inject CSS
  useEffect(()=>{
    if (document.getElementById("mono-style")) return;
    const el=document.createElement("style");
    el.id="mono-style"; el.textContent=STYLE;
    document.head.appendChild(el);
  },[]);

  // ── Firebase listeners ──
  useEffect(()=>{
    if (!roomCode||screen==="lobby") return;
    const gameRef=ref(db,`games/${roomCode}/state`);
    const unsub=onValue(gameRef,snap=>{
      if (!snap.exists()) return;
      const data=snap.val();
      if (data.properties==null) data.properties={};
      if (!Array.isArray(data.log))     data.log=[];
      if (!Array.isArray(data.dice))    data.dice=[1,1];
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

  useEffect(()=>{
    if (!roomCode||screen!=="waiting") return;
    const lobbyRef=ref(db,`games/${roomCode}/lobby`);
    const unsub=onValue(lobbyRef,snap=>{
      if (snap.exists()) setLobbyPlayers(Object.values(snap.val()).filter(Boolean));
    });
    return ()=>unsub();
  },[roomCode,screen]);

  useEffect(()=>{
    if (!roomCode||screen==="lobby") return;
    const chatRef=ref(db,`games/${roomCode}/chat`);
    const unsub=onValue(chatRef,snap=>{
      if (snap.exists()) {
        const msgs=Object.values(snap.val()).sort((a,b)=>a.ts-b.ts);
        setChatMessages(msgs);
        setTimeout(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},50);
      } else setChatMessages([]);
    });
    return ()=>unsub();
  },[roomCode,screen]);

  // Position animation watcher
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
      if (prev===undefined) { prevPositionsRef.current[p.id]=p.position; return; }
      if (prev!==p.position) {
        const from=prev,to=p.position;
        const steps=to>from?to-from:(40-from)+to;
        prevPositionsRef.current[p.id]=to;
        animateSteps(p.id,from,steps);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gameState?.players?.map(p=>p?.position+"").join(","),gameState?.status]);

  // Check timed/target win conditions
  useEffect(()=>{
    if (!gameState||gameState.status!=="playing") return;
    const gs=gameState;
    const s=gs.settings||DEFAULT_SETTINGS;
    if (s.gameMode==="target") {
      const players=safePlayers(gs);
      const winner=players.find(p=>!p.bankrupt&&p.money>=(s.targetAmount||10000));
      if (winner) {
        const log=safeLog(gs); log.unshift(`🏆 ${winner.token} reached $${s.targetAmount}! WINNER!`);
        pushState({...gs,status:"gameover",log:log.slice(0,25)});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gameState?.players?.map(p=>p?.money+"").join(",")]);

  const animateSteps=(playerId,from,steps)=>{
    const STEP_MS=200; let step=0;
    const tick=()=>{
      if (step>=steps) {
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

  // ── Create / Join ──
  const createGame=async()=>{
    const code=generateCode();
    setRoomCode(code); setIsHost(true); setMyIdx(0); myIdxRef.current=0;
    await set(ref(db,`games/${code}`),{
      lobby:{0:{id:0,token:PLAYER_TOKENS[0],color:PLAYER_COLORS[0]}},
      state:{hostPlayerCount:playerCount,status:"waiting",properties:{},players:[],log:[],dice:[1,1],rolling:false},
    });
    setShowSettings(true);
    setScreen("waiting");
  };

  const joinGame=async()=>{
    const code=joinCode.toUpperCase().trim();
    if (code.length<4) {setError("Enter a valid room code");return;}
    setError("");
    const snap=await get(ref(db,`games/${code}`));
    if (!snap.exists()) {setError("Room not found!");return;}
    const data=snap.val();
    const lobbyCount=data.lobby?Object.keys(data.lobby).length:0;
    const maxPlayers=data.state?.hostPlayerCount||2;
    if (lobbyCount>=maxPlayers) {setError("Room is full!");return;}
    const idx=lobbyCount;
    setMyIdx(idx); myIdxRef.current=idx;
    setRoomCode(code); setIsHost(false);
    await update(ref(db,`games/${code}/lobby`),{
      [idx]:{id:idx,token:PLAYER_TOKENS[idx],color:PLAYER_COLORS[idx]}
    });
    setScreen("waiting");
  };

  const startGame=async(count)=>{
    const gs=freshGameState(count,settings);
    await set(ref(db,`games/${roomCode}/state`),gs);
    setShowSettings(false);
    setScreen("game");
  };

  const forceStart=()=>startGame(lobbyPlayers.length);

  useEffect(()=>{
    if (screen!=="waiting"||isHost) return;
    const stRef=ref(db,`games/${roomCode}/state/status`);
    const unsub=onValue(stRef,snap=>{
      if (snap.exists()&&snap.val()==="playing") setScreen("game");
    });
    return ()=>unsub();
  },[screen,isHost,roomCode]);

  const pushState=(s)=>{
    const safe={...s,
      properties:s.properties&&typeof s.properties==="object"?s.properties:{},
      log:Array.isArray(s.log)?s.log:[],
      dice:Array.isArray(s.dice)?s.dice:[1,1],
      players:Array.isArray(s.players)?s.players:[],
      rolling:s.rolling??false,
    };
    return set(ref(db,`games/${roomCode}/state`),safe);
  };

  const isMyTurn=gameState&&myIdx===gameState.currentPlayer;

  const calcRent=(space,prop,props,dice)=>{
    const p2=props&&typeof props==="object"?props:{};
    if (space.type==="railroad") {
      const count=Object.entries(p2).filter(([k,v])=>v&&v.owner===prop.owner&&SPACES[+k]?.type==="railroad").length;
      return space.rent[Math.min(count-1,3)];
    }
    if (space.type==="utility") {
      const count=Object.entries(p2).filter(([k,v])=>v&&v.owner===prop.owner&&SPACES[+k]?.type==="utility").length;
      const d=Array.isArray(dice)?dice:[1,1];
      return (d[0]+d[1])*(count===2?10:4);
    }
    const group=COLOR_GROUPS[space.color]||[];
    const monopoly=group.every(id=>p2[id]?.owner===prop.owner);
    if (prop.hotel) return space.rent[5];
    if ((prop.houses||0)>0) return space.rent[prop.houses];
    if (monopoly) return space.rent[0]*2;
    return space.rent[0];
  };

  const doSpaceAction=(spaceId,player,gs,props,isDouble)=>{
    const space=SPACES[spaceId];
    if (!space) {pushState({...gs,rolled:true,rolling:false});setProcessing(false);return;}
    const players=safePlayers(gs).map(p=>({...p}));
    const log=safeLog(gs);
    const curIdx=gs.currentPlayer;
    const s=gs.settings||DEFAULT_SETTINGS;
    const now=Date.now();

    const finish=(updP,updProps,updFP,modal,forceEnd)=>{
      // Check target win
      const finalPlayers=updP||players;
      if (s.gameMode==="target") {
        const winner=finalPlayers.find(p=>!p.bankrupt&&p.money>=(s.targetAmount||10000));
        if (winner) {
          log.unshift(`🏆 ${winner.token} reached $${s.targetAmount}! WINNER!`);
          pushState({...gs,players:finalPlayers,properties:updProps!==undefined?updProps:props,
            freePot:updFP!==undefined?updFP:(gs.freePot||0),rolling:false,status:"gameover",log:log.slice(0,25),modal:null
          }).then(()=>setProcessing(false));
          return;
        }
      }
      pushState({...gs,
        players:finalPlayers,
        properties:updProps!==undefined?updProps:props,
        freePot:updFP!==undefined?updFP:(gs.freePot||0),
        rolled:forceEnd?true:!isDouble,
        rolling:false, modal:modal||null, log,
        turnStartTime:forceEnd||!isDouble?now:gs.turnStartTime,
      }).then(()=>setProcessing(false));
    };

    if (space.type==="go"||space.type==="jail") {
      finish(null,undefined,undefined,null,false);
    } else if (space.type==="gotojail") {
      log.unshift(`${player.token} — Go To Jail! 🔒`);
      players[curIdx]={...player,position:10,inJail:true,jailTurns:0};
      finish(players,undefined,undefined,null,true);
    } else if (space.type==="tax") {
      log.unshift(`${player.token} pays ${space.name}: $${space.amount}`);
      players[curIdx]={...player,money:player.money-space.amount};
      finish(players,undefined,(gs.freePot||0)+space.amount,null,false);
    } else if (space.type==="freeparking") {
      const pot=gs.freePot||0;
      log.unshift(`${player.token} collects Free Parking: $${pot}!`);
      players[curIdx]={...player,money:player.money+pot};
      finish(players,undefined,0,null,false);
    } else if (space.type==="chance") {
      const card=CHANCE_CARDS[Math.floor(Math.random()*CHANCE_CARDS.length)];
      log.unshift(`❓ Chance: ${card.text}`);
      players[curIdx]=card.action(player);
      finish(players,undefined,undefined,{type:"card",title:"❓ Chance!",text:card.text},false);
    } else if (space.type==="community") {
      const card=COMMUNITY_CARDS[Math.floor(Math.random()*COMMUNITY_CARDS.length)];
      log.unshift(`📋 Community: ${card.text}`);
      players[curIdx]=card.action(player);
      finish(players,undefined,undefined,{type:"card",title:"📋 Community Chest!",text:card.text},false);
    } else if (space.type==="property"||space.type==="railroad"||space.type==="utility") {
      const prop=props[spaceId];
      if (!prop) {
        finish(null,undefined,undefined,{type:"buy",spaceId,playerIdx:curIdx},false);
      } else if (prop.owner!==curIdx) {
        const rent=calcRent(space,prop,props,gs.dice);
        log.unshift(`${player.token} pays $${rent} rent to ${players[prop.owner]?.token||"?"}`);
        players[curIdx]={...player,money:player.money-rent};
        if (players[prop.owner]) players[prop.owner]={...players[prop.owner],money:players[prop.owner].money+rent};
        if (players[curIdx].money<0) {
          log.unshift(`${player.token} is BANKRUPT! 💸`);
          players[curIdx]={...players[curIdx],bankrupt:true};
        }
        finish(players,undefined,undefined,null,false);
      } else {
        finish(null,undefined,undefined,null,false);
      }
    } else {
      finish(null,undefined,undefined,null,false);
    }
  };

  const doMoveAndAction=(player,steps,gs,props,isDouble,d1,d2)=>{
    const players=safePlayers(gs).map(p=>({...p}));
    const oldPos=player.position, newPos=(oldPos+steps)%40;
    const log=safeLog(gs);
    if (oldPos+steps>=40) log.unshift(`${player.token} passed GO — +$200!`);
    log.unshift(`${player.token} → ${SPACES[newPos].name}`);
    const updPlayer={...player,position:newPos,money:(oldPos+steps>=40)?player.money+200:player.money};
    players[gs.currentPlayer]=updPlayer;
    const newGs={...gs,players,dice:[d1,d2],log:log.slice(0,25),rolling:false};
    const TOTAL_ANIM_MS=steps*200+300;
    pushState(newGs).then(()=>{
      setTimeout(()=>doSpaceAction(newPos,updPlayer,newGs,props,isDouble),TOTAL_ANIM_MS);
    });
  };

  const advanceTurn=(gs)=>{
    const players=safePlayers(gs);
    const active=players.filter(p=>p&&!p.bankrupt);
    if (active.length<=1) {
      pushState({...gs,status:"gameover"}).then(()=>setProcessing(false)); return;
    }
    let next=(gs.currentPlayer+1)%players.length;
    while (players[next]?.bankrupt) next=(next+1)%players.length;
    const log=safeLog(gs); log.unshift(`▶ Player ${next+1}'s turn`);
    pushState({...gs,currentPlayer:next,rolled:false,doubleCount:0,rolling:false,
      log:log.slice(0,25),turnStartTime:Date.now()
    }).then(()=>setProcessing(false));
  };

  const handleRoll=()=>{
    if (!isMyTurn||gameState.rolled||processing) return;
    setProcessing(true);
    const gs={...gsRef.current};
    const players=safePlayers(gs).map(p=>({...p}));
    const props=safeProps(gs);
    const player=players[gs.currentPlayer];
    if (!player||player.bankrupt) {advanceTurn(gs);return;}

    const d1=Math.ceil(Math.random()*6), d2=Math.ceil(Math.random()*6);
    const isDouble=d1===d2, newDC=isDouble?(gs.doubleCount||0)+1:0;
    const log=safeLog(gs);
    log.unshift(`${player.token} rolls ${d1}+${d2}=${d1+d2}${isDouble?" 🎲 Doubles!":""}`);
    pushState({...gs,rolling:true,log:log.slice(0,25)});

    setTimeout(()=>{
      if (player.inJail) {
        if (isDouble) {
          log.unshift(`${player.token} escapes jail with doubles!`);
          const freed={...player,inJail:false,jailTurns:0};
          players[gs.currentPlayer]=freed;
          const newGs={...gs,players,dice:[d1,d2],doubleCount:0,rolling:false,log:log.slice(0,25)};
          pushState(newGs).then(()=>setTimeout(()=>doMoveAndAction(freed,d1+d2,newGs,props,false,d1,d2),300));
        } else {
          const newJT=(player.jailTurns||0)+1;
          if (newJT>=3) {
            log.unshift(`${player.token} pays $50 fine — out of jail`);
            const freed={...player,inJail:false,jailTurns:0,money:player.money-50};
            players[gs.currentPlayer]=freed;
            const newGs={...gs,players,dice:[d1,d2],rolling:false,log:log.slice(0,25)};
            pushState(newGs).then(()=>setTimeout(()=>doMoveAndAction(freed,d1+d2,newGs,props,false,d1,d2),300));
          } else {
            log.unshift(`${player.token} still in jail (${newJT}/3)`);
            players[gs.currentPlayer]={...player,jailTurns:newJT};
            pushState({...gs,players,dice:[d1,d2],rolled:true,rolling:false,log:log.slice(0,25)})
              .then(()=>setProcessing(false));
          }
        }
        return;
      }
      if (newDC===3) {
        log.unshift(`${player.token} rolled 3 doubles — Jail! 🔒`);
        players[gs.currentPlayer]={...player,position:10,inJail:true,jailTurns:0};
        pushState({...gs,players,dice:[d1,d2],rolled:true,rolling:false,doubleCount:0,log:log.slice(0,25)})
          .then(()=>setProcessing(false));
        return;
      }
      doMoveAndAction(player,d1+d2,{...gs,players,doubleCount:newDC,log:log.slice(0,25)},props,isDouble,d1,d2);
    },900);
  };

  const endTurn=()=>{
    if (!isMyTurn||!gameState.rolled||processing) return;
    setProcessing(true); advanceTurn(gsRef.current);
  };

  // Auto-end turn when timer expires
  const handleTimerExpire=()=>{
    if (!isMyTurn||processing) return;
    const gs=gsRef.current;
    if (!gs.rolled) {
      // Force roll with random dice then end
      const d1=Math.ceil(Math.random()*6),d2=Math.ceil(Math.random()*6);
      const log=safeLog(gs);
      log.unshift(`⏰ Time expired! Auto-rolling for ${gs.players[gs.currentPlayer]?.token||""}`);
      const players=safePlayers(gs).map(p=>({...p}));
      const player=players[gs.currentPlayer];
      if (player&&!player.bankrupt) {
        doMoveAndAction(player,d1+d2,{...gs,players,doubleCount:0,log:log.slice(0,25)},safeProps(gs),false,d1,d2);
      } else advanceTurn(gs);
    } else {
      advanceTurn(gs);
    }
  };

  const dismissModal=()=>{if (!isMyTurn||!gameState?.modal) return; pushState({...gameState,modal:null});};

  const buyProperty=()=>{
    if (!isMyTurn||!gameState?.modal) return;
    const {spaceId,playerIdx}=gameState.modal;
    const space=SPACES[spaceId];
    const players=safePlayers(gameState).map(p=>({...p}));
    const props=safeProps(gameState);
    const player=players[playerIdx];
    const log=safeLog(gameState);
    if (!player||player.money<space.price) {pushState({...gameState,modal:null});return;}
    players[playerIdx]={...player,money:player.money-space.price};
    log.unshift(`${player.token} bought ${space.name} for $${space.price}`);
    pushState({...gameState,players,properties:{...props,[spaceId]:{owner:playerIdx,houses:0,hotel:false}},modal:null,log:log.slice(0,25)});
  };

  const buildHouse=(spaceId)=>{
    if (!isMyTurn||processing) return;
    const gs=gsRef.current; const space=SPACES[spaceId]; if (!space) return;
    const props=safeProps(gs); const prop=props[spaceId];
    if (!prop||prop.owner!==myIdx) return;
    const players=safePlayers(gs).map(p=>({...p})); const player=players[myIdx];
    const group=COLOR_GROUPS[space.color]||[];
    if (!group.every(id=>props[id]?.owner===myIdx)||prop.hotel) return;
    const cost=space.houseCost||100; if (player.money<cost) return;
    players[myIdx]={...player,money:player.money-cost};
    const log=safeLog(gs);
    const newProp=(prop.houses||0)>=4
      ?(log.unshift(`${player.token} built a 🏨 hotel on ${space.name}!`),{...prop,houses:0,hotel:true})
      :(log.unshift(`${player.token} built a 🏠 house on ${space.name}!`),{...prop,houses:(prop.houses||0)+1});
    pushState({...gs,players,properties:{...props,[spaceId]:newProp},log:log.slice(0,25)});
  };

  const payJailFine=()=>{
    if (!isMyTurn) return;
    const gs=gsRef.current; const players=safePlayers(gs).map(p=>({...p}));
    const player=players[myIdx]; if (!player||player.money<50) return;
    players[myIdx]={...player,money:player.money-50,inJail:false,jailTurns:0};
    const log=safeLog(gs); log.unshift(`${player.token} paid $50 jail fine`);
    pushState({...gs,players,log:log.slice(0,25)});
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
    setShowSettings(false); prevPositionsRef.current=null;
  };

  const CORNER=68, CELL=46;
  const cols=[CORNER,...Array(9).fill(CELL),CORNER];
  const rows=[CORNER,...Array(9).fill(CELL),CORNER];

  // ── LOBBY ─────────────────────────────────────────────────────────────────────
  if (screen==="lobby") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#14532d,#166534,#15803d)",
      display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
      <div style={{background:"#fefce8",borderRadius:16,padding:"36px 40px",textAlign:"center",
        boxShadow:"0 24px 64px rgba(0,0,0,0.5)",border:"4px solid #a16207",maxWidth:440,width:"100%"}}>
        <div style={{fontSize:64,marginBottom:4}}>🎲</div>
        <h1 style={{margin:"0 0 4px",fontSize:32,letterSpacing:4,color:"#14532d"}}>MONOPOLY</h1>
        <p style={{color:"#78716c",fontSize:13,marginBottom:24}}>Online Multiplayer</p>

        <div style={{marginBottom:20,padding:20,background:"#f0fdf4",borderRadius:10,border:"2px solid #bbf7d0"}}>
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
          <div style={{flex:1,height:1,background:"#d6d3d1"}}/><span style={{color:"#a8a29e",fontSize:12}}>OR</span>
          <div style={{flex:1,height:1,background:"#d6d3d1"}}/>
        </div>

        <div style={{padding:20,background:"#eff6ff",borderRadius:10,border:"2px solid #bfdbfe"}}>
          <h3 style={{margin:"0 0 10px",color:"#1e40af",fontSize:15}}>🔗 Join a Game</h3>
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==="Enter"&&joinGame()} placeholder="Enter room code" maxLength={6}
            style={{width:"100%",padding:"10px 14px",fontSize:20,textAlign:"center",
              border:"2px solid #93c5fd",borderRadius:8,boxSizing:"border-box",
              fontFamily:"monospace",letterSpacing:6,marginBottom:10,outline:"none",fontWeight:"bold"}}/>
          {error&&<p style={{color:"#dc2626",fontSize:12,margin:"0 0 8px"}}>{error}</p>}
          <button onClick={joinGame} style={{background:"#1e40af",color:"#fff",border:"none",
            padding:"12px 0",borderRadius:8,fontSize:15,fontWeight:"bold",cursor:"pointer",width:"100%"}}>
            Join Game →
          </button>
        </div>
      </div>
    </div>
  );

  // ── WAITING / SETTINGS ────────────────────────────────────────────────────────
  if (screen==="waiting") {
    const maxPlayers=gameState?.hostPlayerCount||playerCount;
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#14532d,#166534)",
        display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
        {showSettings&&isHost ? (
          <SettingsScreen
            settings={settings} onChange={setSettings}
            onBack={()=>setShowSettings(false)} onStart={forceStart}
            playerCount={playerCount} setPlayerCount={setPlayerCount}
            lobbyPlayers={lobbyPlayers} isHost={isHost}
          />
        ) : (
          <div style={{background:"#fefce8",borderRadius:16,padding:"36px 40px",textAlign:"center",
            boxShadow:"0 24px 64px rgba(0,0,0,0.5)",border:"4px solid #a16207",maxWidth:420,width:"100%"}}>
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
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",
                  borderRadius:8,marginBottom:6,background:p?"#f0fdf4":"#f5f5f4",
                  border:p?"2px solid #bbf7d0":"2px dashed #d6d3d1"}}>
                  <span style={{fontSize:20}}>{p?PLAYER_TOKENS[i]:"⬜"}</span>
                  <span style={{fontWeight:"bold",color:p?PLAYER_COLORS[i]:"#a8a29e",fontSize:13}}>
                    {p?`Player ${i+1}${i===myIdx?" (You)":""}`:i===0?"Host (connecting...)":"Waiting..."}
                  </span>
                  {p&&<span style={{marginLeft:"auto",color:"#16a34a",fontSize:12}}>✓</span>}
                </div>
              );
            })}
            <div style={{marginTop:16,display:"flex",gap:8,flexDirection:"column"}}>
              {isHost&&lobbyPlayers.length>=2&&(
                <>
                  <button onClick={()=>setShowSettings(true)} style={{background:"#1e40af",color:"#fff",
                    border:"none",padding:"11px 0",borderRadius:8,fontSize:14,fontWeight:"bold",cursor:"pointer"}}>
                    ⚙️ Game Settings
                  </button>
                  <button onClick={forceStart} style={{background:"#14532d",color:"#fff",
                    border:"none",padding:"11px 0",borderRadius:8,fontSize:14,fontWeight:"bold",cursor:"pointer"}}>
                    ▶ Start Game
                  </button>
                </>
              )}
              {isHost&&lobbyPlayers.length<2&&(
                <p style={{color:"#78716c",fontSize:13}}>Need at least 2 players to start</p>
              )}
              {!isHost&&<p style={{color:"#78716c",fontSize:13}}>Waiting for host to start...</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── GAME OVER ─────────────────────────────────────────────────────────────────
  if (gameState?.status==="gameover") {
    const ps=safePlayers(gameState);
    const winner=ps.length>0?ps.filter(p=>!p.bankrupt).reduce((a,b)=>a.money>b.money?a:b,ps.filter(p=>!p.bankrupt)[0]||ps[0]):null;
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#14532d,#15803d)",
        display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
        <div style={{background:"#fefce8",borderRadius:16,padding:48,textAlign:"center",
          border:"4px solid gold",boxShadow:"0 24px 64px rgba(0,0,0,0.5)",maxWidth:380,width:"100%"}}>
          <div style={{fontSize:80}}>🏆</div>
          <h2 style={{fontSize:30,color:"#14532d"}}>GAME OVER!</h2>
          {winner&&<><p style={{fontSize:20}}>{winner.token} Player {winner.id+1} wins!</p>
            <p style={{color:"#333",fontWeight:"bold"}}>💰 ${winner.money.toLocaleString()}</p></>}
          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:10}}>
            {ps.sort((a,b)=>b.money-a.money).map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",
                background:p.id===winner?.id?"#dcfce7":"#f5f5f4",borderRadius:8,
                border:p.id===winner?.id?"2px solid #14532d":"1px solid #e5e7eb"}}>
                {p.id===winner?.id&&<span>🏆</span>}
                <span style={{fontSize:20}}>{p.token}</span>
                <span style={{fontWeight:"bold",color:PLAYER_COLORS[p.id]}}>P{p.id+1}</span>
                <span style={{marginLeft:"auto",fontWeight:"bold",color:"#111"}}>${p.money.toLocaleString()}</span>
                {p.bankrupt&&<span style={{fontSize:11,color:"#dc2626"}}>💸 Bankrupt</span>}
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

  // ── LOADING ───────────────────────────────────────────────────────────────────
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

  // ── GAME BOARD ────────────────────────────────────────────────────────────────
  const rawPlayers=safePlayers(gameState);
  const displayPlayers=rawPlayers.map(p=>{
    if (!p) return p;
    const vis=visualPositions[p.id];
    return vis!==undefined?{...p,position:vis}:p;
  });
  const props   =safeProps(gameState);
  const logArr  =safeLog(gameState);
  const diceArr =safeDice(gameState);
  const isRolling=gameState.rolling===true;
  const cur     =rawPlayers[gameState.currentPlayer];
  const me      =rawPlayers[myIdx]||null;
  const modal   =gameState.modal||null;
  const selSpace=selectedSpace!==null?SPACES[selectedSpace]:null;
  const selProp =selectedSpace!==null?props[selectedSpace]:null;
  const gs_settings=gameState.settings||DEFAULT_SETTINGS;

  return (
    <div style={{minHeight:"100vh",background:"#14532d",fontFamily:"Georgia,serif",
      display:"flex",flexDirection:"column",padding:8,gap:8,boxSizing:"border-box"}}>

      {/* ── Header ── */}
      <div style={{background:"#fefce8",borderRadius:8,padding:"6px 12px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        border:"2px solid #a16207",flexShrink:0,flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:"bold",letterSpacing:2,color:"#14532d"}}>🎲 MONOPOLY</span>
          <span style={{fontSize:10,background:"#14532d",color:"#fff",padding:"2px 8px",
            borderRadius:10,fontFamily:"monospace"}}>{roomCode}</span>
          {/* Game mode badge */}
          <span style={{fontSize:10,background:"#1e40af",color:"#fff",padding:"2px 8px",borderRadius:10}}>
            {gs_settings.gameMode==="classic"?"⚔️ Classic":
             gs_settings.gameMode==="timed"?`⏱ ${gs_settings.timedMinutes}min`:
             `🎯 $${(gs_settings.targetAmount||10000).toLocaleString()}`}
          </span>
        </div>

        {/* Player cards */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {rawPlayers.map((p,i)=>p?(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4,opacity:p.bankrupt?0.4:1,
              background:gameState.currentPlayer===i?"#dcfce7":i===myIdx?"#fef9c3":"#f9f5e8",
              border:gameState.currentPlayer===i?"2px solid #14532d":i===myIdx?"2px solid #ca8a04":"2px solid #e5e7eb",
              borderRadius:6,padding:"3px 8px",transition:"background 0.3s"}}>
              <span style={{fontSize:14}}>{p.token}</span>
              <div>
                <div style={{fontSize:9,fontWeight:"bold",color:p.color}}>P{i+1}{i===myIdx?" ★":""}</div>
                {/* ← BLACK money text */}
                <div style={{fontSize:9,color:"#111",fontWeight:"bold"}}>${p.money.toLocaleString()}</div>
              </div>
              {p.inJail&&<span style={{fontSize:9}}>🔒</span>}
              {p.bankrupt&&<span style={{fontSize:9}}>💸</span>}
            </div>
          ):null)}
          {/* Timed mode game clock */}
          {gs_settings.gameMode==="timed"&&gameState.gameStartTime&&(
            <GameTimer
              gameStartTime={gameState.gameStartTime}
              limitMinutes={gs_settings.timedMinutes||60}
              onExpire={()=>{
                if (myIdx===0) { // only host triggers
                  const gs=gsRef.current;
                  const ps=safePlayers(gs);
                  const log=safeLog(gs);
                  log.unshift("⏰ Time's up! Game over!");
                  pushState({...gs,status:"gameover",log:log.slice(0,25)});
                }
              }}
            />
          )}
        </div>

        <button onClick={resetToLobby} style={{background:"#dc2626",color:"#fff",border:"none",
          padding:"4px 10px",borderRadius:4,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
          Leave
        </button>
      </div>

      {/* ── Turn banner ── */}
      <div style={{textAlign:"center",fontSize:13,fontWeight:"bold",padding:"2px 0",
        color:isMyTurn?"#86efac":"#fca5a5"}}>
        {isRolling?`🎲 ${cur?.token||""} Player ${(gameState.currentPlayer||0)+1} is rolling...`:
         isMyTurn?"✅ YOUR TURN — Roll the dice!":
         `⏳ Waiting for ${cur?.token||"?"} Player ${(gameState.currentPlayer||0)+1}...`}
      </div>

      {/* ── Board + Right Panel ── */}
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
                  onClick={()=>setSelectedSpace(selectedSpace===id?null:id)}
                  flashCell={flashCell} bouncingPlayer={bouncingPlayer}/>
              </div>
            ))}
            {/* Center */}
            <div style={{gridRow:"2/11",gridColumn:"2/11",background:"#c8e6c9",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,borderRadius:4}}>
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
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">

          {/* Controls */}
          {me&&!me.bankrupt&&(
            <div style={{background:"#fefce8",border:"2px solid #a16207",borderRadius:8,padding:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:24}}>{me.token}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:"bold",color:me.color,fontSize:13}}>You (P{myIdx+1})</div>
                  {/* ← BLACK money text */}
                  <div style={{fontSize:12,color:"#111",fontWeight:"bold"}}>${me.money.toLocaleString()}</div>
                  {gs_settings.turnTimer>0&&isMyTurn&&(
                    <TurnTimer
                      turnStartTime={gameState.turnStartTime||Date.now()}
                      limit={gs_settings.turnTimer}
                      onExpire={handleTimerExpire}
                      isMyTurn={isMyTurn}
                    />
                  )}
                </div>
                {me.inJail&&<span style={{fontSize:10,background:"#fef08a",padding:"2px 5px",borderRadius:4}}>🔒 JAIL</span>}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={handleRoll} disabled={!isMyTurn||gameState.rolled||processing}
                  style={{background:(!isMyTurn||gameState.rolled||processing)?"#e5e7eb":"#14532d",
                    color:(!isMyTurn||gameState.rolled||processing)?"#9ca3af":"#fff",
                    border:"none",padding:"8px 14px",borderRadius:6,fontSize:13,
                    cursor:(!isMyTurn||gameState.rolled||processing)?"default":"pointer",fontWeight:"bold"}}>
                  🎲 Roll
                </button>
                <button onClick={endTurn} disabled={!isMyTurn||!gameState.rolled||processing}
                  style={{background:(!isMyTurn||!gameState.rolled||processing)?"#e5e7eb":"#dc2626",
                    color:(!isMyTurn||!gameState.rolled||processing)?"#9ca3af":"#fff",
                    border:"none",padding:"8px 14px",borderRadius:6,fontSize:13,
                    cursor:(!isMyTurn||!gameState.rolled||processing)?"default":"pointer",fontWeight:"bold"}}>
                  End →
                </button>
                {me.inJail&&isMyTurn&&(
                  <button onClick={payJailFine} style={{background:"#d97706",color:"#fff",
                    border:"none",padding:"8px 10px",borderRadius:6,fontSize:11,cursor:"pointer"}}>
                    Pay $50
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Selected Space */}
          {selSpace&&(
            <div style={{background:"#fefce8",border:"2px solid #a16207",borderRadius:8,padding:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <strong style={{fontSize:12}}>{selSpace.name}</strong>
                <button onClick={()=>setSelectedSpace(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14}}>✕</button>
              </div>
              {selSpace.type==="property"&&selSpace.color&&(
                <div style={{height:10,background:selSpace.color,borderRadius:3,margin:"6px 0"}}/>
              )}
              {selSpace.price&&<div style={{fontSize:11,color:"#555"}}>Price: ${selSpace.price}</div>}
              {selProp&&(
                <div style={{fontSize:11,marginTop:4}}>
                  <div>Owner: {rawPlayers[selProp.owner]?.token} P{selProp.owner+1}</div>
                  <div>{selProp.hotel?"🏨 Hotel":`🏠 ×${selProp.houses||0}`}</div>
                </div>
              )}
              {selSpace.type==="property"&&selProp?.owner===myIdx&&isMyTurn&&(
                <button onClick={()=>buildHouse(selectedSpace)} style={{marginTop:8,background:"#15803d",
                  color:"#fff",border:"none",padding:"6px 0",borderRadius:4,fontSize:11,cursor:"pointer",width:"100%"}}>
                  Build House (${selSpace.houseCost})
                </button>
              )}
            </div>
          )}

          {/* Properties */}
          <div style={{background:"#fefce8",border:"2px solid #a16207",borderRadius:8,padding:10,overflowY:"auto",maxHeight:200}}>
            <div style={{fontSize:11,fontWeight:"bold",borderBottom:"1px solid #e7d9a0",paddingBottom:4,marginBottom:6}}>Properties</div>
            {Object.keys(props).length===0
              ?<div style={{color:"#bbb",fontSize:11,textAlign:"center",padding:8}}>None yet</div>
              :Object.entries(props).map(([id,prop])=>{
                if (!prop) return null;
                const space=SPACES[+id]; if (!space) return null;
                return (
                  <div key={id} onClick={()=>setSelectedSpace(+id)} style={{display:"flex",alignItems:"center",
                    gap:4,fontSize:10,padding:"2px 4px",borderRadius:3,cursor:"pointer",marginBottom:2,
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

          {/* Game Log */}
          <div style={{background:"#0f172a",borderRadius:8,padding:10,height:100,overflowY:"auto",border:"2px solid #334155"}}>
            {logArr.map((msg,i)=>(
              <div key={i} style={{color:i===0?"#86efac":"#64748b",fontSize:10,lineHeight:1.5}}>{msg}</div>
            ))}
          </div>

          {/* Chat */}
          <div style={{background:"#1e293b",border:"2px solid #334155",borderRadius:8,
            display:"flex",flexDirection:"column",flex:1,minHeight:180,maxHeight:260}}>
            <div style={{padding:"6px 10px",borderBottom:"1px solid #334155",
              fontSize:11,fontWeight:"bold",color:"#94a3b8",letterSpacing:1}}>
              💬 CHAT
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"6px 10px",display:"flex",flexDirection:"column",gap:4}}>
              {chatMessages.length===0&&(
                <div style={{color:"#475569",fontSize:10,textAlign:"center",marginTop:16}}>No messages yet. Say hi! 👋</div>
              )}
              {chatMessages.map((msg,i)=>{
                const isMe=msg.id===myIdx;
                return (
                  <div key={i} style={{display:"flex",flexDirection:isMe?"row-reverse":"row",alignItems:"flex-end",gap:4}}>
                    <span style={{fontSize:13,flexShrink:0}}>{msg.token}</span>
                    <div style={{background:isMe?"#14532d":"#334155",color:"#f1f5f9",
                      padding:"4px 8px",
                      borderRadius:isMe?"10px 10px 2px 10px":"10px 10px 10px 2px",
                      fontSize:11,maxWidth:"80%",wordBreak:"break-word",lineHeight:1.4}}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef}/>
            </div>
            <div style={{display:"flex",borderTop:"1px solid #334155",padding:6,gap:4}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")sendChat();}}
                placeholder="Type a message..." maxLength={120}
                style={{flex:1,background:"#0f172a",border:"1px solid #475569",borderRadius:6,
                  padding:"5px 8px",color:"#f1f5f9",fontSize:11,outline:"none"}}/>
              <button onClick={sendChat} disabled={!chatInput.trim()} style={{
                background:chatInput.trim()?"#14532d":"#1e293b",
                color:chatInput.trim()?"#fff":"#475569",border:"none",borderRadius:6,
                padding:"5px 10px",fontSize:13,cursor:chatInput.trim()?"pointer":"default",fontWeight:"bold"}}>
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}}>
          <div style={{background:"#fefce8",borderRadius:14,padding:28,maxWidth:320,width:"100%",
            border:"3px solid #a16207",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",textAlign:"center"}}>
            {modal.type==="buy"&&(()=>{
              const space=SPACES[modal.spaceId];
              const p=rawPlayers[modal.playerIdx];
              const isMe=modal.playerIdx===myIdx;
              if (!space||!p) return <div>Loading...</div>;
              return (
                <>
                  <div style={{fontSize:40,marginBottom:8}}>🏠</div>
                  <h3 style={{color:"#14532d",margin:"0 0 8px",fontSize:18}}>{space.name}</h3>
                  {space.color&&<div style={{height:12,background:space.color,borderRadius:4,margin:"6px 0"}}/>}
                  <div style={{fontSize:14,margin:"8px 0"}}>Price: <strong>${space.price}</strong></div>
                  <div style={{fontSize:12,color:"#78716c",marginBottom:16}}>
                    {isMe?`Your balance: $${p.money.toLocaleString()}`:`${p.token} P${p.id+1} is deciding...`}
                  </div>
                  {isMe?(
                    <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                      <button onClick={buyProperty} disabled={p.money<space.price}
                        style={{background:p.money>=space.price?"#14532d":"#9ca3af",color:"#fff",
                          border:"none",padding:"10px 22px",borderRadius:6,fontSize:14,fontWeight:"bold",
                          cursor:p.money>=space.price?"pointer":"default"}}>Buy ✓</button>
                      <button onClick={dismissModal} style={{background:"#dc2626",color:"#fff",
                        border:"none",padding:"10px 22px",borderRadius:6,fontSize:14,cursor:"pointer",fontWeight:"bold"}}>
                        Pass ✗
                      </button>
                    </div>
                  ):(
                    <p style={{color:"#78716c",fontSize:13}}>Waiting for their decision...</p>
                  )}
                </>
              );
            })()}
            {modal.type==="card"&&(
              <>
                <div style={{fontSize:40,marginBottom:8}}>{modal.title?.startsWith("❓")?"❓":"📋"}</div>
                <h3 style={{color:"#14532d",margin:"0 0 12px"}}>{modal.title}</h3>
                <p style={{fontSize:15,fontStyle:"italic",color:"#292524"}}>"{modal.text}"</p>
                {isMyTurn
                  ?<button onClick={dismissModal} style={{marginTop:16,background:"#14532d",color:"#fff",
                      border:"none",padding:"10px 26px",borderRadius:6,fontSize:14,cursor:"pointer",fontWeight:"bold"}}>OK</button>
                  :<p style={{color:"#78716c",fontSize:13,marginTop:12}}>Waiting for current player...</p>
                }
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
