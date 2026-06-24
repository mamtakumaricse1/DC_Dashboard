/**
 * TPI scoring logic — pure functions, no database access.
 *
 * SCORING PIPELINE (see also quarterlyTargetService.js for quarterly targets):
 *   1. HoD enters ACTUAL (raw number — %, count, days, etc.) in PerformanceData
 *   2. calcKpiScore(actual, min, max, polarity) → performance score 0–100
 *   3. getRagStatus(score) → GREEN (≥90) | YELLOW (70–89) | RED (<70)
 *   4. KRA score = weighted average of KPI scores in that department/month
 *   5. District TPI = equal average of all KPI scores (each KPI = 100 ÷ 124 of index)
 *
 * Example (HIGHER is better):
 *   PHC Functionality actual=48, min=0, max=100
 *   score = (48-0)/(100-0)*100 = 48 → RED
 *
 * Example (lower is better — e.g. stock-out days):
 *   polarity !== 'HIGHER' inverts: score = (max-actual)/(max-min)*100
 *
 * Each KPI has weight 1 by default (100 indicators total across district).
 */

const { RAG_THRESHOLDS } = require('../constants/kra');
const { EQUAL_KPI_WEIGHT } = require('../constants/kpiCatalog');

const YES_NO_PATTERN = /yes\/no/i;

function isYesNoKpiRow(row) {
  const unitLabel = row.unit_label || '';
  const name = row.kpi_name || row.name || '';
  return YES_NO_PATTERN.test(unitLabel) || /Dashboard Released On Time/i.test(name);
}

function isPerLakhKpiRow(row) {
  const name = row.kpi_name || row.name || '';
  const unit = row.unit || '';
  const unitLabel = row.unit_label || '';
  return unit === 'rate' || unitLabel === 'rate' || /per lakh/i.test(name);
}

/** Ratio KPIs store a percentage in actual_value unless per-lakh. */
function isPercentageStoredKpi(row) {
  if (isYesNoKpiRow(row)) return true;
  if (isPerLakhKpiRow(row)) return false;
  const unit = row.unit || '';
  const unitLabel = row.unit_label || '';
  if (unit === 'pct' || unitLabel === '%') return true;
  if (row.numerator_value != null && row.denominator_value != null) return true;
  if (!isYesNoKpiRow(row)) return true;
  return false;
}

function normalizeActualForScoring(row) {
  const raw = Number(row.actual_value);
  if (!Number.isFinite(raw)) return null;
  if (isYesNoKpiRow(row)) {
    if (raw === 1) return 100;
    if (raw === 0) return 0;
  }
  return raw;
}

function resolveScoringBand(row) {
  if (isYesNoKpiRow(row) || isPercentageStoredKpi(row)) {
    return { min: 0, max: 100 };
  }
  return {
    min: row.min_value ?? 0,
    max: row.max_value ?? 100
  };
}

/**
 * Score a KPI row using normalized actual + effective min/max band.
 * Handles yes/no (1→100), ratio %-stored values, and per-lakh rates.
 */
function scoreKpiFromRow(row) {
  if (row.actual_value == null || row.actual_value === undefined) return 0;
  const actual = normalizeActualForScoring(row);
  if (actual == null) return 0;
  const { min, max } = resolveScoringBand(row);
  return calcKpiScore(actual, min, max, row.polarity || 'HIGHER');
}

/**
 * Convert raw actual value to a 0–100 performance score using min/max band.
 * @param {number|null} actual - Department-entered value (not the score)
 * @param {number} min - Band minimum from KPIs table
 * @param {number} max - Band maximum from KPIs table
 * @param {string} polarity - 'HIGHER' (more is better) or any other value (lower is better)
 * @returns {number} Clamped 0–100 score
 */
function calcKpiScore(actual, min, max, polarity) {
  if (actual === null || actual === undefined) return 0;
  if (max === min) return 0;

  const raw =
    polarity === 'HIGHER'
      ? ((actual - min) / (max - min)) * 100
      : ((max - actual) / (max - min)) * 100;

  return Math.max(0, Math.min(100, raw));
}

/** GREEN / YELLOW / RED status for a single score. */
function getRagStatus(score) {
  if (score >= RAG_THRESHOLDS.GREEN) return 'GREEN';
  if (score >= RAG_THRESHOLDS.YELLOW) return 'YELLOW';
  return 'RED';
}

/** KPI weight — equal contribution for every indicator. */
function kpiWeightOf(row) {
  return EQUAL_KPI_WEIGHT;
}

/**
 * Month-over-month direction with ±1 point deadband (reduces noisy flips).
 * Used in history charts and drill-down.
 */
function scoreTrend(current, previous) {
  if (previous === null || previous === undefined) return 'FLAT';
  if (current > previous + 1) return 'UP';
  if (current < previous - 1) return 'DOWN';
  return 'FLAT';
}

/**
 * 3-month trend arrow on main dashboard:
 * compares latest month vs average of previous 2–3 months.
 */
function getKraTrend(monthlyScores) {
  const months = Object.keys(monthlyScores).sort().reverse();
  if (months.length < 3) return 'FLAT';

  const current = Number(monthlyScores[months[0]] || 0);
  const prevWindow = months.length >= 4 ? months.slice(1, 4) : months.slice(1, 3);
  const avgPrevious =
    prevWindow.reduce((sum, m) => sum + Number(monthlyScores[m] || 0), 0) / prevWindow.length;

  if (current > avgPrevious + 1) return 'UP';
  if (current < avgPrevious - 1) return 'DOWN';
  return 'FLAT';
}

module.exports = {
  calcKpiScore,
  scoreKpiFromRow,
  normalizeActualForScoring,
  resolveScoringBand,
  isYesNoKpiRow,
  isPercentageStoredKpi,
  getRagStatus,
  kpiWeightOf,
  scoreTrend,
  getKraTrend
};
