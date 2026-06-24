/**
 * Non-destructive migration for existing databases:
 * - ActionItems table
 * - hash plain passwords
 */
const { getPool, sql } = require('../db');

(async () => {
  const pool = await getPool();

  await pool.request().query(`
    IF OBJECT_ID('ActionItems', 'U') IS NULL
    BEGIN
      CREATE TABLE ActionItems (
        action_id INT PRIMARY KEY IDENTITY(1,1),
        dept_id VARCHAR(10) NOT NULL,
        kpi_id VARCHAR(400) NOT NULL,
        month_key CHAR(7) NOT NULL,
        indicator_name NVARCHAR(255) NOT NULL,
        indicator_score FLOAT NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'RED',
        action_owner NVARCHAR(150) NULL,
        target_date DATE NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UNIQUE (kpi_id, month_key),
        FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
      );
    END
  `);

  console.log('ActionItems table ready.');
  require('child_process').execSync('node scripts/hash-users.js', {
    cwd: require('path').join(__dirname, '..'),
    stdio: 'inherit'
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
