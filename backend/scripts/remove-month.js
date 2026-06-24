/**
 * Remove all dashboard data for a reporting month (default: current calendar month).
 *
 * Usage:
 *   node scripts/remove-month.js              # removes current calendar month
 *   node scripts/remove-month.js 2026-06      # removes specific YYYY-MM
 */
const { getPool, sql } = require('../db');

const monthKey = process.argv[2] || (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
})();

const [year, month] = monthKey.split('-').map(Number);
if (!year || !month || month < 1 || month > 12) {
  console.error('Invalid month key. Use YYYY-MM, e.g. 2026-06');
  process.exit(1);
}

(async () => {
  const pool = await getPool();
  console.log(`Removing data for ${monthKey}…`);

  const perf = await pool.request()
    .input('y', sql.Int, year)
    .input('m', sql.Int, month)
    .query(`
      DELETE FROM PerformanceData
      WHERE entry_year = @y AND entry_month = @m;
      SELECT @@ROWCOUNT AS n;
    `);
  console.log(`  PerformanceData: ${perf.recordset[0]?.n ?? 0} rows`);

  const reporting = await pool.request()
    .input('mk', sql.Char(7), monthKey)
    .query(`
      IF OBJECT_ID('ReportingMonths', 'U') IS NOT NULL
        DELETE FROM ReportingMonths WHERE month_key = @mk;
      SELECT @@ROWCOUNT AS n;
    `);
  console.log(`  ReportingMonths: ${reporting.recordset[0]?.n ?? 0} rows`);

  const subs = await pool.request()
    .input('mk', sql.Char(7), monthKey)
    .query(`
      IF OBJECT_ID('DeptMonthlySubmissions', 'U') IS NOT NULL
        DELETE FROM DeptMonthlySubmissions WHERE month_key = @mk;
      SELECT @@ROWCOUNT AS n;
    `);
  console.log(`  DeptMonthlySubmissions: ${subs.recordset[0]?.n ?? 0} rows`);

  const actions = await pool.request()
    .input('mk', sql.Char(7), monthKey)
    .query(`
      IF OBJECT_ID('ActionItems', 'U') IS NOT NULL
        DELETE FROM ActionItems
        WHERE month_key = @mk OR review_month = @mk;
      SELECT @@ROWCOUNT AS n;
    `);
  console.log(`  ActionItems: ${actions.recordset[0]?.n ?? 0} rows`);

  const remaining = await pool.request().query(`
    SELECT DISTINCT CONCAT(entry_year, '-', RIGHT('0' + CAST(entry_month AS VARCHAR(2)), 2)) AS mk
    FROM PerformanceData
    ORDER BY mk
  `);
  console.log('Remaining performance months:', remaining.recordset.map((r) => r.mk).join(', ') || '(none)');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
