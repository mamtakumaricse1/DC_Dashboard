import React, { useState } from "react";
import EmptyState from "./EmptyState";
import {
  COMPLETION_STATUS_OPTIONS,
  deviationClass,
  dueStatusClass
} from "../constants/tpi";
import { toMonthLabel } from "../utils/api";
import { formatActualDisplay, formatTargetDisplay } from "../utils/formatKpi";
import OwnerContactMenu from "./OwnerContactMenu";

function FollowUpRow({ row, idx, onSave }) {
  const [completionStatus, setCompletionStatus] = useState(row.completionStatus || "PENDING");
  const [dcRemarks, setDcRemarks] = useState(row.dcRemarks || "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const deviation = row.deviation != null ? Number(row.deviation) : null;

  const handleSave = async () => {
    if (!row.actionId) return;
    setSaving(true);
    try {
      await onSave(row, {
        completion_status: completionStatus,
        dc_remarks: dcRemarks,
        section: "PRIOR"
      });
    } catch (err) {
      alert(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <tr className={expanded ? "target-row-expanded" : ""}>
        <td>{idx + 1}</td>
        <td className="kra target-kra-cell">{row.kra}</td>
        <td className="top-red target-indicator-cell" title={row.indicator}>
          {row.indicator}
        </td>
        <td>{toMonthLabel(row.originMonth)}</td>
        <td className="target-num">{formatTargetDisplay(row)}</td>
        <td className="target-num">{formatActualDisplay(row)}</td>
        <td className={`target-num ${deviationClass(deviation)}`}>
          {deviation != null ? `${deviation > 0 ? "+" : ""}${deviation.toFixed(1)}` : "—"}
        </td>
        <td>{row.targetDate || "—"}</td>
        <td>
          <span className={dueStatusClass(row.dueStatus)}>{row.dueLabel || "—"}</span>
        </td>
        <td>
          <select
            className="target-inline-select"
            value={completionStatus}
            onChange={(e) => setCompletionStatus(e.target.value)}
            aria-label="Completion status"
          >
            {COMPLETION_STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </td>
        <td>
          <input
            className="target-inline-input"
            type="text"
            value={dcRemarks}
            onChange={(e) => setDcRemarks(e.target.value)}
            placeholder="Remarks"
            aria-label="DC remarks"
          />
        </td>
        <td className="target-actions-cell">
          <button
            type="button"
            className="target-save-btn"
            onClick={handleSave}
            disabled={saving || !row.actionId}
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            type="button"
            className="target-detail-btn"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            title="Action plan"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="target-detail-row">
          <td colSpan={12}>
            <div className="target-detail-grid">
              <div>
                <span className="detail-label">Action owner</span>
                <span className="detail-value">{row.actionOwner || row.owner || "—"}</span>
                <OwnerContactMenu
                  deptId={row.deptId}
                  indicator={row.indicator}
                  compact
                />
              </div>
              <div className="target-detail-wide">
                <span className="detail-label">DC action plan</span>
                <span className="detail-value">{row.actionPlan || "—"}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function TargetFollowUpPanel({ items, followUpMonth, onSave }) {
  if (!items?.length) {
    return (
      <EmptyState
        tone="ok"
        title="No targets due for follow-up"
        subtitle="There are no open commitments to review this period."
      />
    );
  }

  return (
    <div className="target-followup-wrap">
      <div className="table-scroll">
        <table className="tpi-table target-followup-table">
          <thead>
            <tr>
              <th>#</th>
              <th>KRA</th>
              <th>Indicator</th>
              <th>From</th>
              <th title="DC commitment">Target</th>
              <th title="Latest achieved value">Achieved</th>
              <th title="Achieved − target">Gap</th>
              <th>Due date</th>
              <th>Due</th>
              <th>Completion</th>
              <th>DC remarks</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => (
              <FollowUpRow
                key={row.actionId || `follow-${idx}`}
                row={row}
                idx={idx}
                onSave={onSave}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
