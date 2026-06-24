/**
 * Central SQL text — one place for query strings used across services and scripts.
 *
 * Convention:
 *   - UPPERCASE keywords
 *   - One major clause per line
 *   - Named parameters: @camelCase or @shortName matching .input() calls
 */
module.exports = {
  ...require('./performanceData'),
  ...require('./kpis'),
  ...require('./deptSubmissions'),
  ...require('./dashboard'),
  ...require('./actionItems'),
  ...require('./reporting')
};
