import { EQUAL_KPI_TPI_PCT } from "../constants/tpi";

/** Ratio KPIs store a % in actual_value but catalog unit may still say count. */
const RATIO_AS_PERCENT_NAME = /Pending Forwarding|Forwarded to DTO|Within \d+ Days|Received \(volume/i;

/**
 * Normalize KPI rows for display — equal TPI share + correct reported unit.
 * Safe to call on API payloads (works even if backend is on an older build).
 */
export function resolveKpiDisplayFields(kpi = {}) {
  if (!kpi) return kpi;

  const name = kpi.name || kpi.indicator || "";
  const hasRatioFields =
    kpi.numerator != null &&
    kpi.denominator != null &&
    Number(kpi.denominator) > 0;
  const ratioAsPercent =
    kpi.reportedUnit === "pct" ||
    kpi.reportedUnitLabel === "%" ||
    hasRatioFields ||
    (kpi.unit === "count" && RATIO_AS_PERCENT_NAME.test(name));

  const reportedUnit = ratioAsPercent ? "pct" : kpi.reportedUnit || kpi.unit;
  const reportedUnitLabel = ratioAsPercent ? "%" : kpi.reportedUnitLabel || kpi.unitLabel;
  const score = kpi.score ?? kpi.indicatorScore ?? null;

  return {
    ...kpi,
    reportedUnit,
    reportedUnitLabel,
    shareInTpiPct: EQUAL_KPI_TPI_PCT,
    tpiContributionPts:
      score != null
        ? Number(((Number(score) * EQUAL_KPI_TPI_PCT) / 100).toFixed(2))
        : kpi.tpiContributionPts ?? null
  };
}
