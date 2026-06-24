/**
 * Migration v3: DeptMonthlySubmissions + ActionItems DC target fields.
 */
const { getPool } = require('../db');

const ALTERS = [
  `IF OBJECT_ID('DeptMonthlySubmissions', 'U') IS NULL
   CREATE TABLE DeptMonthlySubmissions (
     dept_id VARCHAR(10) NOT NULL,
     month_key CHAR(7) NOT NULL,
     submitted_by INT NULL,
     submitted_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
     updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
     PRIMARY KEY (dept_id, month_key),
     FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
   );`,
  `IF COL_LENGTH('ActionItems', 'action_plan') IS NULL
     ALTER TABLE ActionItems ADD action_plan NVARCHAR(500) NULL;`,
  `IF COL_LENGTH('ActionItems', 'target_score') IS NULL
     ALTER TABLE ActionItems ADD target_score FLOAT NULL;`,
  `IF COL_LENGTH('ActionItems', 'completion_status') IS NULL
     ALTER TABLE ActionItems ADD completion_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';`,
  `IF COL_LENGTH('ActionItems', 'actual_score') IS NULL
     ALTER TABLE ActionItems ADD actual_score FLOAT NULL;`,
  `IF COL_LENGTH('ActionItems', 'deviation') IS NULL
     ALTER TABLE ActionItems ADD deviation FLOAT NULL;`,
  `IF COL_LENGTH('ActionItems', 'review_month') IS NULL
     ALTER TABLE ActionItems ADD review_month CHAR(7) NULL;`,
  `IF COL_LENGTH('ActionItems', 'dc_remarks') IS NULL
     ALTER TABLE ActionItems ADD dc_remarks NVARCHAR(500) NULL;`,
  `IF EXISTS (
       SELECT 1 FROM sys.columns
       WHERE object_id = OBJECT_ID('ActionItems')
         AND name = 'target_date' AND is_nullable = 0
     )
     ALTER TABLE ActionItems ALTER COLUMN target_date DATE NULL;`
];

(async () => {
  const pool = await getPool();
  for (const sql of ALTERS) {
    await pool.request().query(sql);
  }
  await pool.request().query(`
    IF OBJECT_ID('DeptMonthlySubmissions', 'U') IS NOT NULL
      INSERT INTO DeptMonthlySubmissions (dept_id, month_key, submitted_at, updated_at)
      SELECT DISTINCT
        k.dept_id,
        CONCAT(pd.entry_year, '-', RIGHT('0' + CAST(pd.entry_month AS VARCHAR(2)), 2)),
        SYSDATETIME(),
        SYSDATETIME()
      FROM PerformanceData pd
      INNER JOIN KPIs k ON k.kpi_id = pd.kpi_id
      WHERE NOT EXISTS (
        SELECT 1 FROM DeptMonthlySubmissions s
        WHERE s.dept_id = k.dept_id
          AND s.month_key = CONCAT(pd.entry_year, '-', RIGHT('0' + CAST(pd.entry_month AS VARCHAR(2)), 2))
      );
  `);

  console.log('Migration v3 complete (submissions + action tracker targets).');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
