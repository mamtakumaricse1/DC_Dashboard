/**
 * Department (HoD) portal — action tracker + monthly data submission.
 *
 * Structure:
 *   hooks/useDeptDashboardSummary  — dashboard API + month picker state
 *   hooks/useDeptKpiSubmission       — KPI load, form state, submit
 *   components/kpiEntry/*            — submission UI
 *   components/KpiStatusSummary      — RAG count cards
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PATHS, deptPath, tabFromDeptUrl } from "../routes/paths";
import "./AdminDashboard.css";
import "./DeptDashboard.css";
import "../components/AppLayout.css";
import AppLayout from "../components/AppLayout";
import EmptyState from "../components/EmptyState";
import YearMonthPicker from "../components/YearMonthPicker";
import DeptKpiGuide from "../components/DeptKpiGuide";
import KpiStatusSummary from "../components/KpiStatusSummary";
import DataSubmissionPanel from "../components/kpiEntry/DataSubmissionPanel";
import { DeptActionReadOnlyItem, useAccordionState } from "../components/ActionTrackerTables";
import { toMonthLabel } from "../utils/api";
import useDeptDashboardSummary from "../hooks/useDeptDashboardSummary";
import useDeptKpiSubmission from "../hooks/useDeptKpiSubmission";
import { DEPT_PAGE_GUIDE } from "../constants/tpi";

const DEPT_NAV = [
  { id: "data-submission", label: "Enter data" },
  { id: "action-tracker", label: "Action Tracker" }
];

const PAGE_TITLES = {
  "data-submission": "Enter data",
  "action-tracker": "Action Tracker"
};

export default function DeptDashboard({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabFromDeptUrl(location.pathname);
  const deptId = user?.dept_id;

  const {
    selectedMonth,
    loading,
    loadError,
    summary,
    reportingCycle,
    district,
    activeMonth,
    loadSummary
  } = useDeptDashboardSummary(deptId);

  const [localReportingCycle, setLocalReportingCycle] = useState(null);
  const [localDistrict, setLocalDistrict] = useState(null);

  const handleKpiMeta = useCallback(({ reportingCycle: rc, district: d }) => {
    if (rc) setLocalReportingCycle(rc);
    if (d) setLocalDistrict(d);
  }, []);

  const {
    kpis,
    field1Values,
    field2Values,
    singleValues,
    setField1,
    setField2,
    setSingle,
    submission,
    loadError: kpiLoadError,
    saving,
    submitFeedback,
    loadKpis,
    submit
  } = useDeptKpiSubmission(deptId, {
    onReportingCycle: handleKpiMeta,
    onSubmitted: (monthKey) => loadSummary(monthKey).then(() => loadKpis())
  });

  const currentAccordion = useAccordionState();
  const priorAccordion = useAccordionState();
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (activeTab === "data-submission") loadKpis();
  }, [activeTab, loadKpis]);

  const dept = summary.department;
  const cycle = localReportingCycle || reportingCycle;
  const districtConfig = localDistrict || district;
  const actionBadge = summary.actionTracker.length + summary.priorCommitments.length;

  const navItems = useMemo(
    () =>
      DEPT_NAV.map((item) =>
        item.id === "action-tracker" ? { ...item, badge: actionBadge } : item
      ),
    [actionBadge]
  );

  const handleNavChange = (tab) => navigate(deptPath(tab));
  const handleLogout = () => {
    onLogout();
    navigate(PATHS.login, { replace: true });
  };

  return (
    <AppLayout
      brandTitle={dept?.name || deptId || "Department"}
      brandSubtitle={districtConfig?.districtName || dept?.kra || "Department portal"}
      user={user}
      onLogout={handleLogout}
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={handleNavChange}
      pageTitle={PAGE_TITLES[activeTab]}
      pageSubtitle={DEPT_PAGE_GUIDE[activeTab]}
      toolbar={
        <>
          <button
            type="button"
            className="action-save-btn dept-guide-btn"
            onClick={() => setGuideOpen(true)}
            title="What each KPI means and how to enter data"
          >
            KPI Guide
          </button>
          {activeTab === "action-tracker" && summary.monthsAvailable?.length > 0 ? (
            <YearMonthPicker
              value={selectedMonth || summary.selectedMonth}
              monthsAvailable={summary.monthsAvailable}
              onChange={(mk) => {
                loadSummary(mk);
              }}
              label="Month"
            />
          ) : activeMonth ? (
            <div className="month-picker month-picker--locked">
              <span className="month-picker-label">Month</span>
              <span className="month-locked-value">{toMonthLabel(activeMonth)}</span>
            </div>
          ) : null}
        </>
      }
    >
      {guideOpen && (
        <DeptKpiGuide deptId={deptId} onClose={() => setGuideOpen(false)} />
      )}
      {loading ? (
        <div className="loading">Loading…</div>
      ) : loadError ? (
        <EmptyState tone="warn" title="Could not load department data" subtitle={loadError} />
      ) : (
        <>
          <KpiStatusSummary dept={dept} counts={summary.kpiStatusCounts} />

          {activeTab === "action-tracker" ? (
            <>
              <div className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">
                    Active targets ({toMonthLabel(selectedMonth || summary.selectedMonth)})
                  </h2>
                </div>
                {summary.actionTracker.length === 0 ? (
                  <div className="accordion-empty">No targets this month.</div>
                ) : (
                  <div className="accordion-list accordion-list--inset">
                    {summary.actionTracker.map((row, idx) => {
                      const key = `dept-current-${idx}`;
                      return (
                        <DeptActionReadOnlyItem
                          key={key}
                          row={row}
                          idx={idx}
                          variant="current"
                          expanded={currentAccordion.isExpanded(key)}
                          onToggle={() => currentAccordion.toggle(key)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">Earlier targets</h2>
                </div>
                {summary.priorCommitments.length === 0 ? (
                  <div className="accordion-empty">No open prior commitments.</div>
                ) : (
                  <div className="accordion-list accordion-list--inset">
                    {summary.priorCommitments.map((row, idx) => {
                      const key = `dept-prior-${idx}`;
                      return (
                        <DeptActionReadOnlyItem
                          key={key}
                          row={row}
                          idx={idx}
                          variant="prior"
                          expanded={priorAccordion.isExpanded(key)}
                          onToggle={() => priorAccordion.toggle(key)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <DataSubmissionPanel
              activeMonth={activeMonth}
              kpis={kpis}
              field1Values={field1Values}
              field2Values={field2Values}
              singleValues={singleValues}
              onField1Change={setField1}
              onField2Change={setField2}
              onSingleChange={setSingle}
              submission={submission}
              reportingCycle={cycle}
              loadError={kpiLoadError}
              saving={saving}
              submitFeedback={submitFeedback}
              onSubmit={() => submit(selectedMonth || activeMonth)}
            />
          )}
        </>
      )}
    </AppLayout>
  );
}
