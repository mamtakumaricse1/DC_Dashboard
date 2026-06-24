/**
 * Simplified admin overview — compact rows that expand for detail.
 */
import React, { useState } from "react";
import RagBadge from "./RagBadge";
import { trendLabel } from "../constants/tpi";

function RagPills({ green, yellow, red }) {
  return (
    <span className="rag-pills">
      <span className="rag-pill rag-pill--green" title="Green">{green}</span>
      <span className="rag-pill rag-pill--yellow" title="Yellow">{yellow}</span>
      <span className="rag-pill rag-pill--red" title="Red">{red}</span>
    </span>
  );
}

function DeptRow({ dept, rank, expanded, onToggle, onOpenTracker, onDrillDown }) {
  return (
    <div className={`accordion-item ${expanded ? "expanded" : ""}`}>
      <button
        type="button"
        className="accordion-trigger overview-trigger"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="accordion-chevron" aria-hidden="true">
          {expanded ? "▼" : "▶"}
        </span>
        <span className="overview-rank">{rank}</span>
        <span
          role="button"
          tabIndex={0}
          className="overview-kra overview-kra-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDrillDown?.(dept);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onDrillDown?.(dept);
            }
          }}
        >
          {dept.kra}
        </span>
        <span className="overview-score">{Number(dept.score || 0).toFixed(1)}</span>
        <RagBadge status={dept.ragStatus} className="overview-status">
          {dept.ragStatus}
        </RagBadge>
        <RagPills
          green={dept.greenCount}
          yellow={dept.yellowCount}
          red={dept.redCount}
        />
        <span className={`overview-trend trend-${dept.trend || "FLAT"}`}>
          {trendLabel(dept.trend)}
        </span>
      </button>

      {expanded && (
        <div className="accordion-body overview-detail">
          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-label">Department</span>
              <span className="detail-value">{dept.owner}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">KPIs</span>
              <span className="detail-value">{dept.indicators}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Avg achievement</span>
              <span className="detail-value">{Number(dept.achievement || 0).toFixed(1)}%</span>
            </div>
            <div className="detail-field detail-field--wide">
              <span className="detail-label">Top red issue</span>
              <span className="detail-value top-red">
                {dept.topRedIndicator || "None"}
              </span>
            </div>
          </div>
          {dept.redCount > 0 && (
            <button
              type="button"
              className="action-save-btn overview-tracker-btn"
              onClick={() => onOpenTracker(dept)}
            >
              Set targets
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OverviewDeptTable({ departments, onOpenTracker, onDrillDown }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!departments.length) {
    return <div className="accordion-empty">No department data available.</div>;
  }

  return (
    <div className="accordion-list overview-list">
      <div className="overview-list-header" aria-hidden="true">
        <span className="overview-header-spacer" />
        <span>#</span>
        <span>KRA</span>
        <span>Score</span>
        <span>Status</span>
        <span>G / Y / R</span>
        <span>Trend</span>
      </div>
      {departments.map((dept, idx) => (
        <DeptRow
          key={dept.id}
          dept={dept}
          rank={idx + 1}
          expanded={expandedId === dept.id}
          onToggle={() => setExpandedId(expandedId === dept.id ? null : dept.id)}
          onOpenTracker={onOpenTracker}
          onDrillDown={onDrillDown}
        />
      ))}
    </div>
  );
}
