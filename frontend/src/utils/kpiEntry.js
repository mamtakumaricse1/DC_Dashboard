/**
 * KPI entry UI helpers (frontend).
 *
 * Scoring rules and field labels are defined in backend/utils/kpiEntrySpec.js.
 * GET /api/dept/kpis/:id returns enriched rows — this module only handles:
 *   - form state hydration from saved_entry
 *   - live result preview while typing
 *   - building the POST /submit payload
 */

/** Ratio KPI unless API marks it SINGLE (yes/no). */
export function isRatioKpi(kpi) {
  return kpi?.entry_mode !== "SINGLE";
}

function parseStoredNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

/** Stop mouse-wheel from silently changing focused number inputs (50 → 52, etc.). */
export function preventWheelInputChange(e) {
  e.currentTarget.blur();
}

function formatEntryInput(value) {
  const n = parseStoredNumber(value);
  return n === null ? "" : String(n);
}

/** Read saved counts from API enriched row (saved_entry preferred). */
export function readSavedEntry(kpi) {
  if (kpi?.saved_entry) return kpi.saved_entry;

  const field1 = parseStoredNumber(kpi.denominator_value);
  const field2 = parseStoredNumber(kpi.numerator_value);
  const score = parseStoredNumber(kpi.actual_value ?? kpi.computed_value);

  if (kpi.entry_mode === "SINGLE") {
    return { field1: null, field2: null, single: score, score };
  }

  return { field1, field2, single: null, score };
}

/** Initialise controlled inputs from KPI list returned by the API. */
export function hydrateEntryStateFromKpis(kpis) {
  const field1Values = {};
  const field2Values = {};
  const singleValues = {};

  kpis.forEach((k) => {
    const saved = readSavedEntry(k);
    if (isRatioKpi(k)) {
      field1Values[k.kpi_id] = formatEntryInput(saved.field1);
      field2Values[k.kpi_id] = formatEntryInput(saved.field2);
    } else {
      singleValues[k.kpi_id] = formatEntryInput(saved.single);
    }
  });

  return { field1Values, field2Values, singleValues };
}

/** Live preview: (field2 ÷ field1) × ratio_scale. */
export function computeScore(kpi, field1, field2, singleValue) {
  if (kpi.entry_mode === "SINGLE") {
    const val = Number(singleValue);
    return Number.isFinite(val) ? val : null;
  }
  const den = parseStoredNumber(field1);
  const num = parseStoredNumber(field2);
  if (num === null || den === null || den <= 0) return null;
  const scale = kpi.ratio_scale || 100;
  return Number(((num / den) * scale).toFixed(2));
}

/** Show typed result; only fall back to saved score when both ratio fields are blank. */
export function displayScore(kpi, field1, field2, singleValue) {
  const computed = computeScore(kpi, field1, field2, singleValue);
  if (computed != null) return computed;
  if (kpi.entry_mode !== "SINGLE") {
    const f1Blank = field1 === "" || field1 == null;
    const f2Blank = field2 === "" || field2 == null;
    if (!f1Blank || !f2Blank) return null;
  }
  return readSavedEntry(kpi).score;
}

export function formatScore(kpi, score) {
  if (score == null) return "—";
  if (kpi.entry_mode === "SINGLE") {
    return score === 1 ? "Yes" : score === 0 ? "No" : String(score);
  }
  if (kpi.ratio_scale === 100 || kpi.unit === "pct") return `${score}%`;
  if (kpi.unit_label === "rate" || kpi.ratio_scale === 100000) return `${score} / lakh`;
  return `${score}%`;
}

export function isKpiEntryComplete(kpi, field1Values, field2Values, singleValues) {
  if (isRatioKpi(kpi)) {
    return computeScore(kpi, field1Values[kpi.kpi_id], field2Values[kpi.kpi_id], null) != null;
  }
  const val = singleValues[kpi.kpi_id];
  return val !== "" && val != null && Number.isFinite(Number(val));
}

export function countFilledKpis(kpis, field1Values, field2Values, singleValues) {
  return kpis.filter((k) =>
    isKpiEntryComplete(k, field1Values, field2Values, singleValues)
  ).length;
}

/**
 * Build POST body entries — mirrors backend resolveSubmissionEntry validation.
 * @throws {Error} when a required field is missing
 */
export function buildSubmitEntries(kpis, field1Values, field2Values, singleValues) {
  return kpis.map((k) => {
    if (isRatioKpi(k)) {
      const f1 = field1Values[k.kpi_id];
      const f2 = field2Values[k.kpi_id];
      const score = computeScore(k, f1, f2, null);
      if (score == null) {
        throw new Error(
          `Please fill both "${k.field1_label}" and "${k.field2_label}" for: ${k.name}`
        );
      }
      const den = parseStoredNumber(f1);
      const num = parseStoredNumber(f2);
      return {
        kpi_id: k.kpi_id,
        denominator_value: den,
        numerator_value: num,
        actual_value: score
      };
    }
    const val = singleValues[k.kpi_id];
    if (val === "" || val === null || val === undefined || !Number.isFinite(Number(val))) {
      throw new Error(`Please enter a value for: ${k.name}`);
    }
    return { kpi_id: k.kpi_id, actual_value: Number(val) };
  });
}
