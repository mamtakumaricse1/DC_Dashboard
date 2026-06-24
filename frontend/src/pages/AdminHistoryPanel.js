/**
 * Admin History tab — 3/6 month KRA trend charts with drill-down per department.
 * Load order: /history API → parallel monthly summaries → dashboard trendSeries fallback.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { deptColorMap } from "../constants/chartColors";
import { bindProgressFill } from "../utils/cssVars";
import { DASHBOARD_API, fetchDashboardSummary, fetchWithAuth, toMonthLabel } from "../utils/api";

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

const HISTORY_TOOLTIP_CURSOR = { fill: "rgba(30, 58, 95, 0.06)" };

/** Solid tooltip card — avoids Recharts default semi-transparent tooltip on month hover. */
function HistoryChartTooltip({ active, payload, label, variant = "multi", departments = [] }) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .filter((entry) => entry.value != null && entry.value !== "")
    .map((entry) => {
      if (variant === "detail") {
        const trend = entry.payload?.trend || "FLAT";
        return {
          key: entry.dataKey,
          color: entry.color || entry.fill,
          name: "KRA Score",
          value: `${Number(entry.value).toFixed(1)} (${trend})`
        };
      }
      const dept = departments.find((d) => d.id === entry.dataKey);
      return {
        key: entry.dataKey,
        color: entry.color || entry.fill,
        name: dept?.shortName || dept?.name || entry.name,
        value: Number(entry.value).toFixed(1)
      };
    });

  if (rows.length === 0) return null;

  return (
    <div className="history-chart-tooltip" role="tooltip">
      <div className="history-chart-tooltip__label">{label}</div>
      <ul className="history-chart-tooltip__list">
        {rows.map((row) => (
          <li key={row.key} className="history-chart-tooltip__item">
            <span
              className="history-chart-tooltip__swatch"
              style={{ background: row.color }}
              aria-hidden
            />
            <span className="history-chart-tooltip__name">{row.name}</span>
            <span className="history-chart-tooltip__value">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

/** Align monthly scores to chart month keys; missing months stay null (not zero). */
const buildSeriesForMonthKeys = (monthKeys, scoresByMonth) => {
  return monthKeys.map((m, i) => {
    const raw = scoresByMonth[m];
    const score = raw !== undefined && raw !== null ? Number(raw) : null;
    const prevMonth = i > 0 ? monthKeys[i - 1] : null;
    const prevRaw = prevMonth != null ? scoresByMonth[prevMonth] : undefined;
    const prevScore =
      prevRaw !== undefined && prevRaw !== null ? Number(prevRaw) : null;
    return {
      month: m,
      label: toMonthLabel(m),
      score: score != null ? Number(score.toFixed(2)) : null,
      trend: score != null && prevScore != null ? scoreTrend(score, prevScore) : "FLAT"
    };
  });
};

const normalizeDepartments = (departments, monthKeys) => {
  if (!Array.isArray(departments) || monthKeys.length === 0) return [];

  return departments.map((d) => {
    const scoresByMonth = {};
    (d.series || []).forEach((point) => {
      if (point?.month) {
        scoresByMonth[point.month] =
          point.score != null ? Number(point.score) : null;
      }
    });
    const series = buildSeriesForMonthKeys(monthKeys, scoresByMonth);
    const scored = series.filter((p) => p.score != null);
    const first = scored[0]?.score ?? null;
    const last = scored[scored.length - 1]?.score ?? null;
    return {
      id: d.id,
      name: d.name,
      shortName: d.shortName || (d.name || d.id).split("/")[0].trim(),
      kra: d.kra,
      series,
      overallTrend: d.overallTrend || (first != null && last != null ? scoreTrend(last, first) : "FLAT"),
      latestScore: d.latestScore != null ? d.latestScore : last,
      latestScoreMonth: d.latestScoreMonth || scored[scored.length - 1]?.month || null
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
      if (point?.month) {
        scoresByMonth[point.month] =
          point.score != null ? Number(point.score) : null;
      }
    });
    const series = buildSeriesForMonthKeys(monthKeys, scoresByMonth);
    const scored = series.filter((p) => p.score != null);
    const first = scored[0]?.score ?? null;
    const last = scored[scored.length - 1]?.score ?? null;
    return {
      id: d.id,
      name: d.name,
      shortName: (d.name || d.id).split("/")[0].trim(),
      kra: d.kra,
      series,
      overallTrend: d.trend || (first != null && last != null ? scoreTrend(last, first) : "FLAT"),
      latestScore: d.score != null ? Number(d.score) : last
    };
  });
}

/** Fallback when /history is unavailable — one summary call per month in parallel. */
async function buildHistoryFromMonthlySummaries(monthKeys) {
  const snapshots = await Promise.all(
    monthKeys.map(async (mk) => {
      const data = await fetchDashboardSummary(mk);
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
      const series = buildSeriesForMonthKeys(monthKeys, dept.points);
      const scored = series.filter((p) => p.score != null);
      const first = scored[0]?.score ?? null;
      const last = scored[scored.length - 1]?.score ?? null;
      return {
        id: dept.id,
        name: dept.name,
        shortName: dept.shortName,
        kra: dept.kra,
        series,
        overallTrend: first != null && last != null ? scoreTrend(last, first) : "FLAT",
        latestScore: last
      };
    })
    .sort((a, b) => (b.latestScore ?? -1) - (a.latestScore ?? -1));

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
  const summaryRef = useRef(summaryDepartments);
  summaryRef.current = summaryDepartments;

  const monthsAvailableKey = Array.isArray(monthsAvailable)
    ? monthsAvailable.join(",")
    : "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const monthKeys = resolveMonthKeys(monthCount, monthsAvailable);

      const applyHistory = (payload, errMsg = "") => {
        if (cancelled) return;
        setHistory({
          months: payload.months?.length ? payload.months : monthKeys,
          departments: payload.departments || []
        });
        setError(errMsg);
        setLoading(false);
      };

      try {
        const res = await fetchWithAuth(`${DASHBOARD_API}/history?months=${monthCount}`);
        if (!res.ok) {
          const text = await res.text();
          let message = text;
          try {
            const parsed = JSON.parse(text);
            message = parsed.error || text;
          } catch {
            /* keep raw text */
          }
          throw new Error(
            text.includes("<!DOCTYPE")
              ? `History API not found (${res.status}). Restart backend: node server.js`
              : message || `History API error (${res.status})`
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
      }

      try {
        const fromSummaries = await buildHistoryFromMonthlySummaries(monthKeys);
        if (fromSummaries.departments.length > 0) {
          applyHistory(fromSummaries, "History API unavailable — built from monthly summaries.");
          return;
        }
      } catch (err) {
        console.error("Monthly summary fallback error:", err);
      }

      const fallback = buildFallbackFromSummary(summaryRef.current, monthKeys);
      applyHistory(
        { months: monthKeys, departments: fallback },
        fallback.length
          ? "History API unavailable — showing cached trend data."
          : "Could not load history. Check SQL Server and restart backend."
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [monthCount, monthsAvailableKey, monthsAvailable]);

  const departmentList = useMemo(() => history.departments, [history.departments]);

  const selectedDept = useMemo(
    () => departmentList.find((d) => d.id === selectedDeptId) || null,
    [departmentList, selectedDeptId]
  );

  const chartMonths = useMemo(() => {
    const keys =
      history.months.length > 0
        ? history.months.slice(-monthCount)
        : resolveMonthKeys(monthCount, monthsAvailable);
    return keys;
  }, [history.months, monthCount, monthsAvailable]);

  const deptColors = useMemo(() => deptColorMap(departmentList), [departmentList]);

  const multiMonthChartData = useMemo(
    () =>
      chartMonths.map((monthKey) => {
        const row = { monthKey, label: toMonthLabel(monthKey) };
        departmentList.forEach((d) => {
          const pt = (d.series || []).find((s) => s.month === monthKey);
          row[d.id] = pt != null ? Number(pt.score) : null;
        });
        return row;
      }),
    [chartMonths, departmentList]
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
        <div className="history-error" role="status">
          {error}
        </div>
      )}

      <div className="panel history-dept-table-wrap">
        <div className="panel-header">
          <h2 className="panel-title">Select department</h2>
          <p className="panel-hint">
            Latest score uses the most recent month with submitted data (not the empty current month).
          </p>
        </div>
        {loading && departmentList.length === 0 ? (
          <div className="history-loading">Loading departments…</div>
        ) : departmentList.length === 0 ? (
          <div className="history-empty">No departments found.</div>
        ) : (
          <div className="table-scroll">
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
                  <td>
                    <b>
                      {d.latestScore != null ? Number(d.latestScore).toFixed(1) : "—"}
                    </b>
                    {d.latestScoreMonth && (
                      <span className="history-latest-month">
                        {" "}
                        ({toMonthLabel(d.latestScoreMonth)})
                      </span>
                    )}
                  </td>
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
          </div>
        )}
      </div>

      {!loading && departmentList.length > 0 && (
        <div className="history-charts-section">
          {!selectedDept ? (
            <>
              <div className="panel-header">
                <h2 className="panel-title">
                  All departments — last {monthCount} months
                </h2>
                <p className="panel-hint history-hint">
                  Each department has its own colour. Click legend or table row to drill down.
                </p>
              </div>
              <div className="history-chart-wrap history-chart-wrap--multi history-chart-wrap--section">
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart
                    data={multiMonthChartData}
                    margin={{ top: 28, right: 16, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#c5cdd8" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      content={
                        <HistoryChartTooltip variant="multi" departments={departmentList} />
                      }
                      cursor={HISTORY_TOOLTIP_CURSOR}
                      offset={16}
                      isAnimationActive={false}
                      wrapperStyle={{ opacity: 1, zIndex: 50 }}
                    />
                    <Legend onClick={(e) => setSelectedDeptId(e.dataKey)} />
                    {departmentList.map((d) => (
                      <Bar
                        key={d.id}
                        dataKey={d.id}
                        name={d.shortName || d.name}
                        fill={deptColors[d.id]}
                        radius={[3, 3, 0, 0]}
                        cursor="pointer"
                        onClick={() => setSelectedDeptId(d.id)}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <>
              <div className="panel-header">
                <h2 className="panel-title">
                  {selectedDept.name} — monthly progress
                </h2>
                <p className="panel-hint history-hint">
                  {selectedDept.kra} · Overall:{" "}
                  <strong className={`trend-${selectedDept.overallTrend}`}>
                    {trendArrow(selectedDept.overallTrend)}
                  </strong>
                </p>
              </div>

              <div className="history-progress-list history-progress-list--inset">
                {detailChartData.length === 0 ? (
                  <p className="history-hint">No monthly data for this period.</p>
                ) : (
                  detailChartData.map((point) => (
                    <div key={point.month} className="history-progress-row">
                      <span className="history-progress-label">{point.label}</span>
                      <div className="history-progress-track">
                        {point.score != null ? (
                          <div
                            className="history-progress-fill"
                            ref={(el) =>
                              bindProgressFill(el, point.score, deptColors[selectedDept.id])
                            }
                          />
                        ) : (
                          <span className="history-progress-empty">No data</span>
                        )}
                      </div>
                      <span className="history-progress-score">
                        {point.score != null ? point.score.toFixed(1) : "—"}
                      </span>
                      <span className={`history-progress-trend trend-${point.trend}`}>
                        {point.trend === "UP" ? "↑" : point.trend === "DOWN" ? "↓" : "→"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {detailChartData.length > 0 && (
                <div className="history-chart-wrap history-chart-detail history-chart-wrap--detail-section">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={detailChartData} margin={{ top: 28, right: 24, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#c5cdd8" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip
                        content={<HistoryChartTooltip variant="detail" />}
                        cursor={HISTORY_TOOLTIP_CURSOR}
                        offset={16}
                        isAnimationActive={false}
                        wrapperStyle={{ opacity: 1, zIndex: 50 }}
                      />
                      <Bar
                        dataKey="score"
                        name="KRA Score"
                        fill={deptColors[selectedDept.id] || "#1e3a5f"}
                        radius={[4, 4, 0, 0]}
                      />
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
