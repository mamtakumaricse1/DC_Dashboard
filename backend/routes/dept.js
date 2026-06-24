/**
 * Department portal routes — KPI load, guide, and monthly submission.
 * Departments may only submit the active reporting month (previous calendar month).
 */
const express = require('express');
const router = express.Router();

const { getPool } = require('../db');
const { requireDeptAccess } = require('../middleware/auth');
const { loadDistrictConfig, toPublicDistrictConfig } = require('../utils/districtConfig');
const { buildReportingCycleInfo, mergeCycleConfig } = require('../utils/reportingCycle');
const { buildDeptKpiGuidePayload } = require('../services/kpiGuideService');
const { loadDeptKpisForSubmission } = require('../services/deptKpiLoadService');
const { submitDeptMonthlyData } = require('../services/deptSubmissionService');

/** Public district + reporting cycle (no auth). */
router.get('/context', async (req, res) => {
  try {
    const db = await getPool();
    const districtRow = await loadDistrictConfig(db);
    res.json({
      district: toPublicDistrictConfig(districtRow),
      reportingCycle: buildReportingCycleInfo(mergeCycleConfig(districtRow), new Date())
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Live KPI guide for one department (from DB). */
router.get('/kpi-guide/:id', requireDeptAccess, async (req, res) => {
  try {
    const db = await getPool();
    const payload = await buildDeptKpiGuidePayload(db, req.params.id);
    res.json(payload);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('KPI guide error:', err);
    res.status(status).json({ error: err.message });
  }
});

/** KPI list + saved values for active reporting month. */
router.get('/kpis/:id', requireDeptAccess, async (req, res) => {
  try {
    const db = await getPool();
    const payload = await loadDeptKpisForSubmission(db, req.params.id);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Save or update monthly PerformanceData for the department. */
router.post('/submit', async (req, res) => {
  const role = String(req.user?.role || '').toUpperCase();
  if (role !== 'DEPT' || !req.user.dept_id) {
    return res.status(403).json({ error: 'Department user required for data submission' });
  }

  try {
    const pool = await getPool();
    const districtRow = await loadDistrictConfig(pool);
    const result = await submitDeptMonthlyData({
      pool,
      deptId: req.user.dept_id,
      userId: req.user.user_id,
      year: Number(req.body.year),
      month: Number(req.body.month),
      entries: Array.isArray(req.body.entries) ? req.body.entries : [],
      districtRow
    });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('Dept submit error:', err);
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
