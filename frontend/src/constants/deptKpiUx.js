/**
 * Plain-language copy for department KPI entry and DC targets.
 */

export const DEPT_ENTRY_STEPS = [
  {
    title: "Which month?",
    body: "You file the previous calendar month only. Example: in June you enter May figures."
  },
  {
    title: "What to type?",
    body: "Enter the two counts shown for each indicator. The score updates as you type."
  },
  {
    title: "How is it scored?",
    body: "Green ≥90 · Yellow 70–89 · Red below 70."
  },
  {
    title: "Check last month",
    body: "Open Action Tracker, pick the month, and see your scores and any DC targets."
  }
];

export const DEPT_TARGET_TYPES = {
  SCORE: {
    label: "Monthly",
    short: "Score target (0–100)",
    setExample: "DC asks for score 80 by 30 June",
    howChecked:
      "Next month DC compares your indicator score (0–100) with the target. Example: target 80, you scored 72 → below target.",
    yourJob: "Keep entering monthly data. The score updates each month from your figures."
  },
  QUARTERLY: {
    label: "Quarterly",
    short: "Count target for the quarter",
    setExample: "DC asks for 100 total by quarter-end",
    howChecked:
      "Each month you enter this month's count. DC adds them up and compares the total to the target in Past targets.",
    yourJob: "Enter this month's count every month. The running total is checked at quarter-end."
  }
};

export function targetExplainer(targetType) {
  return DEPT_TARGET_TYPES[targetType] || DEPT_TARGET_TYPES.SCORE;
}
