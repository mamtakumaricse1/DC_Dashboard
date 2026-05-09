const express = require('express');
const router = express.Router();

const { getPool, sql } = require('../db');

// ✅ SCORE (0–100)
const calcScore = (actual, min, max, polarity) => {
  if (actual === null || actual === undefined) return 0;
  if (max === min) return 0;

  let score =
    polarity === 'HIGHER'
      ? ((actual - min) / (max - min)) * 100
      : ((max - actual) / (max - min)) * 100;

  return Math.max(0, Math.min(100, score));
};

// ✅ CATEGORY
const getCategory = (score) => {
  if (score >= 85) return "Achiever";
  if (score >= 65) return "Performer";
  if (score >= 40) return "Aspirant";
  return "Laggard";
};

const getRagStatus = (score) => {
  if (score >= 90) return "GREEN";
  if (score >= 70) return "YELLOW";
  return "RED";
};

const KRA_META = {
  D01: { code: "H", label: "Health Service Delivery", owner: "DMO (District Medical Officer)" },
  D02: { code: "E", label: "Education Attendance & Outcomes", owner: "DDSE (Deputy Director, School Education)" },
  D03: { code: "A", label: "Anganwadi & ECCE", owner: "DPO (ICDS)" },
  D04: { code: "D", label: "Drug Demand-Reduction & Youth", owner: "DC + DMO + SP (joint)" },
  D05: { code: "S", label: "Sanitation, Cleanliness & Urban Services", owner: "TMC / Municipal Cmsr + SDO" },
  D06: { code: "I", label: "Infrastructure, Roads & Connectivity", owner: "PWD SE + PMGSY PIA" },
  D07: { code: "W", label: "Power Supply & Distribution", owner: "Executive Engineer (Power)" },
  D08: { code: "L", label: "Law & Order, Public Safety", owner: "Superintendent of Police" },
  D09: { code: "G", label: "Agriculture, Horticulture & Allied", owner: "DAO + DHO + DPM-NRLM" },
  D10: { code: "C", label: "Convergence & Saturation Villages", owner: "DC (chair) + multi-departmental" },
  D11: { code: "R", label: "Revenue & Land", owner: "Revenue Officer + COs" },
  D12: { code: "J", label: "Jan Suvidha (Certificates & Services)", owner: "OIC, Jan Suvidha (DC Office)" },
  D13: { code: "M", label: "Disaster Management & Resilience", owner: "District Disaster Mgmt Officer (DDMO)" },
  D14: { code: "P", label: "Process, People & Citizen Grievance", owner: "DC Office" }
};

const getFiscalMonthKeys = () => {
  const now = new Date();
  const startYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return [
    `${startYear}-04`,
    `${startYear}-05`,
    `${startYear}-06`,
    `${startYear}-07`,
    `${startYear}-08`,
    `${startYear}-09`,
    `${startYear}-10`,
    `${startYear}-11`,
    `${startYear}-12`,
    `${startYear + 1}-01`,
    `${startYear + 1}-02`,
    `${startYear + 1}-03`
  ];
};

// ✅ TREND CALCULATION (current month vs previous 2/3 months average)
const getTrend = (monthlyScores) => {
  const months = Object.keys(monthlyScores).sort().reverse();

  // Need at least current month + previous 2 months
  if (months.length < 3) return "FLAT";

  const current = Number(monthlyScores[months[0]] || 0);
  const prevWindow = months.length >= 4 ? months.slice(1, 4) : months.slice(1, 3);
  const previousScores = prevWindow.map((m) => Number(monthlyScores[m] || 0));
  const avgPrevious =
    previousScores.reduce((acc, val) => acc + val, 0) / previousScores.length;

  // 1-point deadband to avoid noisy flips
  if (current > avgPrevious + 1) return "UP";
  if (current < avgPrevious - 1) return "DOWN";
  return "FLAT";
};

// =====================================================
// ✅ DASHBOARD SUMMARY WITH TREND
// =====================================================
router.get('/summary', async (req, res) => {
  try {
    const db = await getPool();

    const queryMonth = Number(req.query.month || 0);
    const queryYear = Number(req.query.year || 0);

    const result = await db.request().query(`
      SELECT 
        d.dept_id,
        d.name AS dept_name,
        d.weight AS dept_weight,

        k.kpi_id,
        k.name AS kpi_name,
        k.min_value,
        k.max_value,
        k.weight AS kpi_weight,
        k.polarity,

        pd.actual_value,
        pd.entry_month,
        pd.entry_year

      FROM Departments d
      JOIN KPIs k ON d.dept_id = k.dept_id

      LEFT JOIN PerformanceData pd 
        ON k.kpi_id = pd.kpi_id
    `);

    const rows = result.recordset;
    const totalKpis = new Set(rows.map((r) => r.kpi_id).filter(Boolean)).size;
    const monthSet = new Set(
      rows
        .filter((r) => r.entry_year && r.entry_month)
        .map((r) => `${r.entry_year}-${String(r.entry_month).padStart(2, "0")}`)
    );
    let monthsAvailable = Array.from(monthSet).sort();
    try {
      const monthMasterResult = await db.request().query(`
        IF OBJECT_ID('ReportingMonths', 'U') IS NOT NULL
            SELECT month_key, sort_order
            FROM ReportingMonths
            ORDER BY sort_order;
        ELSE
            SELECT CAST(NULL AS VARCHAR(7)) AS month_key, CAST(NULL AS INT) AS sort_order
            WHERE 1=0;
      `);
      const masterMonths = monthMasterResult.recordset
        .map((r) => r.month_key)
        .filter(Boolean);
      if (masterMonths.length > 0) {
        monthsAvailable = masterMonths;
      }
    } catch (e) {
      // fallback keeps API usable even before month master is created
    }
    if (monthsAvailable.length === 0) {
      monthsAvailable = getFiscalMonthKeys();
    }
    const selectedMonthKey = (() => {
      if (queryMonth >= 1 && queryMonth <= 12 && queryYear > 0) {
        return `${queryYear}-${String(queryMonth).padStart(2, "0")}`;
      }
      return monthsAvailable[monthsAvailable.length - 1] || null;
    })();

    const departments = {};
    let totalGreen = 0;
    let totalYellow = 0;
    let totalRed = 0;

    rows.forEach(r => {
      if (!departments[r.dept_id]) {
        const meta = KRA_META[r.dept_id] || {};
        departments[r.dept_id] = {
          dept_id: r.dept_id,
          name: r.dept_name,
          weight: Number(r.dept_weight),
          kraCode: meta.code || "NA",
          kraLabel: meta.label || r.dept_name,
          owner: meta.owner || "N/A",
          monthly: {},
          kpiIds: new Set(),
          monthKpis: []
        };
      }

      if (r.kpi_id) {
        departments[r.dept_id].kpiIds.add(r.kpi_id);
      }

      if (
        r.entry_year === null ||
        r.entry_month === null ||
        r.actual_value === null
      ) {
        return;
      }

      const monthKey = `${r.entry_year}-${String(r.entry_month).padStart(2, "0")}`;

      if (!departments[r.dept_id].monthly[monthKey]) {
        departments[r.dept_id].monthly[monthKey] = {
          score: 0,
          weight: 0
        };
      }

      const score = calcScore(
        r.actual_value,
        r.min_value,
        r.max_value,
        r.polarity
      );
      const kpiWeight = 1;
      departments[r.dept_id].monthly[monthKey].score += score * kpiWeight;
      departments[r.dept_id].monthly[monthKey].weight += kpiWeight;

      if (monthKey === selectedMonthKey) {
        let status = "RED";
        if (score >= 90) status = "GREEN";
        else if (score >= 70) status = "YELLOW";

        if (status === "GREEN") totalGreen += 1;
        else if (status === "YELLOW") totalYellow += 1;
        else totalRed += 1;

        departments[r.dept_id].monthKpis.push({
          kpi_id: r.kpi_id,
          name: r.kpi_name,
          score: Number(score.toFixed(2)),
          status
        });
      }
    });

    let districtPI = 0;
    let totalDeptWeight = 0;
    const actionTracker = [];

    const deptArray = Object.entries(departments).map(([id, d]) => {
      const monthlyScores = {};

      Object.entries(d.monthly).forEach(([m, val]) => {
        monthlyScores[m] =
          val.weight > 0 ? val.score / val.weight : 0;
      });

      const months = Object.keys(monthlyScores).sort().reverse();
      const currentMonthScore =
        selectedMonthKey && monthlyScores[selectedMonthKey] !== undefined
          ? monthlyScores[selectedMonthKey]
          : (monthlyScores[months[0]] || 0);

      const trend = getTrend(monthlyScores);
      const trendSeries = months.slice(0, 3).reverse().map((month) => ({
        month,
        score: Number((monthlyScores[month] || 0).toFixed(2))
      }));

      const score = Number(currentMonthScore.toFixed(2));
      const ragStatus = getRagStatus(score);
      const achievement = score;
      const greenCount = d.monthKpis.filter((k) => k.status === "GREEN").length;
      const yellowCount = d.monthKpis.filter((k) => k.status === "YELLOW").length;
      const redKpis = d.monthKpis
        .filter((k) => k.status === "RED")
        .sort((a, b) => a.score - b.score);
      const redCount = redKpis.length;
      const topRedIndicator = redKpis[0]?.name || "-";
      const actionStatus = redCount > 0 ? "See Action Tracker" : "No Action Needed";

      districtPI += score * d.weight;
      totalDeptWeight += d.weight;

      redKpis.forEach((kpi) => {
        actionTracker.push({
          deptId: id,
          kra: `${d.kraCode} - ${d.kraLabel}`,
          owner: d.owner,
          indicator: kpi.name,
          indicatorScore: kpi.score,
          status: kpi.status,
          month: selectedMonthKey
        });
      });

      return {
        id,
        name: d.name,
        kra: `${d.kraCode} - ${d.kraLabel}`,
        owner: d.owner,
        weight: Number(d.weight || 0),
        kpiCount: d.kpiIds.size,
        indicators: d.monthKpis.length,
        greenCount,
        yellowCount,
        redCount,
        score,
        achievement,
        ragStatus,
        trend,
        trendSeries,
        topRedIndicator,
        actionStatus
      };
    });

    if (totalDeptWeight > 0) {
      districtPI = districtPI / totalDeptWeight;
    }

    districtPI = Number(districtPI.toFixed(2));
    deptArray.sort((a, b) => b.score - a.score);
    const top3 = deptArray.slice(0, 3);
    const bottom3 = deptArray.slice(-3).reverse();

    res.json({
      districtPI,
      totalKpis,
      selectedMonth: selectedMonthKey,
      monthsAvailable,
      kpiStatusCounts: {
        green: totalGreen,
        yellow: totalYellow,
        red: totalRed,
        totalIndicators: totalGreen + totalYellow + totalRed
      },
      departments: deptArray,
      actionTracker,
      top3,
      bottom3
    });

  } catch (err) {
    console.error("🔥 Dashboard Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;