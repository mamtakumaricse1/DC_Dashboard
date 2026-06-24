/**
 * Quarterly cumulative targets — used when DC sets target_type = QUARTERLY on a RED KPI.
 *
 * Example: DC target = 10 functional toilets in Q1 (Apr–Jun)
 *   Month 1 (Apr): HoD reports actual=2 → cumulative=2 → score = 2/10*100 = 20%
 *   Month 2 (May): actual=3 → cumulative=5 → score = 50%
 *   Month 3 (Jun): actual=4 → cumulative=9 → score = 90%
 *
 * Fiscal quarters default to April start (DistrictConfig.fiscal_year_start_month).
 */

const { calcKpiScore, scoreKpiFromRow } = require('./scoringService');
const { toMonthKey } = require('../utils/reportingMonths');

function getQuarterKey(monthKey, fiscalStartMonth = 4) {
  const [y, m] = monthKey.split('-').map(Number);
  const fiscalYear = m >= fiscalStartMonth ? y : y - 1;
  const monthInFy = m >= fiscalStartMonth ? m - fiscalStartMonth : m + (12 - fiscalStartMonth);
  const q = Math.floor(monthInFy / 3) + 1;
  return `${fiscalYear}-Q${q}`;
}

function getQuarterMonthKeys(quarterKey, fiscalStartMonth = 4) {
  const [fy, qPart] = quarterKey.split('-Q');
  const fiscalYear = Number(fy);
  const q = Number(qPart);
  if (!fiscalYear || !q || q < 1 || q > 4) return [];

  const keys = [];
  for (let i = 0; i < 3; i += 1) {
    const monthNum = fiscalStartMonth + (q - 1) * 3 + i;
    if (monthNum <= 12) {
      keys.push(toMonthKey(fiscalYear, monthNum));
    } else {
      keys.push(toMonthKey(fiscalYear + 1, monthNum - 12));
    }
  }
  return keys;
}

function quarterEntryContribution(row) {
  if (row.numerator_value != null && Number.isFinite(Number(row.numerator_value))) {
    return Number(row.numerator_value);
  }
  const actual = Number(row.actual_value);
  if (!Number.isFinite(actual)) return 0;
  const { isPercentageStoredKpi } = require('./scoringService');
  if (isPercentageStoredKpi(row)) return 0;
  return actual;
}

function sumQuarterActualsToDate(rows, kpiId, quarterKey, throughMonthKey, fiscalStartMonth = 4) {
  const quarterMonths = getQuarterMonthKeys(quarterKey, fiscalStartMonth);
  const eligible = quarterMonths.filter((m) => m <= throughMonthKey);
  let sum = 0;

  for (const row of rows) {
    if (row.kpi_id !== kpiId || row.actual_value == null) continue;
    if (row.entry_year == null || row.entry_month == null) continue;
    const mk = toMonthKey(row.entry_year, row.entry_month);
    if (eligible.includes(mk)) sum += quarterEntryContribution(row);
  }

  return Number(sum.toFixed(2));
}

function calcQuarterlyProgressScore(cumulativeActual, targetActual) {
  if (targetActual == null || targetActual <= 0) return 0;
  const raw = (Number(cumulativeActual) / Number(targetActual)) * 100;
  return Math.max(0, Math.min(100, Number(raw.toFixed(2))));
}

/**
 * Resolve KPI score for a month — quarterly target overrides band scoring when set.
 */
function resolveKpiScoreForMonth({
  row,
  monthKey,
  allRows,
  quarterlyTarget,
  fiscalStartMonth = 4
}) {
  const actual = row.actual_value != null ? Number(row.actual_value) : null;
  if (actual == null) {
    return { actual: null, score: null, cumulativeActual: null, scoringMode: 'NO_DATA' };
  }

  if (
    quarterlyTarget?.target_type === 'QUARTERLY' &&
    quarterlyTarget.target_actual != null &&
    quarterlyTarget.target_quarter
  ) {
    const cumulativeActual = sumQuarterActualsToDate(
      allRows,
      row.kpi_id,
      quarterlyTarget.target_quarter,
      monthKey,
      fiscalStartMonth
    );
    const score = calcQuarterlyProgressScore(cumulativeActual, quarterlyTarget.target_actual);
    return {
      actual,
      score,
      cumulativeActual,
      scoringMode: 'QUARTERLY',
      targetActual: Number(quarterlyTarget.target_actual),
      targetQuarter: quarterlyTarget.target_quarter
    };
  }

  const score = scoreKpiFromRow(row);
  return {
    actual,
    score: Number(score.toFixed(2)),
    cumulativeActual: null,
    scoringMode: 'BAND'
  };
}

module.exports = {
  getQuarterKey,
  getQuarterMonthKeys,
  sumQuarterActualsToDate,
  calcQuarterlyProgressScore,
  resolveKpiScoreForMonth
};
