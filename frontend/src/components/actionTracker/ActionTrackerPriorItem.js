import React from "react";

import { deviationClass, dueStatusClass } from "../../constants/tpi";
import { toMonthLabel } from "../../utils/api";

import { AccordionShell } from "./ActionAccordion";
import ActionTargetDetailGrid from "./ActionTargetDetailGrid";
import CompletionReviewFields from "./CompletionReviewFields";

/** DC reviews whether a prior-month target was met. */
export default function ActionTrackerPriorItem({ row, idx, expanded, onToggle, onSave }) {
  const deviation = row.deviation != null ? Number(row.deviation) : null;

  const summary = (
    <>
      <span className="action-trigger-month">{toMonthLabel(row.originMonth)}</span>
      <span className="action-trigger-kra">{row.kra}</span>
      <span className="action-trigger-indicator top-red">{row.indicator}</span>
      <span className={`action-trigger-deviation ${deviationClass(deviation)}`}>
        {deviation != null ? `${deviation > 0 ? "+" : ""}${deviation.toFixed(1)}` : "—"}
      </span>
      <span className="action-trigger-meta">{row.completionStatus}</span>
      {row.dueLabel && (
        <span className={dueStatusClass(row.dueStatus)}>{row.dueLabel}</span>
      )}
    </>
  );

  return (
    <AccordionShell idx={idx} summary={summary} expanded={expanded} onToggle={onToggle}>
      <ActionTargetDetailGrid row={row} variant="prior" scoreLabel="Score when reviewed" />
      <CompletionReviewFields row={row} onSave={onSave} />
    </AccordionShell>
  );
}
