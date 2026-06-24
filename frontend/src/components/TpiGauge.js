import React from "react";
import RagBadge from "./RagBadge";
import { ragStatusFromScore } from "../constants/tpi";

/**
 * Semicircle gauge for district TPI (0–100) with RAG-colored arc.
 */
export default function TpiGauge({ score = 0, label = "District score", monthLabel }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const status = ragStatusFromScore(value);

  const cx = 100;
  const cy = 88;
  const r = 68;
  const startAngle = Math.PI;
  const endAngle = 0;
  const needleAngle = startAngle - (value / 100) * Math.PI;

  const arcPoint = (angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle)
  });

  const describeArc = (from, to) => {
    const a = arcPoint(from);
    const b = arcPoint(to);
    const large = from - to > Math.PI ? 1 : 0;
    return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
  };

  const needleLen = r - 10;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  return (
    <div className={`tpi-gauge tpi-gauge--${status.toLowerCase()}`}>
      <div className="tpi-gauge-visual">
        <svg viewBox="0 0 200 100" className="tpi-gauge-svg" role="img" aria-label={`${label}: ${value.toFixed(1)}`}>
          <path d={describeArc(startAngle, startAngle - 0.7 * Math.PI)} className="tpi-gauge-zone tpi-gauge-zone--red" />
          <path d={describeArc(startAngle - 0.7 * Math.PI, startAngle - 0.9 * Math.PI)} className="tpi-gauge-zone tpi-gauge-zone--yellow" />
          <path d={describeArc(startAngle - 0.9 * Math.PI, endAngle)} className="tpi-gauge-zone tpi-gauge-zone--green" />
          <circle cx={cx} cy={cy} r="4" className="tpi-gauge-hub" />
          <line x1={cx} y1={cy} x2={nx} y2={ny} className="tpi-gauge-needle" />
          <text x={10} y={98} className="tpi-gauge-tick">0</text>
          <text x={190} y={98} className="tpi-gauge-tick" textAnchor="end">100</text>
        </svg>
        <div className="tpi-gauge-score" aria-hidden="true">
          {value.toFixed(1)}
        </div>
      </div>
      <div className="tpi-gauge-caption">
        <span className="tpi-gauge-label">{label}</span>
        <span className="tpi-gauge-sublabel">Average of all KPI scores (0–100)</span>
        <div className="tpi-gauge-caption-row">
          {monthLabel && <span className="tpi-gauge-month">{monthLabel}</span>}
          <RagBadge status={status} className="tpi-gauge-status-badge">
            {status}
          </RagBadge>
        </div>
      </div>
    </div>
  );
}
