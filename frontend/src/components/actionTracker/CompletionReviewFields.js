/**
 * Shared completion review fields for prior-month DC targets.
 * Used in ActionTrackerPriorItem and TargetFollowUpPanel.
 */
import React, { useState } from "react";
import { COMPLETION_STATUS_OPTIONS } from "../../constants/tpi";

export default function CompletionReviewFields({
  row,
  onSave,
  section = "PRIOR",
  saveLabel = "Save review",
  layout = "grid"
}) {
  const [completionStatus, setCompletionStatus] = useState(row.completionStatus || "PENDING");
  const [dcRemarks, setDcRemarks] = useState(row.dcRemarks || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!row.actionId) return;
    setSaving(true);
    try {
      await onSave(row, {
        completion_status: completionStatus,
        dc_remarks: dcRemarks,
        section
      });
    } catch (err) {
      alert(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (layout === "inline") {
    return (
      <>
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
        <input
          className="target-inline-input"
          type="text"
          value={dcRemarks}
          onChange={(e) => setDcRemarks(e.target.value)}
          placeholder="Remarks"
          aria-label="DC remarks"
        />
        <button
          type="button"
          className="target-save-btn"
          onClick={handleSave}
          disabled={saving || !row.actionId}
        >
          {saving ? "…" : "Save"}
        </button>
      </>
    );
  }

  return (
    <div className="action-form-grid">
      <label className="form-field">
        <span className="form-label">Completion status</span>
        <select
          className="action-input action-input-wide"
          value={completionStatus}
          onChange={(e) => setCompletionStatus(e.target.value)}
        >
          {COMPLETION_STATUS_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </label>
      <label className="form-field form-field--full">
        <span className="form-label">DC remarks</span>
        <input
          className="action-input action-input-wide"
          value={dcRemarks}
          onChange={(e) => setDcRemarks(e.target.value)}
          placeholder="Review notes"
        />
      </label>
      <div className="action-form-footer">
        <button
          type="button"
          className="action-save-btn"
          onClick={handleSave}
          disabled={saving || !row.actionId}
        >
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
