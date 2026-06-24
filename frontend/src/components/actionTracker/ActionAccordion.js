import React from "react";

/** Shared expand/collapse shell for action tracker rows. */
export function AccordionShell({ idx, summary, expanded, onToggle, children }) {
  return (
    <div className={`accordion-item ${expanded ? "expanded" : ""}`}>
      <button
        type="button"
        className="accordion-trigger action-trigger"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="accordion-chevron" aria-hidden="true">
          {expanded ? "▼" : "▶"}
        </span>
        <span className="action-trigger-idx">{idx + 1}</span>
        {summary}
      </button>
      {expanded && <div className="accordion-body action-form-body">{children}</div>}
    </div>
  );
}
