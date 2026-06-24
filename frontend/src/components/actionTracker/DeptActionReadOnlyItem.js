import React from "react";
import { targetExplainer } from "../../constants/deptKpiUx";
import { toMonthLabel } from "../../utils/api";
import { formatTargetDisplay } from "../../utils/formatKpi";
import { AccordionShell } from "./ActionAccordion";
import ActionTargetDetailGrid from "./ActionTargetDetailGrid";

/** Department portal — HoD sees DC targets but cannot edit. */
export default function DeptActionReadOnlyItem({ row, idx, expanded, onToggle, variant = "current" }) {
  const typeInfo = targetExplainer(row.targetType || "SCORE");

  const summary =
    variant === "current" ? (
      <>
        <span className="action-trigger-indicator top-red">{row.indicator}</span>
        <span className="action-trigger-score">{Number(row.indicatorScore || 0).toFixed(1)}</span>
        <span className="action-trigger-meta">
          {typeInfo.label}: {formatTargetDisplay(row)}
        </span>
      </>
    ) : (
      <>
        <span className="action-trigger-month">{toMonthLabel(row.originMonth)}</span>
        <span className="action-trigger-indicator top-red">{row.indicator}</span>
        <span className="action-trigger-meta">{row.completionStatus}</span>
      </>
    );

  return (
    <AccordionShell idx={idx} summary={summary} expanded={expanded} onToggle={onToggle}>
      <ActionTargetDetailGrid
        row={row}
        variant={variant === "prior" ? "prior" : "current"}
        scoreLabel={variant === "prior" ? "Score when reviewed" : "Your score this month"}
      />
    </AccordionShell>
  );
}
