/**
 * Recalculate is_late from submitted_at vs district deadline (fixes stale flags).
 * Run: node scripts/fix-submission-late.js
 */
const { getPool, sql } = require('../db');
const { loadDistrictConfig } = require('../utils/districtConfig');
const { isSubmissionLate, mergeCycleConfig } = require('../utils/reportingCycle');

(async () => {
  const pool = await getPool();
  const districtRow = await loadDistrictConfig(pool);
  const cycle = mergeCycleConfig(districtRow);

  const rows = await pool.request().query(`
    SELECT dept_id, month_key, submitted_at, is_late
    FROM DeptMonthlySubmissions
    WHERE submitted_at IS NOT NULL
  `);

  let updated = 0;
  for (const row of rows.recordset) {
    const late = isSubmissionLate(row.month_key, row.submitted_at, cycle);
    const flag = late ? 1 : 0;
    if (Boolean(row.is_late) !== late) {
      await pool.request()
        .input('dept', sql.VarChar(10), row.dept_id)
        .input('mk', sql.Char(7), row.month_key)
        .input('late', sql.Bit, flag)
        .query(`
          UPDATE DeptMonthlySubmissions SET is_late = @late
          WHERE dept_id = @dept AND month_key = @mk
        `);
      updated += 1;
      console.log(`  ${row.dept_id} ${row.month_key}: is_late ${row.is_late} → ${flag}`);
    }
  }

  console.log(`Done. ${updated} row(s) corrected.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
