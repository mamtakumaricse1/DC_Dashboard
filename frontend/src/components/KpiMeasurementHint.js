import React from "react";
import { formatKpiActual, formatMeasurementPeriodTag } from "../utils/formatKpi";
import { formatTpiSharePct } from "../constants/tpi";
import { resolveKpiDisplayFields } from "../utils/kpiDisplay";
import RagBadge from "./RagBadge";

/** One-line score + contribution context under a KPI name. */
export default function KpiMeasurementHint({ kpi }) {
  if (!kpi) return null;

  const k = resolveKpiDisplayFields(kpi);
  const displayUnit = k.reportedUnit || k.unit;
  const displayUnitLabel = k.reportedUnitLabel || k.unitLabel;

  return (
    <div className="kpi-measurement-hint">
      <div className="kpi-measurement-tags">
        <span className="kpi-tag">{formatMeasurementPeriodTag(
          k.freq,
          displayUnit,
          displayUnitLabel,
          k.name || k.indicator
        )}</span>
        {k.catalogTarget != null && (
          <span className="kpi-tag">Target {k.catalogTarget}</span>
        )}
        {k.shareInTpiPct != null && (
          <span className="kpi-tag kpi-tag--weight">{formatTpiSharePct(k.shareInTpiPct)} of district TPI</span>
        )}
        {k.status && k.status !== "NO_DATA" && (
          <RagBadge status={k.status === "AWAITING" ? "YELLOW" : k.status}>
            {k.status === "AWAITING" ? "Awaiting" : k.status}
          </RagBadge>
        )}
      </div>
      {k.scoreExplanation && (
        <p className="kpi-measurement-formula">{k.scoreExplanation}</p>
      )}
      {k.tpiContributionNote && (
        <p className="kpi-measurement-contrib">{k.tpiContributionNote}</p>
      )}
      {k.actualValue != null && (
        <p className="kpi-measurement-actual">
          Reported: {formatKpiActual(k.actualValue, displayUnit, displayUnitLabel, k.name || k.indicator)}
          {k.numerator != null && k.denominator != null && k.field1Label && k.field2Label && (
            <> ({k.numerator} {k.field2Label} of {k.denominator} {k.field1Label})</>
          )}
          {k.reportedMonth ? ` (filed ${k.reportedMonth})` : ""}
        </p>
      )}
    </div>
  );
}
