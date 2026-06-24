const UNIT_LABELS = {
  pct: '%',
  count: '',
  schools: 'schools',
  villages: 'villages',
  hours: 'hours',
  days: 'days',
  AWCs: 'AWCs',
  cases: 'cases',
  events: 'events',
  units: 'units',
  persons: 'persons'
};

export function unitLabelFor(unit, unitLabel) {
  if (unitLabel) return unitLabel;
  return UNIT_LABELS[unit] ?? unit ?? '';
}

export function formatKpiActual(value, unit, unitLabel, name = "") {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const measure = formatMeasurementUnit(unit, unitLabel, name);
  const num = Number(value);
  const formatted = Number.isInteger(num) ? String(num) : num.toFixed(1);
  if (measure === '%') return `${formatted}%`;
  if (measure === 'per lakh') return `${formatted} / lakh`;
  const label = unitLabelFor(unit, unitLabel);
  if (!label) return formatted;
  return `${formatted} ${label}`;
}

export function formatMeasurementUnit(unit, unitLabel, name = "") {
  if (unitLabel === "yes/no") return "yes/no";
  if (unit === "pct" || unitLabel === "%") return "%";
  if (
    unit === "rate" ||
    unitLabel === "rate" ||
    unitLabel === "per lakh" ||
    /per lakh/i.test(name)
  ) {
    return "per lakh";
  }
  if (/Rate/i.test(name) && unit !== "rate") return "%";
  if (unitLabel) return unitLabel;
  if (unit === "count") return "count";
  if (unit) return unit;
  return "value";
}

export function formatMeasurementPeriodTag(freq, unit, unitLabel, name = "") {
  const period = freq === "Q" ? "Quarterly" : "Monthly";
  const measure = formatMeasurementUnit(unit, unitLabel, name);
  return `${period} (${measure})`;
}

export function formatTargetDisplay(row) {
  if (row?.targetType === 'QUARTERLY' && row?.targetActual != null) {
    const label = row.unitLabel || formatMeasurementUnit(row.unit, row.unitLabel, row.indicator) || 'count';
    const q = row.targetQuarter ? ` (${row.targetQuarter})` : '';
    return `${row.targetActual} ${label}${q}`;
  }
  if (row?.targetScore != null) {
    return row.targetType === 'QUARTERLY'
      ? String(row.targetScore)
      : `${Number(row.targetScore).toFixed(1)} score`;
  }
  return '—';
}

export function formatActualDisplay(row) {
  if (row?.targetType === 'QUARTERLY') {
    const val = row.cumulativeActual ?? row.actualScore;
    return formatKpiActual(val, row.unit, row.unitLabel);
  }
  if (row?.progressScore != null) {
    return `${formatKpiActual(row.cumulativeActual, row.unit, row.unitLabel)} · ${Number(row.progressScore).toFixed(1)}%`;
  }
  if (row?.actualValue != null) {
    return formatKpiActual(row.actualValue, row.unit, row.unitLabel);
  }
  if (row?.actualScore != null) {
    return Number(row.actualScore).toFixed(1);
  }
  return '—';
}
