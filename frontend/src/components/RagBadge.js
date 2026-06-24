import React from "react";
import { ragStatusClass } from "../constants/tpi";

/** Consistent RAG pill used across tables, cards, and heatmap legend. */
export default function RagBadge({ status, children, className = "" }) {
  const label = children ?? status;
  if (!label) return null;
  return (
    <span className={`rag-badge ${ragStatusClass(status)} ${className}`.trim()}>
      {label}
    </span>
  );
}
