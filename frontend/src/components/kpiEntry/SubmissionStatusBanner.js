/**
 * Submission deadline / status banner above the KPI entry table.
 */
import React from "react";
import { formatDateTime } from "../../utils/api";

export default function SubmissionStatusBanner({
  submission,
  reportingCycle,
  loadError
}) {
  return (
    <>
      {loadError && (
        <p className="panel-hint dept-guide-error" role="alert">{loadError}</p>
      )}
      {submission?.exists ? (
        <p className="panel-hint submission-banner submission-banner-update">
          Submitted {formatDateTime(submission.submittedAt)}
          {submission.isLate && <> · <strong>Late submission</strong></>}
          {submission.updatedAt && submission.updatedAt !== submission.submittedAt && (
            <> · Updated {formatDateTime(submission.updatedAt)}</>
          )}
          . Revise below and click Update submission.
        </p>
      ) : (
        reportingCycle?.submissionWindow?.deadlineLabel && (
          <p className="panel-hint">
            Deadline: {reportingCycle.submissionWindow.deadlineLabel}
          </p>
        )
      )}
      {submission?.windowStatus && (
        <div
          className={`submission-status ${
            submission.windowStatus.code === "SUBMITTED_LATE"
              ? "submission-status--late"
              : submission.windowStatus.code === "SUBMITTED_ON_TIME"
                ? "submission-status--ok"
                : "submission-status--open"
          }`}
        >
          {submission.windowStatus.label}
        </div>
      )}
    </>
  );
}
