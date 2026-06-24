import React from "react";

import { dueStatusClass, ragStatusClass } from "../../constants/tpi";
import { formatTargetDisplay } from "../../utils/formatKpi";

import { AccordionShell } from "./ActionAccordion";
import ActionTargetForm from "./ActionTargetForm";

/** DC Action Tracker row — RED indicator with target-setting form. */
export default function ActionTrackerCurrentItem({ row, idx, expanded, onToggle, onSave }) {
  const summary = (
    <>
      <span className="action-trigger-kra">{row.kra}</span>
      <span className="action-trigger-indicator top-red">{row.indicator}</span>
      <span className="action-trigger-score">{Number(row.indicatorScore || 0).toFixed(1)}</span>
      <span className={`action-trigger-status ${ragStatusClass(row.status)}`}>{row.status}</span>
      {(row.targetScore != null || row.targetActual != null) && (
        <span className="action-trigger-meta">Target: {formatTargetDisplay(row)}</span>
      )}
      {row.dueLabel && (
        <span className={dueStatusClass(row.dueStatus)}>{row.dueLabel}</span>
      )}
    </>
  );

  return (
    <AccordionShell idx={idx} summary={summary} expanded={expanded} onToggle={onToggle}>
      <ActionTargetForm row={row} onSave={onSave} />
    </AccordionShell>
  );
}
