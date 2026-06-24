/**
 * Migration v7 — KPI catalog columns (124 KPI workbook alignment).
 */
const { getPool } = require('../db');

async function run() {
  const pool = await getPool();
  await pool.request().query(`
    IF COL_LENGTH('KPIs', 'kpi_num') IS NULL
      ALTER TABLE KPIs ADD kpi_num INT NULL;
    IF COL_LENGTH('KPIs', 'unit_label') IS NULL
      ALTER TABLE KPIs ADD unit_label NVARCHAR(50) NULL;
    IF COL_LENGTH('KPIs', 'target_value') IS NULL
      ALTER TABLE KPIs ADD target_value FLOAT NULL;
    IF COL_LENGTH('KPIs', 'freq') IS NULL
      ALTER TABLE KPIs ADD freq CHAR(1) NULL;
  `);
  console.log('migrate-v7 complete: KPI catalog columns');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
