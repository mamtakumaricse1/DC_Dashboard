/**
 * Migration v10 — sync Education (D02) and WCD (D03) KPI catalog from JSON.
 * Run: node scripts/migrate-v10.js
 */
const { getPool } = require('../db');
const { syncDeptKpisFromCatalog } = require('../services/kpiCatalogSyncService');

const DEPT_IDS = ['D02', 'D03'];

async function run() {
  const pool = await getPool();
  const { updated, renamed, missing } = await syncDeptKpisFromCatalog(pool, DEPT_IDS);

  if (missing.length) {
    console.warn('Missing KPI rows (run seed-124-kpis.js):', missing.join(', '));
  }

  console.log(`migrate-v10 complete: ${updated} KPIs synced, ${renamed} renamed`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
