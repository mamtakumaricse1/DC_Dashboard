/**
 * Demo data for reporting cycle — uses previous/current month from today's date.
 *
 * Scenario:
 *   Previous month = reporting period with RED KPIs + dept submissions
 *   Current month  = follow-up scores for target deviation check
 *
 * Run after seed: node scripts/seed-demo-cycle.js
 */
const { getPool, sql } = require('../db');
const { upsertPerformance } = require('../utils/performanceUpsert');
const { ensureReportingMonth } = require('../utils/reportingMonths');
const {
  getPreviousMonthKey,
  getCurrentMonthKey,
  getTargetDueDate,
  formatDueDateISO,
  mergeCycleConfig
} = require('../utils/reportingCycle');
const { loadDistrictConfig } = require('../utils/districtConfig');

async function upsertPerformanceRow(pool, kpiId, month, year, value) {
  await upsertPerformance(pool.request(), sql, {
    kpiId,
    value,
    month,
    year
  });
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
          action_plan = @plan, target_score = @tscore, target_date = @tdate,
          completion_status = @cstatus, actual_score = @actual, deviation = @dev,
          review_month = @rm, dc_remarks = @remarks, updated_at = SYSDATETIME()
        WHERE kpi_id = @kid AND month_key = @mk;
      ELSE
        INSERT INTO ActionItems (
          dept_id, kpi_id, month_key, indicator_name, indicator_score, status,
          action_owner, action_plan, target_score, target_date, completion_status,
          actual_score, deviation, review_month, dc_remarks
        ) VALUES (
          @dept, @kid, @mk, @name, @score, 'RED', @owner, @plan, @tscore, @tdate,
          @cstatus, @actual, @dev, @rm, @remarks
        );
    `);
}

async function upsertSubmission(pool, deptId, monthKey, submittedAt, isLate, userId) {
  await pool.request()
    .input('dept', sql.VarChar(10), deptId)
    .input('mk', sql.Char(7), monthKey)
    .input('uid', sql.Int, userId)
    .input('sub', sql.DateTime2, submittedAt)
    .input('late', sql.Bit, isLate ? 1 : 0)
    .query(`
      IF EXISTS (SELECT 1 FROM DeptMonthlySubmissions WHERE dept_id = @dept AND month_key = @mk)
        UPDATE DeptMonthlySubmissions
        SET submitted_at = @sub, updated_at = @sub, submitted_by = @uid, is_late = @late
        WHERE dept_id = @dept AND month_key = @mk;
      ELSE
        INSERT INTO DeptMonthlySubmissions (dept_id, month_key, submitted_by, submitted_at, updated_at, is_late)
        VALUES (@dept, @mk, @uid, @sub, @sub, @late);
    `);
}

(async () => {
  const pool = await getPool();

  require('child_process').execSync('node scripts/migrate-v4.js', {
    cwd: require('path').join(__dirname, '..'),
    stdio: 'inherit'
  });

  const districtRow = await loadDistrictConfig(pool);
  const cycle = mergeCycleConfig(districtRow);

  const reportMonthKey = getPreviousMonthKey();
  const reviewMonthKey = getCurrentMonthKey();
  const [rYear, rMonth] = reportMonthKey.split('-').map(Number);
  const [vYear, vMonth] = reviewMonthKey.split('-').map(Number);
  const targetDue = formatDueDateISO(getTargetDueDate(reportMonthKey, cycle));

  await ensureReportingMonth(pool, rYear, rMonth);

  const kpiResult = await pool.request().query(`
    SELECT kpi_id, dept_id, name FROM KPIs
    WHERE dept_id IN ('D01', 'D08')
    ORDER BY dept_id, name
  `);

  const kpis = kpiResult.recordset;
  if (!kpis.length) {
    throw new Error('No KPIs found — run npm run seed first');
  }

  const findKpi = (deptId, fragment) =>
    kpis.find((k) => k.dept_id === deptId && k.name.includes(fragment));

  const fir = findKpi('D08', 'FIR Registration');
  const disposal = findKpi('D08', 'Case Disposal');
  const phc = findKpi('D01', 'PHC Functionality');

  if (!fir || !disposal || !phc) {
    throw new Error('Expected demo KPIs not found in database');
  }

  // Reporting month — RED scores via low actuals
  await upsertPerformanceRow(pool, fir.kpi_id, rMonth, rYear, 42);
  await upsertPerformanceRow(pool, disposal.kpi_id, rMonth, rYear, 38);
  await upsertPerformanceRow(pool, phc.kpi_id, rMonth, rYear, 48);

  const reviewOnTime = new Date(vYear, vMonth - 1, 1, 10, 30, 0);
  const reviewLate = new Date(vYear, vMonth - 1, 8, 11, 0, 0);

  const deptUsers = await pool.request().query(`
    SELECT dept_id, user_id FROM Users WHERE dept_id IN ('D01', 'D08')
  `);
  const uidForDept = (deptId) =>
    deptUsers.recordset.find((r) => r.dept_id === deptId)?.user_id || null;
  const healthUid = uidForDept('D01');
  const policeUid = uidForDept('D08');

  await upsertSubmission(pool, 'D01', reportMonthKey, reviewOnTime, false, healthUid);
  await upsertSubmission(pool, 'D08', reportMonthKey, reviewLate, true, policeUid);

  // Action items — targets due 1st of current month
  await upsertActionItem(pool, {
    deptId: 'D08',
    kpiId: fir.kpi_id,
    monthKey: reportMonthKey,
    indicator: fir.name,
    indicatorScore: 42,
    owner: 'SP Tirap',
    actionPlan: 'Weekly FIR audit at all PS; mandatory registration training for IOs by 15th.',
    targetScore: 70,
    targetDate: targetDue,
    completionStatus: 'IN_PROGRESS',
    actualScore: 55,
    deviation: -15,
    reviewMonth: reviewMonthKey,
    dcRemarks: 'Partial improvement — continue enforcement drive.'
  });

  await upsertActionItem(pool, {
    deptId: 'D08',
    kpiId: disposal.kpi_id,
    monthKey: reportMonthKey,
    indicator: disposal.name,
    indicatorScore: 38,
    owner: 'SP Tirap',
    actionPlan: 'Clear 30 oldest pending cases; weekly disposal review with court liaison.',
    targetScore: 60,
    targetDate: targetDue,
    completionStatus: 'PARTIAL',
    actualScore: 58,
    deviation: -2,
    reviewMonth: reviewMonthKey,
    dcRemarks: 'Close to target — extend monitoring through next month.'
  });

  await upsertActionItem(pool, {
    deptId: 'D01',
    kpiId: phc.kpi_id,
    monthKey: reportMonthKey,
    indicator: phc.name,
    indicatorScore: 48,
    owner: 'DMO Tirap',
    actionPlan: 'PHC functionality drives in Khonsa & Lazu; fix drug stock-outs within 48 hrs.',
    targetScore: 65,
    targetDate: targetDue,
    completionStatus: 'IN_PROGRESS',
    actualScore: 72,
    deviation: 7,
    reviewMonth: reviewMonthKey,
    dcRemarks: 'Score above target (+7) — mark COMPLETED after DC sign-off.'
  });

  console.log('Demo cycle seeded successfully:');
  console.log(`  Reporting month: ${reportMonthKey} (dept data due in ${reviewMonthKey})`);
  console.log(`  Target due date: ${targetDue}`);
  console.log(`  Prior commitments: 3 (Police FIR, Case Disposal, Health PHC)`);
  console.log(`  Submissions: D01 on-time (1st), D08 late (8th)`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
