/**
 * Sync all KPI definitions from kpiCatalog.json into the database.
 * Run: node scripts/sync-kpi-catalog.js
 *      node scripts/sync-kpi-catalog.js D02 D03
 */
const { getPool } = require('../db');
const { syncDeptKpisFromCatalog } = require('../services/kpiCatalogSyncService');

const ALL_DEPTS = Array.from({ length: 14 }, (_, i) =>
  `D${String(i + 1).padStart(2, '0')}`
);

async function run() {
  const deptIds = process.argv.slice(2).length ? process.argv.slice(2) : ALL_DEPTS;
  const pool = await getPool();
  const { updated, renamed, missing } = await syncDeptKpisFromCatalog(pool, deptIds);

  if (missing.length) {
    console.warn('Missing rows:', missing.join(', '));
  }

  console.log(`Synced ${updated} KPIs (${renamed} renamed) for: ${deptIds.join(', ')}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
