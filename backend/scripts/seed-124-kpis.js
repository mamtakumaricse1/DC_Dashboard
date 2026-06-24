/**
 * Seeds 124 KPIs from kpiCatalog.json (official Tirap workbook).
 * Run: node scripts/seed-124-kpis.js
 */
const { getPool, sql } = require('../db');
const { buildKpiRows, catalog, TOTAL_DEPT_WEIGHT, getDeptWeight } = require('../constants/kpiCatalog');

const TIERS = ['G', 'G', 'Y', 'Y', 'R'];

function tierActual(tier, kpiId, monthKey, sortOrder, maxSort) {
  const h = (s) => {
    let n = 0;
    for (let i = 0; i < s.length; i += 1) n = (n * 31 + s.charCodeAt(i)) >>> 0;
    return n;
  };
  const drift = sortOrder < maxSort ? h(`${monthKey}:${kpiId}`) % 4 : 0;
  if (tier === 'G') return 92 + (h(`${kpiId}:${monthKey}`) % 7) - drift;
  if (tier === 'Y') return 72 + (h(`${kpiId}:${monthKey}:y`) % 13) - (drift > 0 ? drift - 1 : 0);
  return 42 + (h(`${kpiId}:${monthKey}:r`) % 18) + (drift > 0 ? drift : 0);
}

(async () => {
  const kpis = buildKpiRows();
  if (kpis.length !== 124) {
    throw new Error(`Expected 124 KPIs, got ${kpis.length}`);
  }

  const pool = await getPool();
  pool.request().timeout = 180000;

  await pool.request().query(`
    DELETE FROM PerformanceData;
    DELETE FROM ActionItems;
    DELETE FROM KPIs;
  `);

  const kpiTable = new sql.Table('KPIs');
  kpiTable.create = false;
  kpiTable.columns.add('kpi_id', sql.VarChar(400), { nullable: false });
  kpiTable.columns.add('dept_id', sql.VarChar(10), { nullable: false });
  kpiTable.columns.add('name', sql.NVarChar(255), { nullable: false });
  kpiTable.columns.add('unit', sql.NVarChar(50), { nullable: false });
  kpiTable.columns.add('min_value', sql.Float, { nullable: false });
  kpiTable.columns.add('max_value', sql.Float, { nullable: false });
  kpiTable.columns.add('weight', sql.Float, { nullable: false });
  kpiTable.columns.add('polarity', sql.VarChar(10), { nullable: false });

  kpis.forEach((k, idx) => {
    kpiTable.rows.add(
      k.kpi_id,
      k.deptId,
      k.name,
      k.unit,
      k.minValue,
      k.maxValue,
      k.weight,
      k.polarity
    );
  });

  const bulkReq = pool.request();
  bulkReq.timeout = 180000;
  await bulkReq.bulk(kpiTable);

  // Extended columns (migrate-v7) — batch update
  for (const k of kpis) {
    const req = pool.request();
    req.timeout = 60000;
    await req
      .input('id', sql.VarChar(400), k.kpi_id)
      .input('num', sql.Int, k.num)
      .input('ul', sql.NVarChar(50), k.unitLabel)
      .input('tv', sql.Float, k.target)
      .input('fr', sql.Char(1), k.freq)
      .input('sm', sql.VarChar(30), k.scoring_mode)
      .query(`
        UPDATE KPIs SET kpi_num = @num, unit_label = @ul, target_value = @tv,
          freq = @fr, scoring_mode = @sm
        WHERE kpi_id = @id;
      `);
  }

  const months = (
    await pool.request().query(
      'SELECT month_key, month_num, year_num, sort_order FROM ReportingMonths ORDER BY sort_order'
    )
  ).recordset;

  const maxSort = Math.max(...months.map((m) => m.sort_order));
  const perfTable = new sql.Table('PerformanceData');
  perfTable.create = false;
  perfTable.columns.add('kpi_id', sql.VarChar(400), { nullable: false });
  perfTable.columns.add('actual_value', sql.Float, { nullable: false });
  perfTable.columns.add('entry_month', sql.Int, { nullable: false });
  perfTable.columns.add('entry_year', sql.Int, { nullable: false });

  kpis.forEach((k, i) => {
    const tier = TIERS[i % TIERS.length];
    months.forEach((m) => {
      perfTable.rows.add(
        k.kpi_id,
        tierActual(tier, k.kpi_id, m.month_key, m.sort_order, maxSort),
        m.month_num,
        m.year_num
      );
    });
  });

  const perfReq = pool.request();
  perfReq.timeout = 180000;
  await perfReq.bulk(perfTable);

  for (const deptId of Object.keys(catalog.departments)) {
    await pool.request()
      .input('deptId', sql.VarChar(10), deptId)
      .input('w', sql.Decimal(5, 2), getDeptWeight(deptId))
      .query('UPDATE Departments SET weight = @w WHERE dept_id = @deptId');
  }

  const kpiCnt = (await pool.request().query('SELECT COUNT(*) AS n FROM KPIs')).recordset[0].n;
  const perfCnt = (await pool.request().query('SELECT COUNT(*) AS n FROM PerformanceData')).recordset[0].n;

  console.log(`Seeded ${kpiCnt} KPIs. Total KRA weight = ${TOTAL_DEPT_WEIGHT}.`);
  console.log(`Seeded ${perfCnt} PerformanceData rows (${months.length} months).`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
