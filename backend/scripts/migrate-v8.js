/**
 * Migration v8 — numerator/denominator raw entry columns on PerformanceData.
 */
const { getPool } = require('../db');

async function run() {
  const pool = await getPool();
  await pool.request().query(`
    IF COL_LENGTH('PerformanceData', 'numerator_value') IS NULL
      ALTER TABLE PerformanceData ADD numerator_value FLOAT NULL;
    IF COL_LENGTH('PerformanceData', 'denominator_value') IS NULL
      ALTER TABLE PerformanceData ADD denominator_value FLOAT NULL;
  `);
  console.log('migrate-v8 complete: PerformanceData numerator/denominator columns');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
