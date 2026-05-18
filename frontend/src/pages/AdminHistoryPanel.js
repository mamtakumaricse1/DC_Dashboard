import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const TREND_COLOR = {
  UP: "#2d8a3f",
  DOWN: "#8f1f22",
  FLAT: "#a16a00"
};

const API_BASE = "http://localhost:3001/api/dashboard";

const toMonthLabel = (monthKey) => {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
};

const scoreTrend = (current, previous) => {
  if (previous === null || previous === undefined) return "FLAT";
  if (current > previous + 1) return "UP";
  if (current < previous - 1) return "DOWN";
  return "FLAT";
};

const trendArrow = (trend) => {
  if (trend === "UP") return "↗ Improving";
  if (trend === "DOWN") return "↘ Declining";
  return "→ Stable";
};

const getLastNCalendarMonthKeys = (n) => {
  const keys = [];
  const anchor = new Date();
  anchor.setDate(1);
  for (let i = n - 1; i >= 0; i -= 1) {
    const dt = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    keys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
};

const resolveMonthKeys = (monthCount, monthsAvailable) => {
  if (Array.isArray(monthsAvailable) && monthsAvailable.length >= monthCount) {
    return monthsAvailable.slice(-monthCount);
  }
  if (Array.isArray(monthsAvailable) && monthsAvailable.length > 0) {
    return monthsAvailable;
  }
  return getLastNCalendarMonthKeys(monthCount);
};

const buildSeriesForMonthKeys = (monthKeys, scoresByMonth, latestFallback = 0) => {
  let lastKnown = latestFallback;
  return monthKeys.map((m, i) => {
    const raw = scoresByMonth[m];
    const score =
      raw !== undefined && raw !== null
        ? Number(raw)
        : (i > 0 ? lastKnown : latestFallback);
    lastKnown = score;
    const prev = i > 0 ? scoresByMonth[monthKeys[i - 1]] ?? lastKnown : null;
    const prevScore = prev !== undefined && prev !== null ? Number(prev) : null;
    return {
      month: m,
      label: toMonthLabel(m),
      score: Number(score.toFixed(2)),
      trend: scoreTrend(score, prevScore)
    };
  });
};

const normalizeDepartments = (departments, monthKeys) => {
  if (!Array.isArray(departments) || monthKeys.length === 0) return [];

  return departments.map((d) => {
    const scoresByMonth = {};
    (d.series || []).forEach((point) => {
      if (point?.month) scoresByMonth[point.month] = Number(point.score || 0);
    });
    const series = buildSeriesForMonthKeys(
      monthKeys,
      scoresByMonth,
      Number(d.latestScore ?? d.score ?? 0)
    );
    const first = series[0]?.score ?? 0;
    const last = series[series.length - 1]?.score ?? 0;
    return {
      id: d.id,
      name: d.name,
      shortName: d.shortName || (d.name || d.id).split("/")[0].trim(),
      kra: d.kra,
      series,
      overallTrend: d.overallTrend || scoreTrend(last, first),
      latestScore: last
    };
  });
};

function buildFallbackFromSummary(summaryDepartments, monthKeys) {
  if (!Array.isArray(summaryDepartments) || summaryDepartments.length === 0) {
    return [];
  }
  return summaryDepartments.map((d) => {
    const scoresByMonth = {};
    (d.trendSeries || []).forEach((point) => {
      if (point?.month) scoresByMonth[point.month] = Number(point.score || 0);
    });
    const series = buildSeriesForMonthKeys(
      monthKeys,
      scoresByMonth,
      Number(d.score || 0)
    );
    const first = series[0]?.score ?? 0;
    const last = series[series.length - 1]?.score ?? 0;
    return {
      id: d.id,
      name: d.name,
      shortName: (d.name || d.id).split("/")[0].trim(),
      kra: d.kra,
      series,
      overallTrend: d.trend || scoreTrend(last, first),
      latestScore: Number(d.score || last)
    };
  });
}

async function buildHistoryFromMonthlySummaries(monthKeys) {
  const snapshots = await Promise.all(
    monthKeys.map(async (mk) => {
      const [year, month] = mk.split("-");
      const res = await fetch(
        `${API_BASE}/summary?month=${Number(month)}&year=${Number(year)}`
      );
      if (!res.ok) {
        throw new Error(`Summary failed for ${mk} (${res.status})`);
      }
      const data = await res.json();
      return { month: mk, departments: data.departments || [] };
    })
  );

  const deptMap = {};
  snapshots.forEach(({ month, departments }) => {
    departments.forEach((d) => {
      if (!deptMap[d.id]) {
        deptMap[d.id] = {
          id: d.id,
          name: d.name,
          kra: d.kra,
          shortName: (d.name || d.id).split("/")[0].trim(),
          points: {}
        };
      }
      deptMap[d.id].points[month] = Number(d.score || 0);
    });
  });

  const departments = Object.values(deptMap)
    .map((dept) => {
      const series = buildSeriesForMonthKeys(monthKeys, dept.points, 0);
      const first = series[0]?.score ?? 0;
      const last = series[series.length - 1]?.score ?? 0;
      return {
        id: dept.id,
        name: dept.name,
        shortName: dept.shortName,
        kra: dept.kra,
        series,
        overallTrend: scoreTrend(last, first),
        latestScore: last
      };
    })
    .sort((a, b) => b.latestScore - a.latestScore);

  return { months: monthKeys, departments };
}

export default function AdminHistoryPanel({
  summaryDepartments = [],
  monthsAvailable = []
}) {
  const [monthCount, setMonthCount] = useState(6);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [history, setHistory] = useState({ months: [], departments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const monthKeys = resolveMonthKeys(monthCount, monthsAvailable);

      const applyHistory = (payload) => {
        if (cancelled) return;
        setHistory({
          months: payload.months?.length ? payload.months : monthKeys,
          departments: payload.departments
        });
        setLoading(false);
      };

      try {
        const res = await fetch(`${API_BASE}/history?months=${monthCount}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            text.includes("<!DOCTYPE")
              ? `History API not found (${res.status}). Restart the backend: node server.js`
              : text || `History API error (${res.status})`
          );
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const apiMonthKeys =
          Array.isArray(data.months) && data.months.length > 0
            ? data.months
            : monthKeys;
        const normalized = normalizeDepartments(data.departments, apiMonthKeys);

        if (normalized.length > 0) {
          applyHistory({ months: apiMonthKeys, departments: normalized });
          return;
        }
      } catch (err) {
        console.error("History API error:", err);
        if (!cancelled) {
          setError(err.message || "Failed to load history");
        }
      }

      try {
        const fromSummaries = await buildHistoryFromMonthlySummaries(monthKeys);
        if (fromSummaries.departments.length > 0) {
          applyHistory(fromSummaries);
          return;
        }
      } catch (err) {
        console.error("Monthly summary fallback error:", err);
      }

      if (!cancelled) {
        applyHistory({
          months: monthKeys,
          departments: buildFallbackFromSummary(summaryDepartments, monthKeys)
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [monthCount, monthsAvailable, summaryDepartments]);

  const departmentList = useMemo(() => history.departments, [history.departments]);

  const selectedDept = useMemo(
    () => departmentList.find((d) => d.id === selectedDeptId) || null,
    [departmentList, selectedDeptId]
  );

  const overviewChartData = useMemo(
    () =>
      departmentList.map((d) => ({
        id: d.id,
        name: d.shortName || d.name,
        score: d.latestScore,
        overallTrend: d.overallTrend
      })),
    [departmentList]
  );

  const detailChartData = useMemo(() => {
    if (!selectedDept) return [];
    const keys =
      history.months.length >= monthCount
        ? history.months.slice(-monthCount)
        : resolveMonthKeys(monthCount, monthsAvailable);
    return normalizeDepartments([selectedDept], keys)[0]?.series || selectedDept.series || [];
  }, [selectedDept, history.months, monthCount, monthsAvailable]);

  return (
    <div className="history-panel">
      <div className="history-toolbar">
        <div className="history-range">
          <span className="history-range-label">Period:</span>
          <button
            type="button"
            className={monthCount === 3 ? "history-range-btn active" : "history-range-btn"}
            onClick={() => {
              setMonthCount(3);
              setSelectedDeptId(null);
            }}
          >
            Last 3 months
          </button>
          <button
            type="button"
            className={monthCount === 6 ? "history-range-btn active" : "history-range-btn"}
            onClick={() => {
              setMonthCount(6);
              setSelectedDeptId(null);
            }}
          >
            Last 6 months
          </button>
        </div>
        {selectedDept && (
          <button
            type="button"
            className="history-back-btn"
            onClick={() => setSelectedDeptId(null)}
          >
            ← Show all departments
          </button>
        )}
      </div>

      {error && (
        <div className="history-error">
          {error}. Loaded monthly scores from dashboard summaries instead.
        </div>
      )}

      <div className="table-wrap history-dept-table-wrap">
        <div className="section-title">SELECT DEPARTMENT (click a row to drill down)</div>
        {loading && departmentList.length === 0 ? (
          <div className="history-loading">Loading departments...</div>
        ) : departmentList.length === 0 ? (
          <div className="history-empty">No departments found. Run database seed and restart backend.</div>
        ) : (
          <table className="tpi-table history-dept-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Department</th>
                <th>KRA</th>
                <th>Latest score</th>
                <th>Period trend</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {departmentList.map((d, idx) => (
                <tr
                  key={d.id}
                  className={selectedDeptId === d.id ? "history-row-selected" : "history-row-clickable"}
                  onClick={() => setSelectedDeptId(d.id)}
                >
                  <td>{idx + 1}</td>
                  <td className="kra history-dept-cell-name">{d.name}</td>
                  <td>{d.kra}</td>
                  <td><b>{Number(d.latestScore || 0).toFixed(1)}</b></td>
                  <td className={`trend-${d.overallTrend}`}>{trendArrow(d.overallTrend)}</td>
                  <td>
                    <button
                      type="button"
                      className="tracker-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDeptId(d.id);
                      }}
                    >
                      View trend
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && departmentList.length > 0 && (
        <div className="history-charts-section">
          {!selectedDept ? (
            <>
              <div className="section-title">
                ALL DEPARTMENTS — LATEST SCORE ({monthCount} month window)
              </div>
              <p className="history-hint">
                Bar colours: green = improving, red = declining, amber = stable over the
                selected period.
              </p>
              <div className="history-chart-wrap">
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={overviewChartData}
                    margin={{ top: 16, right: 24, left: 8, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#c5cdd8" />
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={90}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(1)}`, "KRA Score"]}
                    />
                    <Bar dataKey="score" name="Latest KRA Score" radius={[4, 4, 0, 0]}>
                      {overviewChartData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={TREND_COLOR[entry.overallTrend] || TREND_COLOR.FLAT}
                          cursor="pointer"
                          onClick={() => setSelectedDeptId(entry.id)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <>
              <div className="section-title">
                {selectedDept.name} — MONTHLY PROGRESS ({detailChartData.length} months)
              </div>
              <p className="history-hint">
                {selectedDept.kra} · Overall:{" "}
                <strong className={`trend-${selectedDept.overallTrend}`}>
                  {trendArrow(selectedDept.overallTrend)}
                </strong>
              </p>

              <div className="history-progress-list">
                {detailChartData.length === 0 ? (
                  <p className="history-hint">No monthly data for this period.</p>
                ) : (
                  detailChartData.map((point) => (
                    <div key={point.month} className="history-progress-row">
                      <span className="history-progress-label">{point.label}</span>
                      <div className="history-progress-track">
                        <div
                          className="history-progress-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, point.score))}%`,
                            backgroundColor: TREND_COLOR[point.trend] || TREND_COLOR.FLAT
                          }}
                        />
                      </div>
                      <span className="history-progress-score">{point.score.toFixed(1)}</span>
                      <span className={`history-progress-trend trend-${point.trend}`}>
                        {point.trend === "UP" ? "↑" : point.trend === "DOWN" ? "↓" : "→"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {detailChartData.length > 0 && (
                <div className="history-chart-wrap history-chart-detail">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={detailChartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#c5cdd8" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value, _name, props) => [
                          `${Number(value).toFixed(1)} (${props?.payload?.trend || "FLAT"})`,
                          "KRA Score"
                        ]}
                      />
                      <Bar dataKey="score" name="KRA Score" radius={[4, 4, 0, 0]}>
                        {detailChartData.map((entry) => (
                          <Cell
                            key={entry.month}
                            fill={TREND_COLOR[entry.trend] || TREND_COLOR.FLAT}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
