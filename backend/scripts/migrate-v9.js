/**
 * Migration v9 — RefreshTokens table for JWT refresh flow.
 */
const { getPool } = require('../db');

async function run() {
  const pool = await getPool();
  await pool.request().query(`
    IF OBJECT_ID('RefreshTokens', 'U') IS NULL
    BEGIN
      CREATE TABLE RefreshTokens (
        token_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        revoked_at DATETIME2 NULL,
        CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (user_id) REFERENCES Users(user_id)
      );
      CREATE UNIQUE INDEX UX_RefreshTokens_Hash ON RefreshTokens(token_hash);
      CREATE INDEX IX_RefreshTokens_User ON RefreshTokens(user_id);
    END
  `);
  console.log('migrate-v9 complete: RefreshTokens table');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
