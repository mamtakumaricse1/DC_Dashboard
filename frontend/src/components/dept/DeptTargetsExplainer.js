import React, { useState } from "react";
import { DEPT_TARGET_TYPES } from "../../constants/deptKpiUx";

/** Explains Monthly vs Quarterly DC targets on the Action Tracker tab. */
export default function DeptTargetsExplainer() {
  const [open, setOpen] = useState(true);

  return (
    <div className={`dept-flow-card dept-targets-explainer ${open ? "dept-flow-card--open" : ""}`}>
      <div className="dept-flow-card-head">
        <div>
          <h2 className="dept-flow-card-title">When DC sets a target — what happens?</h2>
          <p className="dept-flow-card-sub">
            Pick a month above to see scores and targets for that period.
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
        <div className="dept-target-type-grid">
          {Object.values(DEPT_TARGET_TYPES).map((t) => (
            <article key={t.label} className="dept-target-type-card">
              <h3>{t.label}</h3>
              <p className="dept-target-type-example">{t.setExample}</p>
              <dl className="dept-target-type-dl">
                <div>
                  <dt>How DC checks</dt>
                  <dd>{t.howChecked}</dd>
                </div>
                <div>
                  <dt>Your job</dt>
                  <dd>{t.yourJob}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
