import React from "react";
import EmptyState from "../EmptyState";

/** Open DC commitments past due date or due today. */
export default function OverdueTargetsPanel({ overdue, onNavigate }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Overdue / due targets</h2>
        <button
          type="button"
          className="action-save-btn"
          onClick={() => onNavigate("target-followup")}
        >
          Open full follow-up
        </button>
      </div>
      <div className="panel-body-inset">
        {overdue.length === 0 ? (
          <EmptyState
            tone="ok"
            title="No overdue targets"
            subtitle="All DC commitments are on track for this period."
            compact
          />
        ) : (
          <ul className="overdue-list">
            {overdue.slice(0, 5).map((t, i) => (
              <li key={t.actionId || i} className="overdue-item">
                <span className="kra">{t.kra}</span>
                <span className="top-red">{t.indicator}</span>
                <span className="due-badge due-badge--late">{t.dueLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
