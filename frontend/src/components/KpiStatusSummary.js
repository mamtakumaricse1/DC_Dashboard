/**
 * Reusable RAG summary stat cards (department or district views).
 */
import React from "react";

const DEFAULT_COUNTS = { green: 0, yellow: 0, red: 0, totalIndicators: 0 };

/**
 * @param {object} props
 * @param {object} [props.dept] - department with optional score
 * @param {object} [props.counts] - { green, yellow, red, totalIndicators }
 * @param {boolean} [props.showKraScore=true]
 */
export default function KpiStatusSummary({ dept, counts = DEFAULT_COUNTS, showKraScore = true }) {
  return (
    <section className="summary-row" aria-label="Department summary">
      {showKraScore && (
        <div className="stat-card stat-card--primary">
          <div className="stat-card-label">Dept score</div>
          <div className="stat-card-value">{Number(dept?.score || 0).toFixed(1)}</div>
        </div>
      )}
      <div className="stat-card stat-card--green">
        <div className="stat-card-label">Green</div>
        <div className="stat-card-value">{counts.green}</div>
      </div>
      <div className="stat-card stat-card--yellow">
        <div className="stat-card-label">Yellow</div>
        <div className="stat-card-value">{counts.yellow}</div>
      </div>
      <div className="stat-card stat-card--red">
        <div className="stat-card-label">Red</div>
        <div className="stat-card-value">{counts.red}</div>
      </div>
      <div className="stat-card stat-card--gray">
        <div className="stat-card-label">Indicators</div>
        <div className="stat-card-value">{counts.totalIndicators}</div>
      </div>
    </section>
  );
}
