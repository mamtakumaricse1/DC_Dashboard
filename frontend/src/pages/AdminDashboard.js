import React, { useEffect, useMemo, useState } from "react";
import "./AdminDashboard.css";
import AdminHistoryPanel from "./AdminHistoryPanel";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

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

export default function AdminDashboard({ user, onLogout }) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [data, setData] = useState({
    districtPI: 0,
    totalKpis: 0,
    selectedMonth: null,
    monthsAvailable: [],
    kpiStatusCounts: { green: 0, yellow: 0, red: 0, totalIndicators: 0 },
    departments: [],
    actionTracker: []
  });
  const [loading, setLoading] = useState(true);

  const toMonthLabel = (monthKey) => {
    if (!monthKey) return "";
    const [year, month] = monthKey.split("-");
    return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
  };

  const trendLabel = (trend) => {
    if (trend === "UP") return "↗ up";
    if (trend === "DOWN") return "↘ down";
    return "→ flat";
  };

  const statusClass = (status) => {
    if (status === "GREEN") return "status-green";
    if (status === "YELLOW") return "status-yellow";
    return "status-red";
  };

  const loadSummary = (monthKey = "") => {
    setLoading(true);
    const [year, month] = monthKey ? monthKey.split("-") : [];
    const q =
      monthKey
        ? `?month=${Number(month)}&year=${Number(year)}`
        : "";
    fetch(`http://localhost:3001/api/dashboard/summary${q}`)
      .then((res) => res.json())
      .then((res) => {
        setData({
          districtPI: Number(res?.districtPI || 0),
          totalKpis: Number(res?.totalKpis || 0),
          selectedMonth: res?.selectedMonth || null,
          monthsAvailable: Array.isArray(res?.monthsAvailable) ? res.monthsAvailable : [],
          kpiStatusCounts: res?.kpiStatusCounts || { green: 0, yellow: 0, red: 0, totalIndicators: 0 },
          departments: Array.isArray(res?.departments) ? res.departments : [],
          actionTracker: Array.isArray(res?.actionTracker) ? res.actionTracker : []
        });
        if (!monthKey && res?.selectedMonth) {
          setSelectedMonth(res.selectedMonth);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadSummary(selectedMonth);
    }
  }, [selectedMonth]);

  const sortedDepartments = useMemo(
    () => [...data.departments].sort((a, b) => b.score - a.score),
    [data.departments]
  );
  const monthsForDropdown = useMemo(
    () => (data.monthsAvailable.length > 0 ? data.monthsAvailable : getFiscalMonthKeys()),
    [data.monthsAvailable]
  );

  useEffect(() => {
    if (!selectedMonth && monthsForDropdown.length > 0) {
      setSelectedMonth(monthsForDropdown[0]);
    }
  }, [monthsForDropdown, selectedMonth]);

  return (
    <div className="tpi-page">
      <div className="top-header">
        <div className="header-left">
          <div className="tpi-title">TIRAP PERFORMANCE INDEX - MASTER DASHBOARD</div>
          {user?.username && (
            <div className="header-subtitle">
              Logged in as {user.username} (Admin)
            </div>
          )}
        </div>
        <div className="header-actions">
          <button type="button" className="header-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {loading && activeTab !== "history" ? (
        <div className="loading">Loading dashboard...</div>
      ) : (
        <>
          {activeTab !== "history" && (
          <div className="summary-row">
            <div className="tpi-card">
              <div className="tpi-card-head">TPI SCORE</div>
              <div className="tpi-score">{data.districtPI.toFixed(1)}</div>
            </div>

            <div className="status-grid">
              <div className="status-head green">GREEN</div>
              <div className="status-head yellow">YELLOW</div>
              <div className="status-head red">RED</div>
              <div className="status-head total">TOTAL INDICATORS</div>
              <div className="status-value green">{data.kpiStatusCounts.green}</div>
              <div className="status-value yellow">{data.kpiStatusCounts.yellow}</div>
              <div className="status-value red">{data.kpiStatusCounts.red}</div>
              <div className="status-value total">{data.kpiStatusCounts.totalIndicators || data.totalKpis}</div>
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
              <span className="month-help">Select month from dropdown to update dashboard</span>
            </div>
          </div>
          )}

          <div className="tabs">
            <button
              className={activeTab === "dashboard" ? "tab active" : "tab"}
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={activeTab === "action-tracker" ? "tab active" : "tab"}
              onClick={() => setActiveTab("action-tracker")}
            >
              Action Tracker
            </button>
            <button
              className={activeTab === "history" ? "tab active" : "tab"}
              onClick={() => setActiveTab("history")}
            >
              History
            </button>
          </div>

          {activeTab === "history" ? (
            <AdminHistoryPanel
              summaryDepartments={data.departments}
              monthsAvailable={monthsForDropdown}
            />
          ) : activeTab === "dashboard" ? (
            <div className="table-wrap">
              <div className="section-title">KEY RESULT AREAS - ACHIEVEMENT BY DEPARTMENT</div>
              <table className="tpi-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>KRA</th>
                    <th>Owner</th>
                    <th>Weight</th>
                    <th>Indicators</th>
                    <th>Green</th>
                    <th>Yellow</th>
                    <th>Red</th>
                    <th>Avg Achievement</th>
                    <th>KRA Score (0-100)</th>
                    <th>Status</th>
                    <th>Trend (3-mo)</th>
                    <th>Top RED Indicator</th>
                    <th>Action Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDepartments.map((d, idx) => (
                    <tr key={d.id}>
                      <td>{idx + 1}</td>
                      <td className="kra">{d.kra}</td>
                      <td>{d.owner}</td>
                      <td>{Number(d.weight || 0).toFixed(0)}</td>
                      <td>{d.indicators}</td>
                      <td className="green-txt">{d.greenCount}</td>
                      <td className="yellow-txt">{d.yellowCount}</td>
                      <td className="red-txt">{d.redCount}</td>
                      <td>{Number(d.achievement || 0).toFixed(1)}%</td>
                      <td><b>{Number(d.score || 0).toFixed(1)}</b></td>
                      <td className={statusClass(d.ragStatus)}>{d.ragStatus}</td>
                      <td>{trendLabel(d.trend)}</td>
                      <td className="top-red">{d.topRedIndicator}</td>
                      <td>
                        {d.redCount > 0 ? (
                          <button
                            className="tracker-link"
                            onClick={() => setActiveTab("action-tracker")}
                          >
                            See Action Tracker
                          </button>
                        ) : (
                          "No Action Needed"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="section-title">ACTION TRACKER - RED INDICATORS ({toMonthLabel(data.selectedMonth)})</div>
              <table className="tpi-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>KRA</th>
                    <th>Owner</th>
                    <th>RED Indicator</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Action Owner</th>
                    <th>Target Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.actionTracker.length === 0 ? (
                    <tr>
                      <td colSpan="8">No red indicators for selected month.</td>
                    </tr>
                  ) : (
                    data.actionTracker.map((row, idx) => (
                      <tr key={`${row.deptId}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td className="kra">{row.kra}</td>
                        <td>{row.owner}</td>
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
          )}
        </>
      )}
    </div>
  );
}