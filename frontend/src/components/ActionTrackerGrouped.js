import React, { useMemo, useState } from "react";
import {
  ActionTrackerCurrentItem,
  ActionTrackerPriorItem
} from "./ActionTrackerTables";
function groupRows(rows) {
  const map = new Map();
  rows.forEach((row, index) => {
    const key = row.deptId || row.kra || `row-${index}`;
    if (!map.has(key)) {
      map.set(key, {
        deptId: row.deptId,
        kra: row.kra,
        owner: row.owner || row.actionOwner,
        items: []
      });
    }
    map.get(key).items.push({ row, index });
  });
  return [...map.values()].sort((a, b) => a.kra.localeCompare(b.kra));
}

function DeptGroup({
  group,
  variant,
  expandedDept,
  expandedItem,
  onToggleDept,
  onToggleItem,
  onSave
}) {
  const deptKey = group.deptId || group.kra;
  const deptOpen = expandedDept === deptKey;
  return (
    <div className={`dept-group ${deptOpen ? "dept-group--open" : ""}`}>
      <button
        type="button"
        className="dept-group-trigger"
        onClick={() => onToggleDept(deptKey)}
        aria-expanded={deptOpen}
      >
        <span className="accordion-chevron" aria-hidden="true">
          {deptOpen ? "▼" : "▶"}
        </span>
        <span className="dept-group-kra">{group.kra}</span>
        <span className="dept-group-count">{group.items.length} indicator(s)</span>
      </button>
      {deptOpen && (
        <div className="dept-group-body accordion-list">
          {group.items.map(({ row, index }) => {
            const itemKey = row.actionId || `${variant}-${deptKey}-${index}`;
            const Item = variant === "current" ? ActionTrackerCurrentItem : ActionTrackerPriorItem;
            return (
              <Item
                key={itemKey}
                row={row}
                idx={index}
                expanded={expandedItem === itemKey}
                onToggle={() => onToggleItem(itemKey)}
                onSave={onSave}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Action tracker grouped by department — less scrolling for DC review.
 */
export default function ActionTrackerGrouped({ rows, variant = "current", onSave }) {
  const groups = useMemo(() => groupRows(rows), [rows]);
  const [expandedDept, setExpandedDept] = useState(groups[0]?.deptId || groups[0]?.kra || null);
  const [expandedItem, setExpandedItem] = useState(null);

  const toggleDept = (key) => {
    setExpandedDept((prev) => (prev === key ? null : key));
    setExpandedItem(null);
  };

  const toggleItem = (key) => {
    setExpandedItem((prev) => (prev === key ? null : key));
  };

  return (
    <div className="dept-group-list">
      {groups.map((group) => (
        <DeptGroup
          key={group.deptId || group.kra}
          group={group}
          variant={variant}
          expandedDept={expandedDept}
          expandedItem={expandedItem}
          onToggleDept={toggleDept}
          onToggleItem={toggleItem}
          onSave={onSave}
        />
      ))}
    </div>
  );
}
