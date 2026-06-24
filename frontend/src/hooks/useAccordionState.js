import { useState } from "react";

/**
 * Accordion expand/collapse — only one row open at a time.
 * Used by Action Tracker (admin + dept views).
 */
export function useAccordionState() {
  const [expandedKey, setExpandedKey] = useState(null);

  const toggle = (key) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  const isExpanded = (key) => expandedKey === key;

  return { toggle, isExpanded };
}
