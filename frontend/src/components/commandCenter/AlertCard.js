import React from "react";

/** Clickable metric card on DC Command Center (navigates to relevant tab). */
export default function AlertCard({ label, value, tone, actionHint, onClick }) {
  return (
    <button
      type="button"
      className={`alert-card alert-card--${tone}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="alert-card-value">{value}</span>
      <span className="alert-card-label">{label}</span>
      {actionHint && <span className="alert-card-action">{actionHint}</span>}
    </button>
  );
}
