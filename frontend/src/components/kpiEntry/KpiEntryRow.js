/**
 * Single KPI row in the department data-entry table.
 */
import React from "react";
import { displayScore, formatScore, isRatioKpi, preventWheelInputChange } from "../../utils/kpiEntry";

export default function KpiEntryRow({
  kpi,
  index,
  field1Value,
  field2Value,
  singleValue,
  onField1Change,
  onField2Change,
  onSingleChange
}) {
  const ratio = isRatioKpi(kpi);
  const result = ratio
    ? displayScore(kpi, field1Value, field2Value, null)
    : displayScore(kpi, null, null, singleValue);

  const targetDisplay =
    kpi.target_display ||
    (kpi.polarity === "LOWER"
      ? `≤ ${kpi.target_value ?? 0}%`
      : `${kpi.target_value ?? 100}%`);

  return (
    <tr>
      <td>{index + 1}</td>
      <td className="kra">{kpi.name}</td>
      <td>
        {ratio ? (
          <div className="entry-field">
            <label className="entry-field-label">{kpi.field1_label}</label>
            <input
              className="entry-input"
              type="number"
              step="any"
              min="0"
              value={field1Value ?? ""}
              onChange={(e) => onField1Change(kpi.kpi_id, e.target.value)}
              onWheel={preventWheelInputChange}
              placeholder="0"
            />
          </div>
        ) : (
          <div className="entry-field">
            <label className="entry-field-label">{kpi.input_label || "Value"}</label>
            <input
              className="entry-input"
              type="number"
              step="any"
              min="0"
              value={singleValue ?? ""}
              onChange={(e) => onSingleChange(kpi.kpi_id, e.target.value)}
              onWheel={preventWheelInputChange}
              placeholder="0"
            />
          </div>
        )}
      </td>
      <td>
        {ratio ? (
          <div className="entry-field">
            <label className="entry-field-label">{kpi.field2_label}</label>
            <input
              className="entry-input"
              type="number"
              step="any"
              min="0"
              value={field2Value ?? ""}
              onChange={(e) => onField2Change(kpi.kpi_id, e.target.value)}
              onWheel={preventWheelInputChange}
              placeholder="0"
            />
          </div>
        ) : (
          <span className="entry-na">—</span>
        )}
      </td>
      <td className="entry-target">{targetDisplay}</td>
      <td className="entry-score">
        <strong>{formatScore(kpi, result)}</strong>
      </td>
    </tr>
  );
}
