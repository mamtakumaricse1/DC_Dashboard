/**
 * Default HoD login usernames — dept_id is embedded so mapping is obvious.
 * Password for all dept users in seed: 123 (hash via npm run hash-passwords).
 */

const DEPT_LOGIN_USERS = [
  { deptId: 'D01', username: 'd01_health_nhm', department: 'Health & NHM' },
  { deptId: 'D02', username: 'd02_school_education', department: 'School Education' },
  { deptId: 'D03', username: 'd03_icds_wcd', department: 'ICDS / Women & Child Development' },
  { deptId: 'D04', username: 'd04_social_justice', department: 'Social Justice / De-addiction / Youth' },
  { deptId: 'D05', username: 'd05_sanitation_ulb', department: 'Rural Sanitation / Urban Local Bodies' },
  { deptId: 'D06', username: 'd06_pwd_infra', department: 'PWD / PMGSY / Water-Power Infrastructure' },
  { deptId: 'D07', username: 'd07_power_discom', department: 'Power Department / DISCOM' },
  { deptId: 'D08', username: 'd08_police', department: 'Police / Law & Order' },
  { deptId: 'D09', username: 'd09_agriculture', department: 'Agriculture / Allied Livelihoods' },
  { deptId: 'D10', username: 'd10_food_welfare', department: 'Food & Civil Supplies / Welfare' },
  { deptId: 'D11', username: 'd11_revenue', department: 'Revenue / District Administration' },
  { deptId: 'D12', username: 'd12_transport_dlr', department: 'DLR / Transport / Citizen Services' },
  { deptId: 'D13', username: 'd13_disaster', department: 'Disaster Management' },
  { deptId: 'D14', username: 'd14_dc_office', department: 'District Governance / DC Office' }
];

const DEPT_USERNAME_BY_ID = Object.fromEntries(
  DEPT_LOGIN_USERS.map((u) => [u.deptId, u.username])
);

/** Old seed usernames → new names (for one-time DB migration). */
const LEGACY_USERNAME_RENAMES = [
  ['health_user', 'd01_health_nhm'],
  ['education_user', 'd02_school_education'],
  ['icds_user', 'd03_icds_wcd'],
  ['social_justice_user', 'd04_social_justice'],
  ['sanitation_user', 'd05_sanitation_ulb'],
  ['infra_user', 'd06_pwd_infra'],
  ['power_user', 'd07_power_discom'],
  ['police_user', 'd08_police'],
  ['agri_user', 'd09_agriculture'],
  ['welfare_user', 'd10_food_welfare'],
  ['revenue_user', 'd11_revenue'],
  ['transport_user', 'd12_transport_dlr'],
  ['disaster_user', 'd13_disaster'],
  ['dc_office_user', 'd14_dc_office']
];

module.exports = {
  DEPT_LOGIN_USERS,
  DEPT_USERNAME_BY_ID,
  LEGACY_USERNAME_RENAMES
};
