/**
 * Admin (DC) master dashboard — Command Center + KRA overview + action tracker.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PATHS, adminPath, tabFromAdminUrl } from "../routes/paths";
import "./AdminDashboard.css";
import "../components/AppLayout.css";
import AppLayout from "../components/AppLayout";
import DcCommandCenter from "../components/DcCommandCenter";
import DistrictHero from "../components/DistrictHero";
import KraHeatmapGrid from "../components/KraHeatmapGrid";
import SubmissionTrackerTable from "../components/SubmissionTrackerTable";
import TargetFollowUpPanel from "../components/TargetFollowUpPanel";
import OverviewDeptTable from "../components/OverviewDeptTable";
import KraDrillDownModal from "../components/KraDrillDownModal";
import ScoreExplainer from "../components/ScoreExplainer";
import ActionTrackerGrouped from "../components/ActionTrackerGrouped";
import EmptyState from "../components/EmptyState";
import AdminHistoryPanel from "./AdminHistoryPanel";
import AdminContactsPanel from "../components/AdminContactsPanel";
import YearMonthPicker from "../components/YearMonthPicker";
import { DC_PAGE_GUIDE, EMPTY_DASHBOARD_DATA } from "../constants/tpi";
import {
  downloadReviewExport,
  fetchContacts,
  fetchDashboardSummary,
  getFiscalMonthKeys,
  toMonthLabel,
  updateActionItem
} from "../utils/api";

const PAGE_TITLES = {
  home: "Home",
  submissions: "Submissions",
  "target-followup": "Past targets",
  overview: "All departments",
  "action-tracker": "Set targets",
  contacts: "Contacts",
  history: "Trends"
};

const ADMIN_NAV = [
  { id: "home", label: "Home", hint: DC_PAGE_GUIDE.home },
  { id: "submissions", label: "Submissions", hint: DC_PAGE_GUIDE.submissions },
  { id: "target-followup", label: "Past targets", hint: DC_PAGE_GUIDE["target-followup"] },
  { id: "overview", label: "All departments", hint: DC_PAGE_GUIDE.overview },
  { id: "action-tracker", label: "Set targets", hint: DC_PAGE_GUIDE["action-tracker"] },
  { id: "contacts", label: "Contacts", hint: DC_PAGE_GUIDE.contacts },
  { id: "history", label: "Trends", hint: DC_PAGE_GUIDE.history }
];

function ExportToolbar({ onExport, disabled }) {
  return (
    <div className="export-toolbar">
      <button type="button" className="export-btn" disabled={disabled} onClick={() => onExport("csv")}>
        Excel (CSV)
      </button>
      <button
        type="button"
        className="export-btn export-btn--primary"
        disabled={disabled}
        onClick={() => onExport("html")}
      >
        PDF Report (HTML)
      </button>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabFromAdminUrl(location.pathname);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [data, setData] = useState(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [drillDept, setDrillDept] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [scrollTarget, setScrollTarget] = useState(null);

  const loadSummary = useCallback(async (monthKey = "") => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetchDashboardSummary(monthKey);
      setData({
        districtPI: Number(res?.districtPI || 0),
        totalKpis: Number(res?.totalKpis || 0),
        selectedMonth: res?.selectedMonth || null,
        suggestedMonth: res?.suggestedMonth || null,
        monthsAvailable: Array.isArray(res?.monthsAvailable) ? res.monthsAvailable : [],
        district: res?.district || null,
        reportingCycle: res?.reportingCycle || null,
        kpiStatusCounts: res?.kpiStatusCounts || EMPTY_DASHBOARD_DATA.kpiStatusCounts,
        departments: Array.isArray(res?.departments) ? res.departments : [],
        actionTracker: Array.isArray(res?.actionTracker) ? res.actionTracker : [],
        priorCommitments: Array.isArray(res?.priorCommitments) ? res.priorCommitments : [],
        dcHome: res?.dcHome || null,
        measurementModel: res?.measurementModel || null
      });
      if (!monthKey && res?.selectedMonth) {
        setSelectedMonth(res.selectedMonth);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setLoadError(err.message || "Failed to load dashboard. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveActionItem = useCallback(
    async (row, fields) => {
      if (!row.actionId) return;
      await updateActionItem(row.actionId, fields);
      await loadSummary(selectedMonth || "");
    },
    [loadSummary, selectedMonth]
  );

  const handleExport = async (format) => {
    setExporting(true);
    try {
      await downloadReviewExport(selectedMonth, format);
    } catch (err) {
      alert(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const monthsForDropdown = useMemo(
    () => (data.monthsAvailable.length > 0 ? data.monthsAvailable : getFiscalMonthKeys()),
    [data.monthsAvailable]
  );

  const sortedDepartments = useMemo(
    () => [...data.departments].sort((a, b) => b.score - a.score),
    [data.departments]
  );

  const navItems = useMemo(() => {
    const alerts = data.dcHome?.alerts;
    return ADMIN_NAV.map((item) => {
      if (item.id === "submissions" && alerts?.unsubmittedCount > 0) {
        return { ...item, badge: alerts.unsubmittedCount };
      }
      if (item.id === "target-followup" && alerts?.overdueTargetsCount > 0) {
        return { ...item, badge: alerts.overdueTargetsCount };
      }
      if (item.id === "action-tracker") {
        const n = data.actionTracker.length + data.priorCommitments.length;
        return n > 0 ? { ...item, badge: n } : item;
      }
      return item;
    });
  }, [data.dcHome?.alerts, data.actionTracker.length, data.priorCommitments.length]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    fetchContacts().catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedMonth !== data.selectedMonth) {
      loadSummary(selectedMonth);
    }
  }, [selectedMonth, data.selectedMonth, loadSummary]);

  const showMonthPicker = !["history", "submissions", "target-followup", "contacts"].includes(activeTab);
  const showHero = ["home", "overview"].includes(activeTab);
  const showExport = activeTab !== "history";
  const reviewMonth = data.dcHome?.reportingMonth || data.suggestedMonth || data.selectedMonth;
  const viewingPastMonth =
    activeTab === "home" &&
    reviewMonth &&
    data.selectedMonth &&
    data.selectedMonth !== reviewMonth;

  const displayMonth = selectedMonth || data.selectedMonth;

  const pageSubtitle = useMemo(() => {
    if (activeTab === "home" && displayMonth) {
      return `${toMonthLabel(displayMonth)} at a glance — score, departments, and what needs action`;
    }
    if (activeTab === "overview") {
      const n = data.departments.length || data.dcHome?.alerts?.totalDepartments || 0;
      return `${n} departments — tap any row for details`;
    }
    return DC_PAGE_GUIDE[activeTab];
  }, [activeTab, displayMonth, data.departments.length, data.dcHome?.alerts?.totalDepartments]);

  const handleNavChange = (tab, sectionId) => {
    navigate(adminPath(tab));
    if (sectionId) setScrollTarget(sectionId);
  };

  useEffect(() => {
    if (!scrollTarget || activeTab !== "home" || loading) return undefined;

    const timer = window.setTimeout(() => {
      const el = document.getElementById(scrollTarget);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("command-section--pulse");
        window.setTimeout(() => el.classList.remove("command-section--pulse"), 2200);
      }
      setScrollTarget(null);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [scrollTarget, activeTab, loading]);

  const handleLogout = () => {
    onLogout();
    navigate(PATHS.login, { replace: true });
  };

  return (
    <AppLayout
      brandTitle={data.district?.appTitle || "Performance Index"}
      brandSubtitle={data.district?.districtName || "District Commissioner"}
      user={user}
      onLogout={handleLogout}
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={handleNavChange}
      pageTitle={PAGE_TITLES[activeTab] || "Dashboard"}
      pageSubtitle={pageSubtitle}
      toolbar={
        <>
          {showMonthPicker && (
            <YearMonthPicker
              value={selectedMonth}
              monthsAvailable={monthsForDropdown}
              onChange={setSelectedMonth}
              label="Month"
            />
          )}
          {showExport && (
            <ExportToolbar onExport={handleExport} disabled={exporting} />
          )}
        </>
      }
    >
      {loading && activeTab !== "history" ? (
        <div className="loading">Loading dashboard…</div>
      ) : loadError && activeTab !== "history" ? (
        <EmptyState
          tone="warn"
          title="Could not load dashboard"
          subtitle={loadError}
        />
      ) : (
        <>
          {showHero && (
            <DistrictHero data={data} monthLabel={toMonthLabel(data.selectedMonth)} />
          )}

          {activeTab === "home" && (
            <DcCommandCenter
              dcHome={data.dcHome}
              selectedMonth={data.selectedMonth}
              reviewMonth={reviewMonth}
              viewingPastMonth={viewingPastMonth}
              departments={sortedDepartments}
              totalKpis={data.totalKpis}
              newRedCount={data.actionTracker.length}
              measurementModel={data.measurementModel}
              onNavigate={handleNavChange}
              onDrillDown={setDrillDept}
            />
          )}

          {activeTab === "submissions" && (
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">
                  Department submissions ({toMonthLabel(data.dcHome?.reportingMonth)})
                </h2>
                <p className="panel-hint">
                  {data.dcHome?.alerts?.submittedCount ?? 0}/
                  {data.dcHome?.alerts?.totalDepartments ?? 14} departments submitted for{" "}
                  {toMonthLabel(data.dcHome?.reportingMonth)}
                </p>
              </div>
              <div className="panel-content-inset">
                <SubmissionTrackerTable rows={data.dcHome?.submissionTracker || []} />
              </div>
            </div>
          )}

          {activeTab === "target-followup" && (
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Past targets</h2>
              </div>
              <div className="panel-body-inset panel-body-inset--flush">
                <TargetFollowUpPanel
                  items={data.dcHome?.targetFollowUp || []}
                  followUpMonth={data.dcHome?.followUpMonth}
                  onSave={saveActionItem}
                />
              </div>
            </div>
          )}

          {activeTab === "contacts" && <AdminContactsPanel />}

          {activeTab === "history" && (
            <AdminHistoryPanel
              summaryDepartments={data.departments}
              monthsAvailable={monthsForDropdown}
            />
          )}

          {activeTab === "overview" && (
            <>
              <ScoreExplainer compact />
              <KraHeatmapGrid
                departments={sortedDepartments}
                onSelect={setDrillDept}
                title={`${sortedDepartments.length} departments`}
                hint="Green ≥90 · Yellow 70–89 · Red <70 · Tap for details"
              />
              <div className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">Detailed table</h2>
                </div>
                <div className="panel-body-inset">
                  <OverviewDeptTable
                    departments={sortedDepartments}
                    onOpenTracker={() => handleNavChange("action-tracker")}
                    onDrillDown={setDrillDept}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "action-tracker" && (
            <>
              <div className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">
                    Below 70 — set targets ({toMonthLabel(data.selectedMonth)})
                  </h2>
                </div>
                {data.actionTracker.length === 0 ? (
                  <EmptyState
                    tone="ok"
                    title="No indicators below 70"
                    subtitle="All KPIs are on track this month."
                  />
                ) : (
                  <div className="panel-body-inset">
                    <ActionTrackerGrouped
                      rows={data.actionTracker}
                      variant="current"
                      onSave={saveActionItem}
                    />
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">
                    Prior commitments ({toMonthLabel(data.selectedMonth)})
                  </h2>
                </div>
                {data.priorCommitments.length === 0 ? (
                  <EmptyState
                    tone="ok"
                    title="No open prior commitments"
                    subtitle="All previous-month targets have been closed or met."
                  />
                ) : (
                  <div className="panel-body-inset">
                    <ActionTrackerGrouped
                      rows={data.priorCommitments}
                      variant="prior"
                      onSave={saveActionItem}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {drillDept && (
        <KraDrillDownModal
          dept={drillDept}
          monthKey={data.selectedMonth}
          onClose={() => setDrillDept(null)}
        />
      )}
    </AppLayout>
  );
}
