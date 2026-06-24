/**
 * Demo: D01 Institutional Delivery — April RED → DC target 60% → May review.
 *
 * Scenario (calendar June 2026 review):
 *   April 2026 — 40% institutional delivery → score 40 (RED)
 *   DC sets score target 60 for May (after April review)
 *   May 2026   — 50% institutional delivery → score 50 (still RED, improved)
 *   1 June     — deviation = 50 − 60 = −10 (target not met)
 *
 * Run: node scripts/seed-health-delivery-flow.js
 */
const { getPool, sql } = require('../db');
const { upsertPerformance } = require('../utils/performanceUpsert');
const { ensureReportingMonth } = require('../utils/reportingMonths');
const { makeKpiId } = require('../constants/kpiCatalog');
const { scoreKpiFromRow } = require('../services/scoringService');

const DEPT_ID = 'D01';
const KPI_ID = makeKpiId(DEPT_ID, 'Institutional Delivery Rate');
const APRIL_KEY = '2026-04';
const MAY_KEY = '2026-05';
const TARGET_SCORE = 60;
const APRIL_PCT = 40;
const MAY_PCT = 50;

async function upsertPerformanceRow(pool, { month, year, pct, denominator, numerator }) {
  await upsertPerformance(pool.request(), sql, {
    kpiId: KPI_ID,
    value: pct,
    numerator,
    denominator,
    month,
    year
  });
}

async function upsertSubmission(pool, deptId, monthKey, submittedAt, userId) {
  await pool.request()
    .input('dept', sql.VarChar(10), deptId)
    .input('mk', sql.Char(7), monthKey)
    .input('uid', sql.Int, userId)
    .input('sub', sql.DateTime2, submittedAt)
    .input('late', sql.Bit, 0)
    .query(`
      IF EXISTS (SELECT 1 FROM DeptMonthlySubmissions WHERE dept_id = @dept AND month_key = @mk)
        UPDATE DeptMonthlySubmissions
        SET submitted_at = @sub, updated_at = @sub, submitted_by = @uid, is_late = 0
        WHERE dept_id = @dept AND month_key = @mk;
      ELSE
        INSERT INTO DeptMonthlySubmissions (dept_id, month_key, submitted_by, submitted_at, updated_at, is_late)
        VALUES (@dept, @mk, @uid, @sub, @sub, 0);
    `);
}

async function upsertActionItem(pool, item) {
  await pool.request()
    .input('dept', sql.VarChar(10), item.deptId)
    .input('kid', sql.VarChar(400), item.kpiId)
    .input('mk', sql.Char(7), item.monthKey)
    .input('name', sql.NVarChar(255), item.indicator)
    .input('score', sql.Float, item.indicatorScore)
    .input('owner', sql.NVarChar(150), item.owner)
    .input('plan', sql.NVarChar(500), item.actionPlan)
    .input('tscore', sql.Float, item.targetScore)
    .input('tdate', sql.Date, item.targetDate)
    .input('cstatus', sql.VarChar(20), item.completionStatus)
    .input('actual', sql.Float, item.actualScore)
    .input('dev', sql.Float, item.deviation)
    .input('rm', sql.Char(7), item.reviewMonth)
    .input('remarks', sql.NVarChar(500), item.dcRemarks || '')
    .query(`
      IF EXISTS (SELECT 1 FROM ActionItems WHERE kpi_id = @kid AND month_key = @mk)
        UPDATE ActionItems SET
          indicator_name = @name, indicator_score = @score, action_owner = @owner,
          action_plan = @plan, target_score = @tscore, target_type = 'SCORE',
          target_date = @tdate, completion_status = @cstatus,
          actual_score = @actual, deviation = @dev,
          review_month = @rm, dc_remarks = @remarks, updated_at = SYSDATETIME()
        WHERE kpi_id = @kid AND month_key = @mk;
      ELSE
        INSERT INTO ActionItems (
          dept_id, kpi_id, month_key, indicator_name, indicator_score, status,
          action_owner, action_plan, target_score, target_type, target_date,
          completion_status, actual_score, deviation, review_month, dc_remarks
        ) VALUES (
          @dept, @kid, @mk, @name, @score, 'RED', @owner, @plan, @tscore, 'SCORE',
          @tdate, @cstatus, @actual, @dev, @rm, @remarks
        );
    `);
}

(async () => {
  const pool = await getPool();

  const kpiCheck = await pool.request()
    .input('id', sql.VarChar(400), KPI_ID)
    .query('SELECT kpi_id, name, polarity, min_value, max_value FROM KPIs WHERE kpi_id = @id');

  if (!kpiCheck.recordset.length) {
    throw new Error(`KPI not found (${KPI_ID}). Run: npm run seed`);
  }

  const kpiRow = kpiCheck.recordset[0];
  const aprilScore = scoreKpiFromRow({
    ...kpiRow,
    kpi_name: kpiRow.name,
    actual_value: APRIL_PCT,
    numerator_value: APRIL_PCT,
    denominator_value: 100
  });
  const mayScore = scoreKpiFromRow({
    ...kpiRow,
    kpi_name: kpiRow.name,
    actual_value: MAY_PCT,
    numerator_value: MAY_PCT,
    denominator_value: 100
  });

  await ensureReportingMonth(pool, 2026, 4);
  await ensureReportingMonth(pool, 2026, 5);

  await upsertPerformanceRow(pool, {
    month: 4,
    year: 2026,
    pct: APRIL_PCT,
    denominator: 100,
    numerator: APRIL_PCT
  });
  await upsertPerformanceRow(pool, {
    month: 5,
    year: 2026,
    pct: MAY_PCT,
    denominator: 100,
    numerator: MAY_PCT
  });

  const healthUser = await pool.request()
    .input('dept', sql.VarChar(10), DEPT_ID)
    .query('SELECT TOP 1 user_id FROM Users WHERE dept_id = @dept');

  const healthUid = healthUser.recordset[0]?.user_id;
  if (!healthUid) throw new Error('Health dept user not found');

  await upsertSubmission(pool, DEPT_ID, APRIL_KEY, new Date(2026, 4, 1, 10, 0, 0), healthUid);
  await upsertSubmission(pool, DEPT_ID, MAY_KEY, new Date(2026, 5, 1, 9, 30, 0), healthUid);

  const attainmentScore = Number(((mayScore / TARGET_SCORE) * 100).toFixed(2));
  const deviation = Number((mayScore - TARGET_SCORE).toFixed(2));

  await upsertActionItem(pool, {
    deptId: DEPT_ID,
    kpiId: KPI_ID,
    monthKey: APRIL_KEY,
    indicator: kpiRow.name,
    indicatorScore: aprilScore,
    owner: 'DMO Tirap',
    actionPlan:
      'Increase institutional deliveries: strengthen referral from SCs, weekly review with CHOs, target 60% by May.',
    targetScore: TARGET_SCORE,
    targetDate: '2026-06-01',
    completionStatus: 'IN_PROGRESS',
    actualScore: mayScore,
    deviation,
    reviewMonth: MAY_KEY,
    dcRemarks: ''
  });

  // Remove auto-synced May stub for same KPI so prior-commitment row stays clear.
  await pool.request()
    .input('kid', sql.VarChar(400), KPI_ID)
    .input('mk', sql.Char(7), MAY_KEY)
    .query(`
      DELETE FROM ActionItems
      WHERE kpi_id = @kid AND month_key = @mk AND target_score IS NULL;
    `);

  console.log('\n=== Health — Institutional Delivery test flow seeded ===\n');
  console.log('KPI:', kpiRow.name);
  console.log('');
  console.log('April 2026 (reporting month)');
  console.log(`  Entered: 40 institutional / 100 total deliveries = ${APRIL_PCT}%`);
  console.log(`  Performance score: ${aprilScore} → RED (<70)`);
  console.log('');
  console.log('DC target (set after April review)');
  console.log(`  Target score for May: ${TARGET_SCORE}`);
  console.log('  Due for review: 2026-06-01');
  console.log('');
  console.log('May 2026 (review month — select in dashboard)');
  console.log(`  Entered: 50 institutional / 100 total deliveries = ${MAY_PCT}%`);
  console.log(`  Band score: ${mayScore} (raw performance)`);
  console.log(`  DC target attainment for KRA/TPI: ${mayScore} ÷ ${TARGET_SCORE} × 100 = ${attainmentScore} → YELLOW`);
  console.log('');
  console.log('June review (Past targets / Prior commitments)');
  console.log(`  Achieved (May band score): ${mayScore}`);
  console.log(`  Target: ${TARGET_SCORE}`);
  console.log(`  Deviation: ${deviation} (${deviation >= 0 ? 'met' : 'missed'} target)`);
  console.log('');
  console.log('Where to check in the app:');
  console.log('  1. Month picker → May 2026');
  console.log('  2. Past targets — Target 60, Achieved 50, Gap -10');
  console.log('  3. Set targets → Prior commitments — same deviation');
  console.log('  4. Who is RED? / KRA drill-down → Institutional Delivery shows score', attainmentScore, '(target attainment)');
  console.log('');

  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
