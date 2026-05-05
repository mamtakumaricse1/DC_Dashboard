const express = require('express');
const router = express.Router();

const { getPool } = require('../db');

const calcScore = (actual, min, max, polarity) => {
  if (max === min) return 0;

  let score = polarity === 'HIGHER'
    ? ((actual - min) / (max - min)) * 100
    : ((max - actual) / (max - min)) * 100;

  return Math.max(0, Math.min(100, score));
};

router.get('/summary', async (req, res) => {
  try {
    const db = await getPool();

    const result = await db.request().query(`
      SELECT d.dept_id, d.name,
             k.kpi_id, k.name as kpi_name, k.min_value, k.max_value,
             k.weight, k.polarity,
             pd.actual_value
      FROM Departments d
      JOIN KPIs k ON d.dept_id = k.dept_id
      LEFT JOIN PerformanceData pd 
        ON k.kpi_id = pd.kpi_id 
        AND pd.entry_month = MONTH(GETDATE())
        AND pd.entry_year = YEAR(GETDATE())
    `);

    const map = {};

    result.recordset.forEach(r => {
      if (!map[r.dept_id]) {
        map[r.dept_id] = {
          name: r.name,
          score: 0,
          kpis: []
        };
      }

      const score = calcScore(
        r.actual_value || 0,
        r.min_value,
        r.max_value,
        r.polarity
      );

      map[r.dept_id].kpis.push({
        name: r.kpi_name,
        value: score.toFixed(1)
      });

      map[r.dept_id].score += score * r.weight;
    });

    res.json({
      districtPI: Object.values(map).reduce((s, d) => s + d.score, 0),
      departments: map
    });

  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;