import React from "react";
import PropTypes from "prop-types";
import { PLAYER_COLORS, COLOR_LABELS, SPACES } from "../constants";

export default function AnalyticsDashboard({
  rawPlayers = [],
  wealthSeries = [],
  wealthMode = "net",
  setWealthMode = () => { },
  chartMin = 0,
  chartMax = 10000,
  myGroupChances = [],
  playerProbabilities = [],
  riskByPlayer = [],
  colorSetInsights = [],
  dangerousZones = [],
}) {
  const getRiskClass = (risk) => {
    if (risk < 30) return "low";
    if (risk < 55) return "med";
    if (risk < 75) return "high";
    return "crit";
  };

  return (
    <div className="analytics-panel">
      <div className="analytics-title">📊 STRATEGY DASHBOARD (LIVE)</div>

      <div className="analytics-card">
        <div className="row-between margin-bottom-6">
          <div className="card-title-tiny">Wealth Growth</div>
          <div className="flex-gap-4">
            <button
              className={`pill text-xs ${wealthMode === "net" ? "active" : ""}`}
              onClick={() => setWealthMode("net")}
            >
              Net Worth
            </button>
            <button
              className={`pill text-xs ${wealthMode === "assets" ? "active" : ""}`}
              onClick={() => setWealthMode("assets")}
            >
              Assets
            </button>
          </div>
        </div>
        <svg width="100%" viewBox="0 0 300 110" className="chart-svg">
          {rawPlayers.map((p, pid) => {
            if (!p) return null;
            const pts = wealthSeries
              .map((pt, idx) => {
                const v = pt.values.find((x) => x.id === pid);
                const value = wealthMode === "net" ? v?.net || 0 : v?.assets || 0;
                const x =
                  wealthSeries.length === 1
                    ? 10
                    : 10 + idx * (280 / (wealthSeries.length - 1));
                const y =
                  100 -
                  ((value - chartMin) / (chartMax - chartMin || 1)) * 85;
                return `${x},${y}`;
              })
              .join(" ");
            return (
              <g key={`player-line-${p.id ?? pid}`}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={PLAYER_COLORS[pid]}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {wealthSeries.map((pt, idx) => {
                  const v = pt.values.find((x) => x.id === pid);
                  const value = wealthMode === "net" ? v?.net || 0 : v?.assets || 0;
                  const x =
                    wealthSeries.length === 1
                      ? 10
                      : 10 + idx * (280 / (wealthSeries.length - 1));
                  const y =
                    100 -
                    ((value - chartMin) / (chartMax - chartMin || 1)) * 85;
                  return (
                    <circle
                      key={`pt-${pid}-${idx}`}
                      cx={x}
                      cy={y}
                      r="2"
                      fill={PLAYER_COLORS[pid]}
                    />
                  );
                })}
              </g>
            );
          })}
          {wealthSeries.map((pt, idx) => {
            if (!pt.event) return null;
            const x =
              wealthSeries.length === 1
                ? 10
                : 10 + idx * (280 / (wealthSeries.length - 1));
            return (
              <circle
                key={`ev-${pt.timestamp || pt.id || idx}`}
                cx={x}
                cy="12"
                r="3"
                fill="#f59e0b"
              />
            );
          })}
        </svg>
        <div className="chart-desc">
          Orange dots mark big moments like monopoly swings, bankruptcies, or heavy rent hits.
        </div>
      </div>

      <div className="analytics-card">
        <div className="card-title-tiny margin-bottom-6">Monopoly Completion Chance</div>
        {myGroupChances.length > 0 && (
          <div className="text-xs text-dim margin-bottom-8">
            {myGroupChances.map((g) => `${g.label}: ${g.chance}%`).join(" • ")}
          </div>
        )}
        {playerProbabilities.map((p) => (
          <div key={`prob-${p.pid}`} className="margin-bottom-6">
            <div className="row-between text-xs">
              <span className={`weight-bold player-${p.pid}-text`}>P{p.pid + 1}</span>
              <span>{p.chance}% • {p.progress}</span>
            </div>
            <div className="meter-track">
              <div
                className={`player-${p.pid}-bg h-full meter-fill`}
                style={{ width: `${p.chance}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="analytics-card">
        <div className="risk-title">Bankruptcy Risk</div>
        {riskByPlayer.map((r) => {
          const riskClass = getRiskClass(r.risk);
          return (
            <div key={`risk-p${r.pid}`} className="risk-row">
              <span className={`risk-player player-${r.pid}-text`}>P{r.pid + 1}</span>
              <div className="flex-1 meter-track">
                <div
                  className={`risk-${riskClass}-bg h-full meter-fill`}
                  style={{ width: `${r.risk}%` }}
                />
              </div>
              <span className={`risk-value risk-${riskClass}-text`}>
                {r.risk}% ({r.label})
              </span>
            </div>
          );
        })}
      </div>

      <div className="analytics-card margin-0">
        <div className="risk-title">Strongest Sets & Danger Zones</div>
        {colorSetInsights.length === 0 ? (
          <div className="text-xs text-dim">
            No complete monopoly set yet — trading and blocking are wide open.
          </div>
        ) : (
          <div className="insight-list">
            {colorSetInsights.slice(0, 2).map((set) => (
              <div key={`set-insight-${set.owner}-${set.color}`} className="insight-item">
                <strong className={`weight-bold player-${set.owner}-text`}>P{set.owner + 1}</strong>{" "}
                controls <strong className="weight-bold">{COLOR_LABELS[set.color] || "Color"}</strong> •
                Potential ${set.incomePotential}/round • Upgrades {set.upgrades}
              </div>
            ))}
          </div>
        )}
        <div className="text-xs text-dim margin-top-6">
          Danger zones:{" "}
          {dangerousZones.length
            ? dangerousZones
              .map(
                (z) =>
                  `${SPACES[z.id]?.name} (P${z.owner + 1} • $${z.rent})`,
              )
              .join(" • ")
            : "none yet"}
        </div>
      </div>
    </div>
  );
}

AnalyticsDashboard.propTypes = {
  rawPlayers: PropTypes.array,
  wealthSeries: PropTypes.array,
  wealthMode: PropTypes.string,
  setWealthMode: PropTypes.func,
  chartMin: PropTypes.number,
  chartMax: PropTypes.number,
  myGroupChances: PropTypes.array,
  playerProbabilities: PropTypes.array,
  riskByPlayer: PropTypes.array,
  colorSetInsights: PropTypes.array,
  dangerousZones: PropTypes.array,
};
