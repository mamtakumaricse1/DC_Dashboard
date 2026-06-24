import React from "react";
import { targetExplainer } from "../../constants/deptKpiUx";
import { formatActualDisplay, formatTargetDisplay } from "../../utils/formatKpi";

/** Read-only target summary — same fields across dept and DC action tracker rows. */
export default function ActionTargetDetailGrid({
  row,
  variant = "current",
  scoreLabel = "Your score this month"
}) {
  const typeInfo = targetExplainer(row.targetType || row.recommendedTargetType || "SCORE");

  if (variant === "prior") {
    return (
      <div className="prior-readonly-grid">
        <div className="detail-field">
          <span className="detail-label">Target type</span>
          <span className="detail-value">{typeInfo.label}</span>
        </div>
        <div className="detail-field">
          <span className="detail-label">DC asked for</span>
          <span className="detail-value">{formatTargetDisplay(row)}</span>
        </div>
        <div className="detail-field">
          <span className="detail-label">Due by</span>
          <span className="detail-value">{row.targetDate || "—"}</span>
        </div>
        <div className="detail-field">
          <span className="detail-label">{scoreLabel}</span>
          <span className="detail-value">{formatActualDisplay(row)}</span>
        </div>
        <div className="detail-field detail-field--wide">
          <span className="detail-label">Action plan</span>
          <span className="detail-value">{row.actionPlan || "—"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="prior-readonly-grid">
      <div className="detail-field">
        <span className="detail-label">Target type</span>
        <span className="detail-value">{typeInfo.label}</span>
      </div>
      <div className="detail-field">
        <span className="detail-label">DC asked for</span>
        <span className="detail-value">{formatTargetDisplay(row)}</span>
      </div>
      <div className="detail-field">
        <span className="detail-label">Due by</span>
        <span className="detail-value">{row.targetDate || "—"}</span>
      </div>
      <div className="detail-field">
        <span className="detail-label">{scoreLabel}</span>
        <span className="detail-value">
          {row.indicatorScore != null ? Number(row.indicatorScore).toFixed(1) : "—"}
        </span>
      </div>
      <div className="detail-field detail-field--wide">
        <span className="detail-label">Action plan</span>
        <span className="detail-value">{row.actionPlan || "—"}</span>
      </div>
    </div>
  );
}
