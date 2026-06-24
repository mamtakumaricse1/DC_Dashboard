/**
 * Bind parameters for PerformanceData upsert (shared by services and seed scripts).
 */
const { UPSERT_PERFORMANCE } = require('../constants/sql');

function bindPerformanceUpsert(request, sqlTypes, params) {
  return request
    .input('kid', sqlTypes.VarChar(400), params.kpiId)
    .input('val', sqlTypes.Float, params.value)
    .input('num', sqlTypes.Float, params.numerator ?? null)
    .input('den', sqlTypes.Float, params.denominator ?? null)
    .input('month', sqlTypes.Int, params.month)
    .input('year', sqlTypes.Int, params.year);
}

async function upsertPerformance(poolOrRequest, sqlTypes, params) {
  await bindPerformanceUpsert(poolOrRequest, sqlTypes, params).query(UPSERT_PERFORMANCE);
}

module.exports = { bindPerformanceUpsert, upsertPerformance, UPSERT_PERFORMANCE };
