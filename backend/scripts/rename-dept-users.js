/**
 * Rename legacy HoD usernames (health_user, police_user, …) to d##_dept format.
 * Safe to run multiple times — skips rows already renamed.
 *
 *   npm run rename:users
 */
const { getPool, sql } = require('../db');
const { LEGACY_USERNAME_RENAMES } = require('../constants/deptUsers');

(async () => {
  const pool = await getPool();
  let updated = 0;

  for (const [oldName, newName] of LEGACY_USERNAME_RENAMES) {
    const result = await pool.request()
      .input('old', sql.VarChar(80), oldName)
      .input('new', sql.VarChar(80), newName)
      .query(`
        UPDATE Users SET username = @new WHERE username = @old;
        SELECT @@ROWCOUNT AS n;
      `);
    const n = result.recordset[0]?.n ?? 0;
    if (n > 0) {
      console.log(`  ${oldName} → ${newName}`);
      updated += n;
    }
  }

  const list = await pool.request().query(`
    SELECT username, role, dept_id FROM Users ORDER BY role DESC, dept_id
  `);
  console.log(updated ? `\nRenamed ${updated} user(s).` : '\nNo legacy usernames found (already renamed).');
  console.log('\nCurrent users:');
  list.recordset.forEach((u) => {
    console.log(`  ${u.username.padEnd(22)} ${u.role.padEnd(6)} ${u.dept_id || '—'}`);
  });
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
