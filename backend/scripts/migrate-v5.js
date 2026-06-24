/**
 * Migration v5 — KPI units/scoring_mode, quarterly targets, reminder log.
 * Run: node scripts/migrate-v5.js
 */
const { getPool, sql } = require('../db');
const { resolveKpiMeta } = require('../constants/kpiMeta');

async function run() {
  const pool = await getPool();

  await pool.request().query(`
    IF COL_LENGTH('KPIs', 'scoring_mode') IS NULL
      ALTER TABLE KPIs ADD scoring_mode VARCHAR(30) NOT NULL DEFAULT 'BAND';

    IF COL_LENGTH('ActionItems', 'target_type') IS NULL
      ALTER TABLE ActionItems ADD target_type VARCHAR(20) NOT NULL DEFAULT 'SCORE';

    IF COL_LENGTH('ActionItems', 'target_actual') IS NULL
      ALTER TABLE ActionItems ADD target_actual FLOAT NULL;

    IF COL_LENGTH('ActionItems', 'target_quarter') IS NULL
      ALTER TABLE ActionItems ADD target_quarter CHAR(7) NULL;

    IF OBJECT_ID('ReminderLog', 'U') IS NULL
    BEGIN
      CREATE TABLE ReminderLog (
        reminder_id INT IDENTITY(1,1) PRIMARY KEY,
        action_id INT NULL,
        dept_id VARCHAR(10) NOT NULL,
        kpi_id VARCHAR(400) NULL,
        owner_name NVARCHAR(150) NULL,
        owner_phone VARCHAR(30) NULL,
        channel VARCHAR(20) NOT NULL,
        message NVARCHAR(500) NULL,
        reminded_by INT NULL,
        reminded_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
      );
    END
  `);

  const kpis = await pool.request().query('SELECT kpi_id, name FROM KPIs');
  for (const kpi of kpis.recordset) {
    const meta = resolveKpiMeta(kpi.name);
    const req = pool.request();
    req.timeout = 120000;
    await req
      .input('id', sql.VarChar(400), kpi.kpi_id)
      .input('unit', sql.NVarChar(50), meta.unit)
      .input('mode', sql.VarChar(30), meta.scoringMode)
      .input('min', sql.Float, meta.minValue)
      .input('max', sql.Float, meta.maxValue)
      .input('pol', sql.VarChar(10), meta.polarity)
      .query(`
        UPDATE KPIs
        SET unit = @unit, scoring_mode = @mode,
            min_value = @min, max_value = @max, polarity = @pol
        WHERE kpi_id = @id
      `);
  }

  console.log(`migrate-v5: updated ${kpis.recordset.length} KPIs with unit/scoring_mode`);
  console.log('migrate-v5: quarterly target + ReminderLog columns ready');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
