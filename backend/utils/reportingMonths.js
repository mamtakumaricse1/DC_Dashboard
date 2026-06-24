/**
 * Reporting month list for dropdowns and history charts.
 *
 * Sources merged (in order):
 *   1. ReportingMonths table  — seeded months from SQL
 *   2. PerformanceData        — months where HoDs submitted data
 *   3. Fiscal year fallback   — if DB is empty
 *
 * Months appear only when seeded or when departments submit data
 * (ensureReportingMonth). The current calendar month is not auto-added.
 */

const { sql } = require('../db');
const {
  SELECT_REPORTING_MONTH_KEYS,
  SELECT_PERFORMANCE_MONTH_KEYS,
  ENSURE_REPORTING_MONTH
} = require('../constants/sql');

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const toMonthKey = (year, month) =>
  `${year}-${String(month).padStart(2, '0')}`;

const getFiscalMonthKeys = () => {
  const now = new Date();
  const startYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return [
    `${startYear}-04`, `${startYear}-05`, `${startYear}-06`, `${startYear}-07`,
    `${startYear}-08`, `${startYear}-09`, `${startYear}-10`, `${startYear}-11`,
    `${startYear}-12`, `${startYear + 1}-01`, `${startYear + 1}-02`, `${startYear + 1}-03`
  ];
};

async function loadMonthsAvailable(db) {
  const keys = new Set();

  try {
    const master = await db.request().query(SELECT_REPORTING_MONTH_KEYS);
    master.recordset.forEach((r) => {
      if (r.month_key) keys.add(String(r.month_key).trim());
    });
  } catch { /* table may not exist during first setup */ }

  try {
    const perf = await db.request().query(SELECT_PERFORMANCE_MONTH_KEYS);
    perf.recordset.forEach((r) => {
      if (r.month_key) keys.add(String(r.month_key).trim());
    });
  } catch { /* PerformanceData may be empty */ }

  if (keys.size === 0) return getFiscalMonthKeys();
  return Array.from(keys).sort();
}

/** Called after dept submit — ensures new month appears in all dropdowns. */
async function ensureReportingMonth(db, year, month) {
  const monthKey = toMonthKey(year, month);
  const monthName = MONTH_LABELS[month - 1] || 'Mon';

  await db.request()
    .input('key', sql.Char(7), monthKey)
    .input('m', sql.TinyInt, month)
    .input('y', sql.Int, year)
    .input('label', sql.VarChar(10), monthName)
    .query(ENSURE_REPORTING_MONTH);

  return monthKey;
}

module.exports = {
  MONTH_LABELS,
  toMonthKey,
  getFiscalMonthKeys,
  loadMonthsAvailable,
  ensureReportingMonth
};
