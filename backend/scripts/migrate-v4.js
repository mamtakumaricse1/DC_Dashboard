/**
 * Migration v4 — DistrictConfig + submission late flag.
 * Run: node scripts/migrate-v4.js
 */
const { getPool } = require('../db');

async function run() {
  const pool = await getPool();

  await pool.request().query(`
    IF OBJECT_ID('DistrictConfig', 'U') IS NULL
    BEGIN
      CREATE TABLE DistrictConfig (
        district_id VARCHAR(30) PRIMARY KEY,
        district_name NVARCHAR(150) NOT NULL,
        state_name NVARCHAR(100) NULL,
        app_title NVARCHAR(200) NOT NULL,
        submission_opens_day TINYINT NOT NULL DEFAULT 1,
        submission_deadline_day TINYINT NOT NULL DEFAULT 1,
        submission_deadline_hour TINYINT NOT NULL DEFAULT 23,
        submission_deadline_minute TINYINT NOT NULL DEFAULT 0,
        target_due_day TINYINT NOT NULL DEFAULT 1,
        target_due_hour TINYINT NOT NULL DEFAULT 12,
        target_due_minute TINYINT NOT NULL DEFAULT 0,
        fiscal_year_start_month TINYINT NOT NULL DEFAULT 4,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
      );
    END
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM DistrictConfig WHERE district_id = 'tirap')
    INSERT INTO DistrictConfig (
      district_id, district_name, state_name, app_title,
      submission_opens_day, submission_deadline_day, submission_deadline_hour, submission_deadline_minute,
      target_due_day, target_due_hour, target_due_minute, fiscal_year_start_month
    ) VALUES (
      'tirap', N'Tirap District', N'Arunachal Pradesh', N'Tirap Performance Index',
      1, 1, 23, 0,
      1, 12, 0, 4
    );
  `);

  await pool.request().query(`
    IF COL_LENGTH('DeptMonthlySubmissions', 'is_late') IS NULL
      ALTER TABLE DeptMonthlySubmissions ADD is_late BIT NOT NULL DEFAULT 0;
  `);

  console.log('migrate-v4 complete: DistrictConfig + DeptMonthlySubmissions.is_late');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
