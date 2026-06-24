/**
 * DC Command Center — home tab with alerts, heatmap, submissions, RED list.
 *
 * Data source: GET /api/dashboard/summary → payload.dcHome
 * Built by backend/services/dcHomeService.js → buildDcHomePayload()
 */
import React from "react";
import { toMonthLabel } from "../utils/api";
import KraHeatmapGrid from "./KraHeatmapGrid";
import DcWorkflowGuide from "./DcWorkflowGuide";
import MeasurementModelPanel from "./MeasurementModelPanel";
import AlertCard from "./commandCenter/AlertCard";
import RedDepartmentsPanel from "./commandCenter/RedDepartmentsPanel";
import TopRedIndicatorsTable from "./commandCenter/TopRedIndicatorsTable";

export default function DcCommandCenter({
  dcHome,
  selectedMonth,
  reviewMonth,
  viewingPastMonth = false,
  departments,
  totalKpis = 0,
  newRedCount = 0,
  measurementModel = null,
  onNavigate,
  onDrillDown
}) {
  if (!dcHome) return null;

  const {
    alerts,
    topRedIndicators,
    redDepartments,
    reportingMonth
  } = dcHome;

  return (
    <div className="command-center">
      {viewingPastMonth && (
        <div className="command-month-banner" role="status">
          Viewing <strong>{toMonthLabel(selectedMonth)}</strong>. Alerts below are for the current month (
          <strong>{toMonthLabel(reviewMonth || reportingMonth)}</strong>).
        </div>
      )}

      <DcWorkflowGuide
        reviewMonthLabel={toMonthLabel(reviewMonth || reportingMonth || selectedMonth)}
        onNavigate={onNavigate}
        alerts={alerts}
        stats={{
          totalDepartments: alerts?.totalDepartments ?? departments?.length ?? 0,
          totalKpis,
          newRedCount
        }}
      />

      <MeasurementModelPanel model={measurementModel} compact />

      <div id="command-heatmap" className="command-section">
        <KraHeatmapGrid
          departments={departments}
          onSelect={onDrillDown}
          title={`${alerts?.totalDepartments ?? departments?.length ?? 0} departments`}
          hint={`Green ≥90 · Yellow 70–89 · Red <70 · Tap for details · ${toMonthLabel(selectedMonth)}`}
        />
      </div>

      <div className="command-alerts">
        <AlertCard
          label="Not submitted yet"
          value={alerts?.unsubmittedCount ?? 0}
          tone="warn"
          actionHint="Open Submissions →"
          onClick={() => onNavigate("submissions")}
        />
        <AlertCard
          label="Targets overdue"
          value={alerts?.overdueTargetsCount ?? 0}
          tone="danger"
          actionHint="Open Past targets →"
          onClick={() => onNavigate("target-followup")}
        />
        <AlertCard
          label="Below 70"
          value={alerts?.redDeptCount ?? 0}
          tone="danger"
          actionHint="See below →"
          onClick={() => onNavigate("home", "command-red-depts")}
        />
        <AlertCard
          label="Submitted (on time + late)"
          value={`${alerts?.submittedCount ?? 0}/${alerts?.totalDepartments ?? 14}`}
          tone="ok"
          actionHint="Open Submissions →"
          onClick={() => onNavigate("submissions")}
        />
      </div>

      <div id="command-red-depts" className="command-section">
        <RedDepartmentsPanel
          redDepartments={redDepartments}
          selectedMonth={selectedMonth}
          onDrillDown={onDrillDown}
          onNavigate={onNavigate}
        />
      </div>

      <TopRedIndicatorsTable
        rows={topRedIndicators}
        limit={5}
        onViewAll={() => onNavigate("action-tracker")}
      />
    </div>
  );
}
