import React from "react";
import { ragStatusClass, ragStatusFromScore } from "../../constants/tpi";
import {
  displayScore,
  formatScore,
  isKpiDueThisMonth,
  isRatioKpi,
  preventWheelInputChange
} from "../../utils/kpiEntry";

function periodLabel(kpi) {
  if (kpi.freq === "Q" && kpi.reporting_quarter_label) {
    return kpi.reporting_quarter_label;
  }
  return kpi.freq === "Q" ? "Quarterly" : "Monthly";
}

export default function KpiEntryCard({
  kpi,
  index,
  field1Value,
  field2Value,
  singleValue,
  onField1Change,
  onField2Change,
  onSingleChange
}) {
  const due = isKpiDueThisMonth(kpi);
  const ratio = isRatioKpi(kpi);
  const result = ratio
    ? displayScore(kpi, field1Value, field2Value, null)
    : displayScore(kpi, null, null, singleValue);

  const complete = due && (ratio
    ? result != null
    : singleValue !== "" && singleValue != null && Number.isFinite(Number(singleValue)));

  const scoreText = due ? formatScore(kpi, result) : "—";
  const ragClass = due && result != null ? ragStatusClass(ragStatusFromScore(result)) : "";

  return (
    <div
      className={`kpi-entry-row ${complete ? "kpi-entry-row--done" : ""} ${
        !due ? "kpi-entry-row--deferred" : ""
      }`}
    >
      <div className="kpi-entry-row-indicator">
        <span className="kpi-entry-row-num">{index + 1}</span>
        <div className="kpi-entry-row-titles">
          <span className="kpi-entry-row-name">{kpi.name}</span>
          <span className="kpi-entry-row-freq">{periodLabel(kpi)}</span>
          {!due && kpi.quarter_due_note && (
            <span className="kpi-entry-row-defer">{kpi.quarter_due_note}</span>
          )}
        </div>
      </div>

      <div className={`kpi-entry-row-fields ${ratio ? "" : "kpi-entry-row-fields--single"}`}>
        {!due ? (
          <p className="kpi-entry-row-skip">Not required this month</p>
        ) : ratio ? (
          <>
            <label className="kpi-entry-row-field">
              <span>{kpi.field1_label}</span>
              <input
                className="entry-input"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={field1Value ?? ""}
                onChange={(e) => onField1Change(kpi.kpi_id, e.target.value)}
                onWheel={preventWheelInputChange}
                placeholder="0"
                aria-label={`${kpi.name} — ${kpi.field1_label}`}
              />
            </label>
            <label className="kpi-entry-row-field">
              <span>{kpi.field2_label}</span>
              <input
                className="entry-input"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={field2Value ?? ""}
                onChange={(e) => onField2Change(kpi.kpi_id, e.target.value)}
                onWheel={preventWheelInputChange}
                placeholder="0"
                aria-label={`${kpi.name} — ${kpi.field2_label}`}
              />
            </label>
          </>
        ) : (
          <label className="kpi-entry-row-field">
            <span>{kpi.input_label || "Value"}</span>
            <select
              className="entry-input entry-select"
              value={singleValue ?? ""}
              onChange={(e) => onSingleChange(kpi.kpi_id, e.target.value)}
              aria-label={kpi.name}
            >
              <option value="">Select…</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </label>
        )}
      </div>

      <div className="kpi-entry-row-score" aria-live="polite">
        <span className="kpi-entry-row-score-label">Score</span>
        <span className={`kpi-entry-row-score-value ${ragClass}`}>{scoreText}</span>
      </div>
    </div>
  );
}
