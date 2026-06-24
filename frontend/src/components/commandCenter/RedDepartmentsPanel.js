import React from "react";
import { toMonthLabel } from "../../utils/api";
import EmptyState from "../EmptyState";
import RagBadge from "../RagBadge";

/** KRAs with at least one RED KPI for the selected month. */
export default function RedDepartmentsPanel({
  redDepartments,
  selectedMonth,
  onDrillDown,
  onNavigate
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Who is RED?</h2>
        <p className="panel-hint">
          Departments with KPIs below 70 for {toMonthLabel(selectedMonth)}.{" "}
          <strong>Click a row</strong> to see indicators → then set targets in{" "}
          <button type="button" className="inline-link" onClick={() => onNavigate("action-tracker")}>
            Set targets
          </button>.
        </p>
      </div>
      <div className="panel-body-inset">
        {redDepartments?.length === 0 ? (
          <EmptyState
            tone="ok"
            title="No RED KRAs this month"
            subtitle="All departments are green or yellow for the selected month."
            compact
          />
        ) : (
          <ul className="red-dept-list">
            {redDepartments.map((d) => (
              <li key={d.id}>
                <button type="button" className="red-dept-item" onClick={() => onDrillDown(d)}>
                  <span className="red-dept-name">{d.kra}</span>
                  <RagBadge status="RED">{d.redCount} RED</RagBadge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
