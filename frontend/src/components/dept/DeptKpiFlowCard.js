import React, { useState } from "react";
import { DEPT_ENTRY_STEPS } from "../../constants/deptKpiUx";

/** Collapsible short guide on the Enter data tab — hidden by default. */
export default function DeptKpiFlowCard({ monthLabel }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`dept-flow-card ${open ? "dept-flow-card--open" : ""}`}>
      <div className="dept-flow-card-head">
        <div>
          <h2 className="dept-flow-card-title">Quick guide</h2>
          <p className="dept-flow-card-sub">
            Filing for <strong>{monthLabel}</strong>
          </p>
        </div>
        <button
          type="button"
          className="dept-flow-card-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <ol className="dept-flow-steps">
          {DEPT_ENTRY_STEPS.map((step, i) => (
            <li key={step.title} className="dept-flow-step">
              <span className="dept-flow-step-num">{i + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
