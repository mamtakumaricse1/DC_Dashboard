/**
 * Migration v6 — submission deadline 11:00 PM + recalculate is_late flags.
 * Run: node scripts/migrate-v6.js
 */
const { getPool, sql } = require('../db');
const { loadDistrictConfig, clearDistrictConfigCache } = require('../utils/districtConfig');
const { isSubmissionLate, mergeCycleConfig } = require('../utils/reportingCycle');

async function run() {
  const pool = await getPool();

  await pool.request().query(`
    IF OBJECT_ID('DistrictConfig', 'U') IS NOT NULL
      UPDATE DistrictConfig
      SET submission_deadline_hour = 23,
          submission_deadline_minute = 0,
          updated_at = SYSDATETIME()
      WHERE submission_deadline_hour = 12
        AND submission_deadline_minute = 0;
  `);

  clearDistrictConfigCache();
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
    }
  }

  console.log(`migrate-v6 complete: deadline 11:00 PM, ${updated} is_late row(s) recalculated`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
