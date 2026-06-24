import React, { useState } from "react";

const STEPS = [
  {
    id: "submissions",
    title: "Check submissions",
    body: "See which departments filed last month's data and who is late.",
    tab: "submissions"
  },
  {
    id: "review-red",
    title: "Review RED areas",
    body: "Open the heatmap or “Who is RED?” — tap a department for KPI details.",
    tab: "home",
    scrollTo: "command-red-depts"
  },
  {
    id: "targets",
    title: "Set targets for new REDs",
    body: "In Set targets, assign owner, target, and action plan.",
    tab: "action-tracker"
  },
  {
    id: "followup",
    title: "Review past targets",
    body: "Past targets shows what departments achieved vs what you asked for.",
    tab: "target-followup"
  },
  {
    id: "contacts",
    title: "Contact HoDs if needed",
    body: "Use Contacts for phone / WhatsApp when a department needs a reminder.",
    tab: "contacts"
  }
];

function stepBody(step, stats) {
  const deptCount = stats.totalDepartments || 0;
  const kpiCount = stats.totalKpis || 0;

  if (step.id === "review-red" && deptCount > 0) {
    return `Open the heatmap or “Who is RED?” across ${deptCount} departments — tap a department for KPI details (${kpiCount} indicators district-wide).`;
  }
  if (step.id === "targets" && stats.newRedCount > 0) {
    return `In Set targets, assign targets for ${stats.newRedCount} indicator(s) below 70.`;
  }
  return step.body;
}

export default function DcWorkflowGuide({
  reviewMonthLabel,
  onNavigate,
  alerts = {},
  stats = {}
}) {
  const [collapsed, setCollapsed] = useState(true);

  const badgeFor = (stepId) => {
    if (stepId === "submissions" && (alerts.unsubmittedCount ?? 0) > 0) {
      return alerts.unsubmittedCount;
    }
    if (stepId === "followup" && (alerts.overdueTargetsCount ?? 0) > 0) {
      return alerts.overdueTargetsCount;
    }
    if (stepId === "review-red" && (alerts.redDeptCount ?? 0) > 0) {
      return alerts.redDeptCount;
    }
    if (stepId === "targets" && (stats.newRedCount ?? 0) > 0) {
      return stats.newRedCount;
    }
    return null;
  };

  return (
    <div className={`dc-workflow ${collapsed ? "dc-workflow--collapsed" : ""}`}>
      <div className="dc-workflow-head">
        <div>
          <h2 className="dc-workflow-title">Monthly checklist</h2>
          <p className="dc-workflow-sub">
            Reviewing <strong>{reviewMonthLabel}</strong> — optional step-by-step guide.
          </p>
        </div>
        <button
          type="button"
          className="dc-workflow-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
        >
          {collapsed ? "Show guide" : "Hide guide"}
        </button>
      </div>
      {!collapsed && (
        <ol className="dc-workflow-steps">
          {STEPS.map((step, idx) => {
            const badge = badgeFor(step.id);
            return (
              <li key={step.id} className="dc-workflow-step">
                <span className="dc-workflow-num">{idx + 1}</span>
                <div className="dc-workflow-step-body">
                  <strong>{step.title}</strong>
                  <p>{stepBody(step, stats)}</p>
                </div>
                <button
                  type="button"
                  className="dc-workflow-go"
                  onClick={() => onNavigate(step.tab, step.scrollTo)}
                >
                  Open{badge != null ? ` (${badge})` : ""} →
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
