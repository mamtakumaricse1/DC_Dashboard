/**
 * KPI unit + scoring metadata inferred from indicator name.
 * scoring_mode:
 *   BAND — normalize actual between min/max to 0–100 score
 *   QUARTERLY_CUMULATIVE — monthly actuals sum toward DC quarterly count target
 */

const QUARTERLY_CUMULATIVE_PATTERNS = [
  /Functional Toilets/i,
  /Drinking Water/i,
  /Tap Connections/i,
  /cumulative count/i,
  /ODF-Plus Villages/i,
  /Saksham AWC Upgrade/i,
  /New Service Connection/i,
  /Villages with 24x7 Power/i,
  /JJM Tap Connections/i
];

const LOWER_IS_BETTER_PATTERNS = [
  /Deaths/i,
  /stock-out/i,
  /Stock-out/i,
  /Outage Hours/i,
  /Failure Rate/i,
  /Underweight/i,
  /Stunting Rate/i,
  /Damaged/i,
  /Mean Days/i
];

const PCT_PATTERNS = [
  /%/,
  /\bRate\b/i,
  /\bCoverage\b/i,
  /\bScore\b/i,
  /\bProficiency\b/i,
  /\bEfficiency\b/i,
  /\bOccupancy\b/i,
  /Pass Rate/i,
  /On-Schedule/i,
  /Functional \(%/i,
  /% of/i,
  /per active/i,
  /per lakh/i,
  /per AWC/i
];

const HOURS_PATTERNS = [/Hours/i, /Supply Hours/i];
const DAYS_PATTERNS = [/Days/i, /Working Days/i];

function resolveKpiMeta(name) {
  const label = String(name || '');

  if (QUARTERLY_CUMULATIVE_PATTERNS.some((p) => p.test(label))) {
    return {
      unit: 'count',
      unitLabel: inferCountLabel(label),
      scoringMode: 'QUARTERLY_CUMULATIVE',
      polarity: 'HIGHER',
      minValue: 0,
      maxValue: 100
    };
  }

  if (PCT_PATTERNS.some((p) => p.test(label))) {
    return {
      unit: 'pct',
      unitLabel: '%',
      scoringMode: 'BAND',
      polarity: 'HIGHER',
      minValue: 0,
      maxValue: 100
    };
  }

  if (HOURS_PATTERNS.some((p) => p.test(label))) {
    return {
      unit: 'hours',
      unitLabel: 'hours',
      scoringMode: 'BAND',
      polarity: LOWER_IS_BETTER_PATTERNS.some((p) => p.test(label)) ? 'LOWER' : 'HIGHER',
      minValue: 0,
      maxValue: 100
    };
  }

  if (DAYS_PATTERNS.some((p) => p.test(label))) {
    return {
      unit: 'days',
      unitLabel: 'days',
      scoringMode: 'BAND',
      polarity: LOWER_IS_BETTER_PATTERNS.some((p) => p.test(label)) ? 'LOWER' : 'HIGHER',
      minValue: 0,
      maxValue: 100
    };
  }

  if (LOWER_IS_BETTER_PATTERNS.some((p) => p.test(label))) {
    return {
      unit: 'count',
      unitLabel: inferCountLabel(label),
      scoringMode: 'BAND',
      polarity: 'LOWER',
      minValue: 0,
      maxValue: 100
    };
  }

  return {
    unit: 'count',
    unitLabel: inferCountLabel(label),
    scoringMode: 'BAND',
    polarity: 'HIGHER',
    minValue: 0,
    maxValue: 100
  };
}

function inferCountLabel(name) {
  if (/Schools/i.test(name)) return 'schools';
  if (/Villages/i.test(name)) return 'villages';
  if (/AWC/i.test(name)) return 'AWCs';
  if (/Cases|Deaths|Patients/i.test(name)) return 'cases';
  if (/Sessions|Tournaments|Teams/i.test(name)) return 'events';
  if (/Connections|Households/i.test(name)) return 'units';
  if (/Enrolments|Children/i.test(name)) return 'persons';
  return 'count';
}

module.exports = { resolveKpiMeta, QUARTERLY_CUMULATIVE_PATTERNS };
