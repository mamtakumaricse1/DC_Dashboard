import React from "react";
import EmptyState from "./EmptyState";
import { formatDateTime } from "../utils/api";

const STATUS_CLASS = {
  SUBMITTED_ON_TIME: "sub-status--ok",
  SUBMITTED_LATE: "sub-status--late",
  PENDING: "sub-status--pending"
};

const STATUS_LABEL = {
  SUBMITTED_ON_TIME: "On time",
  SUBMITTED_LATE: "Late",
  PENDING: "Pending"
};

export default function SubmissionTrackerTable({ rows, compact = false }) {
  if (!rows?.length) {
    return (
      <EmptyState
        tone="ok"
        title="All departments submitted"
        subtitle="No pending or late filings for this reporting month."
        compact
      />
    );
  }

  return (
    <div className={`table-scroll ${compact ? "submission-table--compact" : ""}`}>
      <table className="tpi-table submission-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Department</th>
            {!compact && <th>KRA</th>}
            <th>Status</th>
            {!compact && <th>Submitted</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.deptId}>
              <td>{idx + 1}</td>
              <td className="kra">{row.deptName}</td>
              {!compact && <td>{row.kra}</td>}
              <td>
                <span className={`sub-status ${STATUS_CLASS[row.status] || ""}`}>
                  {row.statusLabel || STATUS_LABEL[row.status] || row.status}
                </span>
              </td>
              {!compact && (
                <td>{row.submittedAt ? formatDateTime(row.submittedAt) : "—"}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
