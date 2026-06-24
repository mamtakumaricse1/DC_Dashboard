import React, { useMemo } from "react";
import {
  buildMonthKey,
  CALENDAR_MONTHS,
  latestMonthKeyInYear,
  monthKeysForYear,
  parseMonthKey,
  yearsFromMonthKeys
} from "../utils/api";

/**
 * Year + month selectors for browsing historical TPI (e.g. May 2026 while in 2027).
 */
export default function YearMonthPicker({
  value,
  monthsAvailable = [],
  onChange,
  label = "View period"
}) {
  const { year, month } = parseMonthKey(value);
  const years = useMemo(
    () => yearsFromMonthKeys(monthsAvailable),
    [monthsAvailable]
  );
  const monthsWithData = useMemo(
    () => new Set(monthKeysForYear(monthsAvailable, year)),
    [monthsAvailable, year]
  );

  const handleYearChange = (nextYear) => {
    const y = Number(nextYear);
    const latest = latestMonthKeyInYear(monthsAvailable, y);
    const nextMonth = latest ? parseMonthKey(latest).month : month;
    onChange(buildMonthKey(y, nextMonth));
  };

  const handleMonthChange = (nextMonth) => {
    onChange(buildMonthKey(year, Number(nextMonth)));
  };

  return (
    <div className="year-month-picker">
      <span className="month-picker-label">{label}</span>
      <div className="year-month-picker-controls">
        <select
          className="month-select year-select"
          value={year}
          onChange={(e) => handleYearChange(e.target.value)}
          aria-label="Year"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="month-select month-select--name"
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          aria-label="Month"
        >
          {CALENDAR_MONTHS.map((m) => {
            const key = buildMonthKey(year, m.num);
            const hasData = monthsWithData.has(key);
            return (
              <option key={m.num} value={m.num}>
                {m.short}{hasData ? "" : " (no data)"}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
