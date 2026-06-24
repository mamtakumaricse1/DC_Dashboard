/**
 * Full data-submission panel — progress, entry rows, submit.
 */
import React, { useMemo, useState } from "react";
import { toMonthLabel } from "../../utils/api";
import { countFilledKpis } from "../../utils/kpiEntry";
import { DEPT_ENTRY_STEPS } from "../../constants/deptKpiUx";
import KpiEntryTable from "./KpiEntryTable";
import SubmissionStatusBanner from "./SubmissionStatusBanner";

export default function DataSubmissionPanel({
  activeMonth,
  kpis,
  field1Values,
  field2Values,
  singleValues,
  onField1Change,
  onField2Change,
  onSingleChange,
  submission,
  reportingCycle,
  loadError,
  saving,
  submitFeedback,
  onSubmit
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const monthLabel = toMonthLabel(activeMonth);
  const filled = useMemo(
    () => countFilledKpis(kpis, field1Values, field2Values, singleValues),
    [kpis, field1Values, field2Values, singleValues]
  );
  const total = kpis.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  return (
    <div className="panel dept-entry-panel">
      <div className="panel-header dept-entry-header">
        <div className="dept-entry-header-text">
          <h2 className="panel-title">{monthLabel}</h2>
          <p className="dept-entry-subtitle">
            {filled} of {total} filled · enter both counts per row
          </p>
        </div>
        <div className="dept-entry-header-actions">
          <button
            type="button"
            className="dept-entry-help-btn"
            onClick={() => setHelpOpen((v) => !v)}
            aria-expanded={helpOpen}
          >
            {helpOpen ? "Hide help" : "Need help?"}
          </button>
          <SubmissionStatusBanner
            submission={submission}
            reportingCycle={reportingCycle}
            loadError={loadError}
          />
        </div>
      </div>

      {helpOpen && (
        <div className="dept-entry-help">
          <ol className="dept-entry-help-steps">
            {DEPT_ENTRY_STEPS.map((step, i) => (
              <li key={step.title}>
                <strong>{i + 1}. {step.title}</strong> {step.body}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="dept-entry-progress" aria-label="Entry progress">
        <div className="dept-entry-progress-track">
          <div className="dept-entry-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="dept-entry-body">
        <KpiEntryTable
          kpis={kpis}
          field1Values={field1Values}
          field2Values={field2Values}
          singleValues={singleValues}
          onField1Change={onField1Change}
          onField2Change={onField2Change}
          onSingleChange={onSingleChange}
        />
      </div>

      <div className="entry-actions">
        {submitFeedback && (
          <p
            className={`dept-submit-feedback dept-submit-feedback--${submitFeedback.tone}`}
            role="status"
          >
            {submitFeedback.message}
          </p>
        )}
        <button
          type="button"
          className="submit-btn"
          onClick={onSubmit}
          disabled={saving || kpis.length === 0}
        >
          {saving
            ? "Saving…"
            : submission?.exists
              ? "Update submission"
              : "Submit all indicators"}
        </button>
      </div>
    </div>
  );
}
