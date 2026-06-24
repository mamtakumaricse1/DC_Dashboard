/**
 * In-app scoring reference — mirrors backend scoringService.js + kra.js.
 * Full KPI list and code map: docs/06_Code_and_Scoring_Guide.md
 */

/** Performance score bands (same as backend RAG_THRESHOLDS). */
export const SCORE_BANDS = {
  GREEN_MIN: 90,
  YELLOW_MIN: 70
};

/**
 * How a KPI score is computed (band mode):
 *   HIGHER polarity: (actual - min) / (max - min) × 100
 *   Lower-is-better: (max - actual) / (max - min) × 100
 */
export const SCORING_STEPS = [
  "HoD enters ACTUAL (raw number — %, count, days)",
  "System converts to performance score 0–100",
  "GREEN ≥90 · YELLOW 70–89 · RED <70",
  "KRA score = average of department KPI scores",
  "District TPI = average of all KPI scores"
];

/** DC target types in Action Tracker (ActionItems.target_type). */
export const TARGET_TYPES = {
  SCORE: {
    label: "Monthly",
    description: "Performance score target 0–100 by due date"
  },
  QUARTERLY: {
    label: "Quarterly",
    description: "Count target for the quarter — reviewed in Past targets"
  }
};

/** Reminder channels in OwnerContactMenu (contacts from API). */
export const REMINDER_CHANNELS = ["Call", "WhatsApp", "Email", "Copy reminder"];
