/**
 * Sync KPI rows in the database from kpiCatalog.json (by dept_id + kpi_num).
 * Handles kpi_id renames by repointing child tables before delete.
 */
const { sql } = require('../db');
const { buildKpiRows } = require('../constants/kpiCatalog');
const {
  KPI_EXISTS,
  INSERT_KPI_COPY,
  REPOINT_KPI_CHILD_ROWS,
  DELETE_KPI,
  UPDATE_KPI_DEFINITION,
  bindDeptIdList,
  selectKpisByDeptsSql
} = require('../constants/sql');

function selectKpisByDepts(pool, deptIds) {
  const req = pool.request();
  const placeholders = bindDeptIdList(req, sql, deptIds);
  return req.query(selectKpisByDeptsSql(placeholders.join(', ')));
}

function bindKpiDefinition(request, kpi) {
  return request
    .input('id', sql.VarChar(400), kpi.kpi_id)
    .input('name', sql.NVarChar(255), kpi.name)
    .input('unit', sql.NVarChar(50), kpi.unit)
    .input('ul', sql.NVarChar(50), kpi.unitLabel)
    .input('tv', sql.Float, kpi.target)
    .input('fr', sql.Char(1), kpi.freq)
    .input('sm', sql.VarChar(30), kpi.scoring_mode)
    .input('min', sql.Float, kpi.minValue)
    .input('max', sql.Float, kpi.maxValue)
    .input('pol', sql.VarChar(10), kpi.polarity);
}

async function updateKpiDefinition(pool, kpi) {
  await bindKpiDefinition(pool.request(), kpi).query(UPDATE_KPI_DEFINITION);
}

async function migrateKpiId(pool, oldId, newId, catalogKpi) {
  if (oldId === newId) {
    await updateKpiDefinition(pool, catalogKpi);
    return false;
  }

  const exists = await pool.request()
    .input('id', sql.VarChar(400), newId)
    .query(KPI_EXISTS);

  if (!exists.recordset.length) {
    await pool.request()
      .input('newId', sql.VarChar(400), newId)
      .input('oldId', sql.VarChar(400), oldId)
      .query(INSERT_KPI_COPY);
  }

  await pool.request()
    .input('oldId', sql.VarChar(400), oldId)
    .input('newId', sql.VarChar(400), newId)
    .query(REPOINT_KPI_CHILD_ROWS);

  await pool.request()
    .input('id', sql.VarChar(400), oldId)
    .query(DELETE_KPI);

  await updateKpiDefinition(pool, { ...catalogKpi, kpi_id: newId });
  return true;
}

/**
 * @param {import('mssql').ConnectionPool} pool
 * @param {string[]} deptIds e.g. ['D02', 'D03'] or all 14 depts
 * @returns {Promise<{ updated: number, renamed: number, missing: string[] }>}
 */
async function syncDeptKpisFromCatalog(pool, deptIds) {
  const catalogRows = buildKpiRows().filter((k) => deptIds.includes(k.deptId));
  const existing = await selectKpisByDepts(pool, deptIds);
  const byDeptNum = new Map(
    existing.recordset.map((r) => [`${r.dept_id}:${r.kpi_num}`, r])
  );

  let updated = 0;
  let renamed = 0;
  const missing = [];

  for (const kpi of catalogRows) {
    const key = `${kpi.deptId}:${kpi.num}`;
    const row = byDeptNum.get(key);
    if (!row) {
      missing.push(key);
      continue;
    }

    const didRename = await migrateKpiId(pool, row.kpi_id, kpi.kpi_id, kpi);
    if (didRename) renamed += 1;
    updated += 1;
  }

  return { updated, renamed, missing };
}

module.exports = {
  selectKpisByDepts,
  updateKpiDefinition,
  migrateKpiId,
  syncDeptKpisFromCatalog
};
