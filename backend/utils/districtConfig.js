/**
 * District configuration — one row per district for multi-tenant reuse.
 * Active district loaded from DISTRICT_ID env (default: tirap).
 */

const { sql } = require('../db');
const { appConfig } = require('../config');
const { mergeCycleConfig } = require('./reportingCycle');

const FALLBACK = {
  district_id: 'tirap',
  district_name: 'Tirap District',
  state_name: 'Arunachal Pradesh',
  app_title: 'Tirap Performance Index',
  submission_opens_day: 1,
  submission_deadline_day: 1,
  submission_deadline_hour: 23,
  submission_deadline_minute: 0,
  target_due_day: 1,
  target_due_hour: 12,
  target_due_minute: 0,
  fiscal_year_start_month: 4
};

let cachedConfig = null;
let cacheTime = 0;
const CACHE_MS = 60_000;

async function loadDistrictConfig(db, districtId = appConfig.districtId) {
  const now = Date.now();
  if (cachedConfig && cachedConfig.district_id === districtId && now - cacheTime < CACHE_MS) {
    return cachedConfig;
  }

  try {
    const result = await db.request()
      .input('id', sql.VarChar(30), districtId)
      .query(`
        IF OBJECT_ID('DistrictConfig', 'U') IS NOT NULL
          SELECT TOP 1 *
          FROM DistrictConfig
          WHERE district_id = @id;
        ELSE SELECT CAST(NULL AS VARCHAR(30)) AS district_id WHERE 1 = 0;
      `);

    const row = result.recordset[0];
    if (row?.district_id) {
      cachedConfig = row;
      cacheTime = now;
      return row;
    }
  } catch {
    /* table may not exist before migrate */
  }

  cachedConfig = { ...FALLBACK, district_id: districtId };
  cacheTime = now;
  return cachedConfig;
}

function toPublicDistrictConfig(row) {
  const cycle = mergeCycleConfig(row);
  return {
    districtId: row.district_id,
    districtName: row.district_name,
    stateName: row.state_name,
    appTitle: row.app_title,
    cycle
  };
}

function clearDistrictConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}

module.exports = {
  loadDistrictConfig,
  toPublicDistrictConfig,
  clearDistrictConfigCache,
  FALLBACK
};
