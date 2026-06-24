/**
 * Department KPI entry — one full-width row per indicator.
 */
import React from "react";
import KpiEntryCard from "./KpiEntryCard";

export default function KpiEntryTable({
  kpis,
  field1Values,
  field2Values,
  singleValues,
  onField1Change,
  onField2Change,
  onSingleChange
}) {
  if (kpis.length === 0) {
    return <p className="kpi-entry-empty">No KPIs found for your department.</p>;
  }

  return (
    <div className="kpi-entry-sheet">
      <div className="kpi-entry-sheet-head" aria-hidden="true">
        <span className="kpi-entry-sheet-col kpi-entry-sheet-col--name">Indicator</span>
        <span className="kpi-entry-sheet-col kpi-entry-sheet-col--fields">Your numbers</span>
        <span className="kpi-entry-sheet-col kpi-entry-sheet-col--score">Score</span>
      </div>
      <div className="kpi-entry-list">
        {kpis.map((k, idx) => (
          <KpiEntryCard
            key={k.kpi_id}
            kpi={k}
            index={idx}
            field1Value={field1Values[k.kpi_id]}
            field2Value={field2Values[k.kpi_id]}
            singleValue={singleValues[k.kpi_id]}
            onField1Change={onField1Change}
            onField2Change={onField2Change}
            onSingleChange={onSingleChange}
          />
        ))}
      </div>
    </div>
  );
}
