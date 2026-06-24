/**
 * Dashboard HTTP routes (thin layer — business logic lives in services/).
 */
const express = require('express');
const router = express.Router();

const { getPool, sql } = require('../db');
const { SELECT_ACTION_MONTH_KEY, INSERT_REMINDER_LOG } = require('../constants/sql');
const { KRA_META } = require('../constants/kra');
const {
  buildDashboardSummary,
  buildHistoryPayload,
  buildDeptKpiDetailPayload
} = require('../services/dashboardAggregator');
const { buildReviewCsv, buildReviewHtml, monthLabel } = require('../services/exportService');
const { updateActionItem, mapActionRow } = require('../utils/actionItems');
const { loadDistrictConfig, toPublicDistrictConfig } = require('../utils/districtConfig');
const { buildReportingCycleInfo, mergeCycleConfig } = require('../utils/reportingCycle');
const { requireAdmin } = require('../middleware/auth');
const { buildContactsList } = require('../utils/contacts');

router.get('/measurement-model', (_req, res) => {
  const { buildMeasurementModelPayload } = require('../services/measurementService');
  res.json(buildMeasurementModelPayload());
});

router.get('/config', async (req, res) => {
  try {
    const db = await getPool();
    const districtRow = await loadDistrictConfig(db);
    res.json({
      district: toPublicDistrictConfig(districtRow),
      reportingCycle: buildReportingCycleInfo(mergeCycleConfig(districtRow), new Date())
    });
  } catch (err) {
    console.error('Dashboard config error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const db = await getPool();
    const queryMonth = Number(req.query.month || 0);
    const queryYear = Number(req.query.year || 0);
    const role = String(req.user?.role || 'ADMIN').toUpperCase();
    const deptId = role === 'DEPT' ? req.user.dept_id : null;
    const payload = await buildDashboardSummary(db, queryMonth, queryYear, role, deptId);
    res.json(payload);
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/dept/:deptId/kpis', requireAdmin, async (req, res) => {
  try {
    const db = await getPool();
    const payload = await buildDeptKpiDetailPayload(
      db,
      req.params.deptId,
      Number(req.query.month || 0),
      Number(req.query.year || 0)
    );
    res.json(payload);
  } catch (err) {
    console.error('Dept KPI detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/review', requireAdmin, async (req, res) => {
  try {
    const db = await getPool();
    const queryMonth = Number(req.query.month || 0);
    const queryYear = Number(req.query.year || 0);
    const format = String(req.query.format || 'csv').toLowerCase();
    const payload = await buildDashboardSummary(db, queryMonth, queryYear, 'ADMIN');

    const label = monthLabel(payload.selectedMonth).replace(/\s+/g, '-');

    if (format === 'html' || format === 'pdf') {
      const html = buildReviewHtml(payload);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="TPI-Review-${label}.html"`
      );
      return res.send(html);
    }

    const csv = buildReviewCsv(payload);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="TPI-Review-${label}.csv"`
    );
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', requireAdmin, async (req, res) => {
  try {
    const monthCount = Number(req.query.months) === 3 ? 3 : 6;
    const db = await getPool();
    const payload = await buildHistoryPayload(db, monthCount);
    res.json(payload);
  } catch (err) {
    console.error('Dashboard history error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/action-items/:id', requireAdmin, async (req, res) => {
  try {
    const actionId = Number(req.params.id);
    if (!actionId) {
      return res.status(400).json({ error: 'Invalid action id' });
    }

    const db = await getPool();
    const districtRow = await loadDistrictConfig(db);

    const existing = await db.request()
      .input('id', sql.Int, actionId)
      .query(SELECT_ACTION_MONTH_KEY);

    const originMonth = existing.recordset[0]?.month_key || req.body.origin_month_key;

    const updated = await updateActionItem(db, actionId, {
      action_owner: req.body.action_owner,
      target_date: req.body.target_date,
      action_plan: req.body.action_plan,
      target_type: req.body.target_type,
      target_actual: req.body.target_actual != null ? Number(req.body.target_actual) : null,
      target_quarter: req.body.target_quarter,
      target_score: req.body.target_score != null ? Number(req.body.target_score) : null,
      completion_status: req.body.completion_status,
      actual_score: req.body.actual_score != null ? Number(req.body.actual_score) : null,
      deviation: req.body.deviation != null ? Number(req.body.deviation) : null,
      review_month: req.body.review_month,
      dc_remarks: req.body.dc_remarks,
      origin_month_key: originMonth
    }, districtRow);

    if (!updated) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    const meta = KRA_META[updated.dept_id] || {};
    res.json(
      mapActionRow(
        updated,
        {
          kra: `${meta.code || 'NA'} - ${meta.label || ''}`,
          owner: meta.owner,
          ownerPhone: meta.ownerPhone,
          ownerEmail: meta.ownerEmail
        },
        req.body.section || 'CURRENT',
        req.body.review_month || null,
        districtRow
      )
    );
  } catch (err) {
    console.error('Action item update error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/contacts', requireAdmin, (_req, res) => {
  res.json({ contacts: buildContactsList() });
});

router.post('/remind', requireAdmin, async (req, res) => {
  try {
    const { deptId, kpiId, actionId, indicator, channel = 'COPY' } = req.body;
    if (!deptId) {
      return res.status(400).json({ error: 'deptId is required' });
    }

    const meta = KRA_META[deptId] || {};
    const ownerName = meta.owner || 'Department head';
    const phone = meta.ownerPhone || '';
    const email = meta.ownerEmail || '';
    const label = indicator || 'RED performance indicator';
    const message =
      `Tirap TPI reminder: "${label}" is RED and needs action. ` +
      `Please submit/update your monthly data and action plan. — DC Office`;

    try {
      const db = await getPool();
      await db.request()
        .input('aid', sql.Int, actionId || null)
        .input('dept', sql.VarChar(10), deptId)
        .input('kid', sql.VarChar(400), kpiId || null)
        .input('name', sql.NVarChar(150), ownerName)
        .input('phone', sql.VarChar(30), phone)
        .input('ch', sql.VarChar(20), channel)
        .input('msg', sql.NVarChar(500), message)
        .input('uid', sql.Int, req.user?.user_id || null)
        .query(INSERT_REMINDER_LOG);
    } catch (logErr) {
      console.warn('ReminderLog skip:', logErr.message);
    }

    res.json({
      owner: ownerName,
      phone,
      email,
      message,
      whatsappUrl: phone
        ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
        : null,
      telUrl: phone ? `tel:${phone}` : null,
      mailUrl: email ? `mailto:${email}?subject=${encodeURIComponent('TPI RED indicator reminder')}&body=${encodeURIComponent(message)}` : null
    });
  } catch (err) {
    console.error('Remind error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
