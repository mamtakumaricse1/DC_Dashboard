/**
 * DC target form — score or quarterly count, due date, action plan.
 * Used inside Action Tracker accordion for RED indicators.
 */
import React, { useState } from "react";
import OwnerContactMenu from "../OwnerContactMenu";

export default function ActionTargetForm({ row, onSave }) {
  const defaultTargetType = row.recommendedTargetType || row.targetType || "SCORE";
  const [actionOwner, setActionOwner] = useState(row.actionOwner || row.owner || "");
  const [actionPlan, setActionPlan] = useState(row.actionPlan || "");
  const [targetType, setTargetType] = useState(defaultTargetType);
  const [targetScore, setTargetScore] = useState(row.targetScore ?? "");
  const [targetActual, setTargetActual] = useState(row.targetActual ?? "");
  const [targetDate, setTargetDate] = useState(row.targetDate || "");
  const [saving, setSaving] = useState(false);
  const isQuarterly = targetType === "QUARTERLY";

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        action_owner: actionOwner,
        action_plan: actionPlan,
        target_date: targetDate || null,
        target_type: targetType,
        section: "CURRENT"
      };
      if (targetType === "QUARTERLY") {
        payload.target_actual = targetActual === "" ? null : Number(targetActual);
        payload.target_score = null;
        payload.target_quarter = row.targetQuarter || null;
      } else {
        payload.target_score = targetScore === "" ? null : Number(targetScore);
        payload.target_actual = null;
      }
      await onSave(row, payload);
    } catch (err) {
      alert(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="action-form-grid">
        <label className="form-field">
          <span className="form-label">Target type</span>
          <select
            className="action-input"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
          >
            <option value="SCORE">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>
        </label>
        <label className="form-field">
          <span className="form-label">DC asked for</span>
          {isQuarterly ? (
            <input
              className="action-input action-input-target"
              type="number"
              min="1"
              step="1"
              value={targetActual}
              onChange={(e) => setTargetActual(e.target.value)}
              placeholder="Enter target"
            />
          ) : (
            <input
              className="action-input action-input-target"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              placeholder="Enter target"
            />
          )}
        </label>
        <label className="form-field">
          <span className="form-label">Due by</span>
          <input
            className="action-input"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </label>
        <label className="form-field">
          <span className="form-label">Your score this month</span>
          <input
            className="action-input action-input-target"
            type="text"
            value={row.indicatorScore != null ? Number(row.indicatorScore).toFixed(1) : "—"}
            readOnly
            tabIndex={-1}
          />
        </label>
        <label className="form-field form-field--full">
          <span className="form-label">Action plan</span>
          <textarea
            className="action-textarea action-textarea--full"
            rows={3}
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
            placeholder="DC commitment and corrective steps"
          />
        </label>
        <label className="form-field form-field--full">
          <span className="form-label">Action owner</span>
          <input
            className="action-input action-input-wide"
            value={actionOwner}
            onChange={(e) => setActionOwner(e.target.value)}
            placeholder="HoD / responsible officer"
          />
        </label>
      </div>
      <div className="action-form-footer">
        <OwnerContactMenu deptId={row.deptId} indicator={row.indicator} preferUp />
        <button
          type="button"
          className="action-save-btn"
          onClick={handleSave}
          disabled={saving || !row.actionId}
        >
          {saving ? "Saving…" : "Save target"}
        </button>
      </div>
    </>
  );
}
