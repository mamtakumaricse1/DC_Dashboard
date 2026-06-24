/**
 * KPI data-entry specification — single source of truth for field labels and scoring.
 *
 * Used by:
 *   - GET /api/dept/kpis (enrichKpiWithEntrySpec)
 *   - POST /api/dept/submit (resolveSubmissionEntry)
 *   - kpiGuideService (enter hints)
 *
 * Rule: all KPIs use two fields (Total/Base + Achieved) except yes/no indicators.
 *       actual_value = (field2 ÷ field1) × ratioScale (default 100 = %).
 */const { getCatalogKpi } = require('../constants/kpiCatalog');
const FIELD_LABELS = require('../constants/kpiFieldLabels.json');

const YES_NO_PATTERN = /yes\/no/i;

function resolveRatioScale(unit, unitLabel, name, polarity) {
  if (unit === 'rate' || unitLabel === 'rate' || /per lakh/i.test(String(name))) return 100000;
  // Default: express result as percentage (deaths 3/30 = 10%, achieved 27/30 = 90%)
  return 100;
}

function defaultFieldLabels(name, polarity) {
  if (/Deaths/i.test(name)) {
    return name.includes('Maternal')
      ? ['Registered mothers', 'Deaths']
      : ['Registered infants', 'Deaths'];
  }
  if (polarity === 'LOWER') return ['Total base', 'Adverse count'];
  return ['Target', 'Achieved'];
}

function resolveFieldLabels(kpiId, name, polarity) {
  if (FIELD_LABELS[kpiId]) return FIELD_LABELS[kpiId];
  return defaultFieldLabels(name, polarity);
}

function isYesNoKpi(kpi) {
  const unitLabel = kpi.unit_label || kpi.unitLabel || kpi.unit || '';
  return YES_NO_PATTERN.test(unitLabel) || /Dashboard Released On Time/i.test(kpi.name || '');
}

function resolveEntrySpec(kpi) {
  const catalog = kpi.kpi_id ? getCatalogKpi(kpi.kpi_id) : null;
  const merged = { ...catalog, ...kpi };
  const kpiId = merged.kpi_id || merged.kpiId;
  const name = merged.name || merged.kpi_name || '';
  const unit = merged.unit || '';
  const unitLabel = merged.unit_label || merged.unitLabel || unit;
  const polarity = merged.polarity || 'HIGHER';

  if (isYesNoKpi(merged)) {
    return {
      entryMode: 'SINGLE',
      inputLabel: '1 = Yes (released on 5th), 0 = No',
      resultUnit: 'yes/no',
      resultLabel: 'Value'
    };
  }

  const [field1Label, field2Label] = resolveFieldLabels(kpiId, name, polarity);
  const scale = resolveRatioScale(unit, unitLabel, name, polarity);

  return {
    entryMode: 'RATIO',
    field1Label,
    field2Label,
    ratioScale: scale,
    resultUnit: scale === 100 ? '%' : unitLabel,
    resultLabel: scale === 100 ? 'Score %' : 'Result',
    polarity
  };
}

function parseStoredNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function computeActualValue(entrySpec, { field1, field2, numerator, denominator, value }) {
  if (!entrySpec) return null;

  if (entrySpec.entryMode === 'RATIO') {
    const num = Number(field2 ?? numerator);
    const den = Number(field1 ?? denominator);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
      const scale = entrySpec.ratioScale || 100;
      return Number(((num / den) * scale).toFixed(4));
    }
    const stored = parseStoredNumber(value);
    return stored;
  }

  const val = Number(value);
  if (!Number.isFinite(val)) return null;
  return val;
}

function extractSavedEntry(kpi, entrySpec) {
  const field1 = parseStoredNumber(kpi.denominator_value);
  const field2 = parseStoredNumber(kpi.numerator_value);
  const score = parseStoredNumber(kpi.actual_value);

  if (entrySpec.entryMode === 'SINGLE') {
    return {
      field1: null,
      field2: null,
      single: score,
      score
    };
  }

  return {
    field1,
    field2,
    single: null,
    score:
      field1 !== null && field2 !== null && field1 > 0
        ? computeActualValue(entrySpec, { field1, field2 })
        : score
  };
}

function resolveSubmissionEntry(kpi, entry) {
  const spec = resolveEntrySpec(kpi);
  const parseNum = (v) =>
    v !== null && v !== undefined && v !== '' ? Number(v) : null;

  const field2 = parseNum(entry.numerator_value);
  const field1 = parseNum(entry.denominator_value);
  const direct = parseNum(entry.actual_value);

  if (
    field2 !== null &&
    field1 !== null &&
    Number.isFinite(field2) &&
    Number.isFinite(field1) &&
    field1 > 0
  ) {
    const computed = computeActualValue(spec, { field1, field2 });
    if (computed !== null && Number.isFinite(computed)) {
      return {
        actual_value: computed,
        numerator_value: field2,
        denominator_value: field1
      };
    }
  }

  if (direct !== null && Number.isFinite(direct)) {
    if (spec.entryMode === 'RATIO') {
      return null;
    }
    return {
      actual_value: direct,
      numerator_value: field2,
      denominator_value: field1
    };
  }

  return null;
}

function formatTarget(kpi) {
  const target = kpi.target_value ?? kpi.target;
  const unit = kpi.unit;
  const unitLabel = kpi.unit_label || kpi.unit;
  const spec = resolveEntrySpec(kpi);

  if (spec.entryMode === 'SINGLE') return target === 1 ? 'Yes' : 'No';
  if (spec.ratioScale === 100 || unit === 'pct') {
    return kpi.polarity === 'LOWER' ? `${target}% (lower is better)` : `${target}%`;
  }
  if (kpi.polarity === 'LOWER') return `≤ ${target}`;
  return String(target);
}

function buildEnterHint(kpi, entrySpec) {
  const target = formatTarget(kpi);

  if (entrySpec.entryMode === 'RATIO') {
    const scale = entrySpec.ratioScale || 100;
    const scaleLabel = scale === 100 ? '100' : String(scale);
    return `Enter ${entrySpec.field1Label} and ${entrySpec.field2Label}. Score = (${entrySpec.field2Label} ÷ ${entrySpec.field1Label}) × ${scaleLabel}. Target: ${target}.`;
  }
  return `${entrySpec.inputLabel}. Target: ${target}.`;
}

function enrichKpiWithEntrySpec(kpi) {
  const catalog = kpi.kpi_id ? getCatalogKpi(kpi.kpi_id) : null;
  const merged = { ...catalog, ...kpi };
  const entrySpec = resolveEntrySpec(merged);
  const actual = computeActualValue(entrySpec, {
    field1: kpi.denominator_value,
    field2: kpi.numerator_value,
    value: kpi.actual_value
  });

  const savedEntry = extractSavedEntry(kpi, entrySpec);

  return {
    ...kpi,
    entry_mode: entrySpec.entryMode,
    field1_label: entrySpec.field1Label || null,
    field2_label: entrySpec.field2Label || null,
    input_label: entrySpec.inputLabel || null,
    ratio_scale: entrySpec.ratioScale || null,
    result_label: entrySpec.resultLabel,
    target_display: formatTarget(merged),
    enter_hint: buildEnterHint(merged, entrySpec),
    computed_value: actual ?? savedEntry.score,
    saved_entry: savedEntry
  };
}

module.exports = {
  FIELD_LABELS,
  resolveEntrySpec,
  parseStoredNumber,
  computeActualValue,
  extractSavedEntry,
  resolveSubmissionEntry,
  formatTarget,
  buildEnterHint,
  enrichKpiWithEntrySpec,
  isYesNoKpi
};
