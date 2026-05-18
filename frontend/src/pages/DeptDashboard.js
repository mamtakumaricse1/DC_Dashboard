import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./AdminDashboard.css";
import "./DeptDashboard.css";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const toMonthLabel = (monthKey) => {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
};

const statusClass = (status) => {
  if (status === "GREEN") return "status-green";
  if (status === "YELLOW") return "status-yellow";
  return "status-red";
};

export default function DeptDashboard({ user, onLogout }) {
  const deptId = user?.dept_id;
  const [activeTab, setActiveTab] = useState("action-tracker");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({
    selectedMonth: null,
    monthsAvailable: [],
    department: null,
    actionTracker: [],
    kpiStatusCounts: { green: 0, yellow: 0, red: 0, totalIndicators: 0 }
  });
  const [kpis, setKpis] = useState([]);
  const [values, setValues] = useState({});

  const loadSummary = useCallback(
    (monthKey = "") => {
      if (!deptId) return;
      setLoading(true);
      const [year, month] = monthKey ? monthKey.split("-") : [];
      const q = monthKey ? `?month=${Number(month)}&year=${Number(year)}` : "";

      fetch(`http://localhost:3001/api/dashboard/summary${q}`)
        .then((res) => res.json())
        .then((res) => {
          const dept = (res.departments || []).find((d) => d.id === deptId) || null;
          const actionTracker = (res.actionTracker || []).filter(
            (row) => row.deptId === deptId
          );
          setSummary({
            selectedMonth: res.selectedMonth,
            monthsAvailable: res.monthsAvailable || [],
            department: dept,
            actionTracker,
            kpiStatusCounts: dept
              ? {
                  green: dept.greenCount,
                  yellow: dept.yellowCount,
                  red: dept.redCount,
                  totalIndicators: dept.indicators
                }
              : { green: 0, yellow: 0, red: 0, totalIndicators: 0 }
          });
          if (!monthKey && res.selectedMonth) {
            setSelectedMonth(res.selectedMonth);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Dept dashboard load error:", err);
          setLoading(false);
        });
    },
    [deptId]
  );

  const loadKpis = useCallback(
    (monthKey) => {
      if (!deptId || !monthKey) return;
      const [year, month] = monthKey.split("-");
      fetch(
        `http://localhost:3001/api/dept/kpis/${deptId}?month=${Number(month)}&year=${Number(year)}`
      )
        .then((res) => res.json())
        .then((data) => {
          setKpis(Array.isArray(data) ? data : []);
          const initial = {};
          data.forEach((k) => {
            initial[k.kpi_id] =
              k.actual_value !== null && k.actual_value !== undefined
                ? k.actual_value
                : "";
          });
          setValues(initial);
        })
        .catch((err) => console.error("KPI load error:", err));
    },
    [deptId]
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (selectedMonth) {
      loadSummary(selectedMonth);
      loadKpis(selectedMonth);
    }
  }, [selectedMonth, loadSummary, loadKpis]);

  useEffect(() => {
    if (!selectedMonth && summary.monthsAvailable.length > 0) {
      setSelectedMonth(summary.monthsAvailable[summary.monthsAvailable.length - 1]);
    }
  }, [summary.monthsAvailable, selectedMonth]);

  const monthsForDropdown = useMemo(
    () => summary.monthsAvailable,
    [summary.monthsAvailable]
  );

  const submit = async () => {
    if (!selectedMonth) return;
    const [year, month] = selectedMonth.split("-");
    setSaving(true);
    try {
      const entries = Object.entries(values).map(([kpi_id, val]) => ({
        kpi_id,
        actual_value: Number(val)
      }));

      const res = await fetch("http://localhost:3001/api/dept/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          month: Number(month),
          year: Number(year)
        })
      });

      if (!res.ok) throw new Error(await res.text());
      alert("Data saved successfully");
      loadSummary(selectedMonth);
      loadKpis(selectedMonth);
    } catch (err) {
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const dept = summary.department;

  return (
    <div className="tpi-page dept-page">
      <div className="top-header dept-header">
        <div>
          <div className="tpi-title dept-title">
            DEPARTMENT PORTAL — {dept?.name || deptId}
          </div>
          <div className="dept-subtitle">
            {dept?.kra || ""} · Logged in as {user?.username}
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="header-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <div className="summary-row dept-summary-row">
            <div className="tpi-card">
              <div className="tpi-card-head">KRA SCORE</div>
              <div className="tpi-score">{Number(dept?.score || 0).toFixed(1)}</div>
            </div>

            <div className="status-grid">
              <div className="status-head green">GREEN</div>
              <div className="status-head yellow">YELLOW</div>
              <div className="status-head red">RED</div>
              <div className="status-head total">INDICATORS</div>
              <div className="status-value green">{summary.kpiStatusCounts.green}</div>
              <div className="status-value yellow">{summary.kpiStatusCounts.yellow}</div>
              <div className="status-value red">{summary.kpiStatusCounts.red}</div>
              <div className="status-value total">
                {summary.kpiStatusCounts.totalIndicators}
              </div>
            </div>

            <div className="month-panel month-panel-inline">
              <span className="month-label">Reporting Month -&gt;</span>
              <select
                className="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {monthsForDropdown.map((m) => (
                  <option key={m} value={m}>
                    {toMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={activeTab === "action-tracker" ? "tab active" : "tab"}
              onClick={() => setActiveTab("action-tracker")}
            >
              Action Tracker
            </button>
            <button
              type="button"
              className={activeTab === "data-submission" ? "tab active" : "tab"}
              onClick={() => setActiveTab("data-submission")}
            >
              Data Submission
            </button>
          </div>

          {activeTab === "action-tracker" ? (
            <div className="table-wrap">
              <div className="section-title">
                ACTION TRACKER — YOUR RED INDICATORS ({toMonthLabel(selectedMonth)})
              </div>
              <table className="tpi-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>RED Indicator</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Action Owner</th>
                    <th>Target Date</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.actionTracker.length === 0 ? (
                    <tr>
                      <td colSpan="6">No red indicators for your department this month.</td>
                    </tr>
                  ) : (
                    summary.actionTracker.map((row, idx) => (
                      <tr key={`${row.deptId}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td className="top-red">{row.indicator}</td>
                        <td>{Number(row.indicatorScore || 0).toFixed(1)}</td>
                        <td className={statusClass(row.status)}>{row.status}</td>
                        <td>{row.owner}</td>
                        <td>T+7 days</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="section-title">
                DATA SUBMISSION — KPI ENTRY ({toMonthLabel(selectedMonth)})
              </div>
              <table className="tpi-table entry-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Indicator</th>
                    <th>Unit</th>
                    <th>Actual Value</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.length === 0 ? (
                    <tr>
                      <td colSpan="4">No KPIs found for your department.</td>
                    </tr>
                  ) : (
                    kpis.map((k, idx) => (
                      <tr key={k.kpi_id}>
                        <td>{idx + 1}</td>
                        <td className="kra">{k.name}</td>
                        <td>{k.unit || "pct"}</td>
                        <td>
                          <input
                            className="entry-input"
                            type="number"
                            step="any"
                            value={values[k.kpi_id] ?? ""}
                            onChange={(e) =>
                              setValues({ ...values, [k.kpi_id]: e.target.value })
                            }
                            placeholder="Enter value"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="entry-actions">
                <button
                  type="button"
                  className="submit-btn"
                  onClick={submit}
                  disabled={saving || kpis.length === 0}
                >
                  {saving ? "Saving..." : "Submit Data"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
