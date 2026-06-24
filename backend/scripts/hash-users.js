/**
 * Hash plain-text user passwords with bcrypt (run after SQL seed / on migrate).
 */
const { getPool } = require('../db');
const { hashPassword, isHashed } = require('../utils/password');

(async () => {
  const pool = await getPool();
  const users = await pool.request().query('SELECT user_id, username, password FROM Users');

  let updated = 0;
  for (const user of users.recordset) {
    if (isHashed(user.password)) continue;

    const hashed = await hashPassword(user.password);
    const { sql } = require('../db');
    await pool.request()
      .input('id', sql.Int, user.user_id)
      .input('hash', sql.VarChar(255), hashed)
      .query('UPDATE Users SET password = @hash WHERE user_id = @id');

    updated += 1;
    console.log(`Hashed password for ${user.username}`);
  }

  console.log(updated ? `Done. ${updated} password(s) hashed.` : 'All passwords already hashed.');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
