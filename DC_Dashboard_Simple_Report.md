# District Performance Dashboard - Simple Explanation (For DC)

## What this dashboard shows

The dashboard gives a monthly view of how each department is performing and whether it is improving or declining.

It answers three key questions:

1. How is each department performing this month?
2. Which departments are Top 3 and Bottom 3 this month?
3. Is each department moving up, down, or flat compared to recent months?

## How department score is calculated

Each department has 5 KPIs.  
For each KPI, the actual value is converted into a score from 0 to 100.

- If **higher value is better** (for example, immunization rate), higher actual gives higher score.
- If **lower value is better** (for example, mortality rate), lower actual gives higher score.

Then KPI scores are combined using KPI weights to get one **department score** for that month.

## What is shown in dashboard sections

- **Top 3 / Bottom 3**: Departments with highest and lowest current-month scores.
- **Bar chart**: Current-month department score comparison.
- **Table score**: Current-month score only.
- **3M sparkline**: Last 3 months score pattern for each department.
- **Trend**:
  - **Upward**: current month is better than recent average
  - **Downward**: current month is worse than recent average
  - **Flat**: almost no change

## Trend logic in simple terms

- If enough history exists (4+ months): compare current month with average of previous 3 months.
- If only 3 months exist: compare current month with average of previous 2 months.
- If history is less than 3 months: trend is shown as Flat.

## District score (overall)

An overall district score is also shown by combining department scores using department weights.  
This helps in getting one consolidated district performance number for review.

## Category meaning

Each department is classified by score:

- **Achiever**: 85 and above
- **Performer**: 65 to <85
- **Aspirant**: 40 to <65
- **Laggard**: below 40

## How to interpret quickly in review meeting

- First see district score trend at top.
- Check Top 3 and Bottom 3 for immediate priorities.
- In table, look at trend + sparkline to identify sustained decline.
- Departments in Aspirant/Laggard with Downward trend should be prioritized for intervention.

