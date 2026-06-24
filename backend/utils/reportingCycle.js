/**

 * Reporting cycle — always relative to today's date, never hardcoded months.

 *

 * Rules:

 *   1. Active reporting month = calendar PREVIOUS month (the period being measured).

 *   2. Departments may enter data ONLY for that month (once per month).

 *   3. Submission window opens on the 1st of the CURRENT calendar month.

 *   4. DC reviews the PREVIOUS month's performance (default dashboard month).

 *   5. To check if prior targets were met, DC switches to current month

 *      (prior commitments from reporting month show deviation there).

 */



const { toMonthKey } = require('./reportingMonths');



const DEFAULT_CYCLE = {

  submissionOpensDay: 1,

  submissionDeadlineDay: 1,

  submissionDeadlineHour: 23,

  submissionDeadlineMinute: 0,

  targetDueDay: 1,

  targetDueHour: 12,

  targetDueMinute: 0,

  fiscalYearStartMonth: 4

};



function parseMonthKey(monthKey) {

  const [y, m] = String(monthKey || '').split('-').map(Number);

  return { year: y, month: m };

}



function addMonths(year, month, delta) {

  const d = new Date(year, month - 1 + delta, 1);

  return { year: d.getFullYear(), month: d.getMonth() + 1 };

}



function buildDate(year, month, day, hour = 0, minute = 0) {

  return new Date(year, month - 1, day, hour, minute, 0, 0);

}



function mergeCycleConfig(districtRow) {

  if (!districtRow) return { ...DEFAULT_CYCLE };

  return {

    submissionOpensDay: districtRow.submission_opens_day ?? DEFAULT_CYCLE.submissionOpensDay,

    submissionDeadlineDay: districtRow.submission_deadline_day ?? DEFAULT_CYCLE.submissionDeadlineDay,

    submissionDeadlineHour: districtRow.submission_deadline_hour ?? DEFAULT_CYCLE.submissionDeadlineHour,

    submissionDeadlineMinute: districtRow.submission_deadline_minute ?? DEFAULT_CYCLE.submissionDeadlineMinute,

    targetDueDay: districtRow.target_due_day ?? DEFAULT_CYCLE.targetDueDay,

    targetDueHour: districtRow.target_due_hour ?? DEFAULT_CYCLE.targetDueHour,

    targetDueMinute: districtRow.target_due_minute ?? DEFAULT_CYCLE.targetDueMinute,

    fiscalYearStartMonth: districtRow.fiscal_year_start_month ?? DEFAULT_CYCLE.fiscalYearStartMonth

  };

}



/** Calendar previous month — the only month departments can submit. */

function getPreviousMonthKey(fromDate = new Date()) {

  const { year, month } = addMonths(fromDate.getFullYear(), fromDate.getMonth() + 1, -1);

  return toMonthKey(year, month);

}



/** Calendar current month — when submission window is open. */

function getCurrentMonthKey(fromDate = new Date()) {

  return toMonthKey(fromDate.getFullYear(), fromDate.getMonth() + 1);

}



function getActiveReportingMonth(now = new Date()) {

  return getPreviousMonthKey(now);

}



function getNextMonthKey(monthKey) {

  const { year, month } = parseMonthKey(monthKey);

  const next = addMonths(year, month, 1);

  return toMonthKey(next.year, next.month);

}



function getSubmissionOpensAt(monthKey, cycle = DEFAULT_CYCLE) {

  const next = parseMonthKey(getNextMonthKey(monthKey));

  return buildDate(next.year, next.month, cycle.submissionOpensDay, 0, 0);

}



function getSubmissionDeadline(monthKey, cycle = DEFAULT_CYCLE) {

  const next = parseMonthKey(getNextMonthKey(monthKey));

  return buildDate(

    next.year,

    next.month,

    cycle.submissionDeadlineDay,

    cycle.submissionDeadlineHour,

    cycle.submissionDeadlineMinute

  );

}



function getTargetDueDate(monthKey, cycle = DEFAULT_CYCLE) {

  const next = parseMonthKey(getNextMonthKey(monthKey));

  return buildDate(

    next.year,

    next.month,

    cycle.targetDueDay,

    cycle.targetDueHour,

    cycle.targetDueMinute

  );

}



function formatDueDateISO(date) {

  if (!date) return null;

  const d = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString().slice(0, 10);

}



function formatDueDateLabel(date) {

  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

}



function isAllowedSubmissionMonth(monthKey, now = new Date()) {

  return monthKey === getActiveReportingMonth(now);

}



function isSubmissionWindowOpen(monthKey, now = new Date(), cycle = DEFAULT_CYCLE) {

  if (!isAllowedSubmissionMonth(monthKey, now)) return false;

  return now >= getSubmissionOpensAt(monthKey, cycle);

}



function isSubmissionLate(monthKey, submittedAt, cycle = DEFAULT_CYCLE) {

  if (!submittedAt) return false;

  return new Date(submittedAt) > getSubmissionDeadline(monthKey, cycle);

}



function getSubmissionStatus(monthKey, submittedAt, now = new Date(), cycle = DEFAULT_CYCLE) {

  const active = getActiveReportingMonth(now);

  const opens = getSubmissionOpensAt(monthKey, cycle);

  const deadline = getSubmissionDeadline(monthKey, cycle);



  if (monthKey !== active) {

    return {

      code: 'LOCKED',

      label: `Only ${formatMonthShort(active)} data can be entered now`,

      canSubmit: false,

      isLate: false

    };

  }



  if (now < opens) {

    return {

      code: 'NOT_OPEN',

      label: `Opens ${formatDueDateLabel(opens)}`,

      canSubmit: false,

      isLate: false

    };

  }



  if (!submittedAt) {

    const isPastDeadline = now > deadline;

    return {

      code: isPastDeadline ? 'OVERDUE' : 'OPEN',

      label: isPastDeadline

        ? `Overdue — was due ${formatDueDateLabel(deadline)}`

        : `Due ${formatDueDateLabel(deadline)}`,

      canSubmit: true,

      isLate: false

    };

  }



  const late = isSubmissionLate(monthKey, submittedAt, cycle);

  return {

    code: late ? 'SUBMITTED_LATE' : 'SUBMITTED_ON_TIME',

    label: late ? 'Submitted late' : 'Submitted on time',

    canSubmit: true,

    isLate: late

  };

}



function evaluateTargetDueStatus(targetDate, completionStatus, deviation, now = new Date()) {

  if (!targetDate) {

    return { dueStatus: 'NO_TARGET', dueLabel: 'No target date set', daysOverdue: 0 };

  }



  const due = new Date(targetDate);

  const closed = ['COMPLETED', 'MISSED'].includes(String(completionStatus || '').toUpperCase());



  if (closed) {

    if (completionStatus === 'COMPLETED' || (deviation != null && deviation >= 0)) {

      return { dueStatus: 'MET', dueLabel: 'Target met', daysOverdue: 0 };

    }

    return { dueStatus: 'MISSED', dueLabel: 'Marked missed', daysOverdue: 0 };

  }



  const dueEnd = new Date(due);

  dueEnd.setHours(23, 59, 59, 999);



  if (now > dueEnd) {

    const days = Math.floor((now - dueEnd) / (1000 * 60 * 60 * 24));

    return {

      dueStatus: 'OVERDUE',

      dueLabel: `Overdue by ${days} day${days === 1 ? '' : 's'}`,

      daysOverdue: days

    };

  }



  if (now.toDateString() === due.toDateString()) {

    return { dueStatus: 'DUE_TODAY', dueLabel: 'Due today', daysOverdue: 0 };

  }



  return {

    dueStatus: 'ON_TRACK',

    dueLabel: `Due ${formatDueDateLabel(due)}`,

    daysOverdue: 0

  };

}



function buildReportingCycleInfo(cycle = DEFAULT_CYCLE, now = new Date()) {

  const activeReportingMonth = getActiveReportingMonth(now);

  const submissionCalendarMonth = getCurrentMonthKey(now);

  const submissionDeadline = getSubmissionDeadline(activeReportingMonth, cycle);

  const targetDueDate = getTargetDueDate(activeReportingMonth, cycle);



  return {

    activeReportingMonth,

    submissionCalendarMonth,

    defaultMonthForRole: activeReportingMonth,

    deptSubmissionLocked: true,

    submissionWindow: {

      reportingMonth: activeReportingMonth,

      opensAt: getSubmissionOpensAt(activeReportingMonth, cycle).toISOString(),

      deadlineAt: submissionDeadline.toISOString(),

      deadlineLabel: formatDueDateLabel(submissionDeadline),

      hint: `Enter ${formatMonthShort(activeReportingMonth)} data during ${formatMonthShort(submissionCalendarMonth)} (deadline ${formatDueDateLabel(submissionDeadline)})`

    },

    dcReview: {

      defaultViewMonth: activeReportingMonth,

      targetFollowUpMonth: submissionCalendarMonth,

      targetDueLabel: formatDueDateLabel(targetDueDate),

      hint: `Review ${formatMonthShort(activeReportingMonth)} performance. Switch to ${formatMonthShort(submissionCalendarMonth)} to check if targets were met.`

    },

    cycle

  };

}



function addMonthsToKey(monthKey, delta) {

  const { year, month } = parseMonthKey(monthKey);

  const next = addMonths(year, month, delta);

  return toMonthKey(next.year, next.month);

}



const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];



function formatMonthShort(monthKey) {

  const { year, month } = parseMonthKey(monthKey);

  return `${MONTH_SHORT[month - 1]} ${year}`;

}



function buildCommitmentTimeline(originMonthKey, reviewMonthKey, cycle = DEFAULT_CYCLE) {

  const due = getTargetDueDate(originMonthKey, cycle);

  return {

    originMonth: originMonthKey,

    originLabel: formatMonthShort(originMonthKey),

    dueDate: formatDueDateISO(due),

    dueLabel: formatDueDateLabel(due),

    reviewMonth: reviewMonthKey,

    reviewLabel: formatMonthShort(reviewMonthKey),

    narrative: `${formatMonthShort(originMonthKey)} RED → due ${formatDueDateLabel(due)} → follow-up in ${formatMonthShort(reviewMonthKey)}`

  };

}



module.exports = {

  DEFAULT_CYCLE,

  mergeCycleConfig,

  getPreviousMonthKey,

  getCurrentMonthKey,

  getActiveReportingMonth,

  getNextMonthKey,

  getSubmissionOpensAt,

  getSubmissionDeadline,

  getTargetDueDate,

  isAllowedSubmissionMonth,

  isSubmissionWindowOpen,

  isSubmissionLate,

  getSubmissionStatus,

  evaluateTargetDueStatus,

  buildReportingCycleInfo,

  buildCommitmentTimeline,

  formatDueDateISO,

  formatDueDateLabel,

  formatMonthShort,

  addMonthsToKey,

  getDefaultDeptReportingMonth: getActiveReportingMonth,

  getDefaultAdminReviewMonth: getActiveReportingMonth

};


