const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node scripts/run-sql-file.js <path-to.sql>');
  process.exit(1);
}

const fullPath = path.resolve(sqlFile);
const raw = fs.readFileSync(fullPath, 'utf8');

const batches = raw
  .split(/^\s*GO\s*$/gim)
  .map((b) => b.trim())
  .filter(Boolean);

(async () => {
  const pool = await getPool();
  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    if (!batch) continue;
    console.log(`Running batch ${i + 1}/${batches.length}...`);
    await pool.request().batch(batch);
  }
  console.log('Done. Seeding 100 KPIs...');
  require('child_process').execSync('node scripts/seed-100-kpis.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
