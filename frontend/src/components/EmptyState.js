import React from "react";

const ICONS = {
  ok: "✓",
  info: "○",
  warn: "!"
};

/** Friendly empty / all-clear message with icon. */
export default function EmptyState({
  tone = "info",
  title,
  subtitle,
  compact = false
}) {
  return (
    <div className={`empty-state empty-state--${tone}${compact ? " empty-state--compact" : ""}`}>
      <span className="empty-state-icon" aria-hidden="true">
        {ICONS[tone] || ICONS.info}
      </span>
      <p className="empty-state-title">{title}</p>
      {subtitle && <p className="empty-state-sub">{subtitle}</p>}
    </div>
  );
}
