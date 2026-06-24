import React from "react";
import { toMonthLabel } from "../../utils/api";
import EmptyState from "../EmptyState";
import SubmissionTrackerTable from "../SubmissionTrackerTable";

/** Departments that have not filed data for the active reporting month. */
export default function PendingSubmissionsPanel({ pending, reportingMonth }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          Who hasn&apos;t submitted? ({toMonthLabel(reportingMonth)})
        </h2>
      </div>
      <div className="panel-body-inset">
        {pending.length === 0 ? (
          <EmptyState
            tone="ok"
            title="All departments submitted"
            subtitle="Every department filed data for this reporting month."
            compact
          />
        ) : (
          <SubmissionTrackerTable rows={pending} compact />
        )}
      </div>
    </div>
  );
}
