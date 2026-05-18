const express = require('express');
const router = express.Router();

const { getPool, sql } = require('../db');

// GET KPIs for department (optional ?month=&year=)
router.get('/kpis/:id', async (req, res) => {
  try {
    const db = await getPool();
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const result = await db.request()
      .input('id', sql.VarChar, req.params.id)
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query(`
        SELECT k.kpi_id, k.name, k.unit, pd.actual_value
        FROM KPIs k
        LEFT JOIN PerformanceData pd 
          ON k.kpi_id = pd.kpi_id 
          AND pd.entry_month = @month
          AND pd.entry_year = @year
        WHERE k.dept_id = @id
        ORDER BY k.name
      `);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

// SUBMIT DATA for selected reporting month
router.post('/submit', async (req, res) => {
  try {
    const db = await getPool();
    const now = new Date();
    const month = Number(req.body.month) || now.getMonth() + 1;
    const year = Number(req.body.year) || now.getFullYear();
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];

    for (const e of entries) {
      await db.request()
        .input('kid', sql.VarChar, e.kpi_id)
        .input('val', sql.Float, e.actual_value)
        .input('month', sql.Int, month)
        .input('year', sql.Int, year)
        .query(`
          IF EXISTS (
            SELECT 1 FROM PerformanceData 
            WHERE kpi_id = @kid 
              AND entry_month = @month 
              AND entry_year = @year
          )
            UPDATE PerformanceData 
            SET actual_value = @val 
            WHERE kpi_id = @kid 
              AND entry_month = @month 
              AND entry_year = @year
          ELSE
            INSERT INTO PerformanceData (kpi_id, actual_value, entry_month, entry_year)
            VALUES (@kid, @val, @month, @year)
        `);
    }

    res.send("Saved Successfully");

  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;