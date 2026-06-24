const { KRA_META } = require('../constants/kra');
const { DEPT_LOGIN_USERS } = require('../constants/deptUsers');

/** Single source of truth for HoD contact directory (API + reminders). */
function buildContactsList() {
  return Object.entries(KRA_META).map(([deptId, meta]) => {
    const dept = DEPT_LOGIN_USERS.find((d) => d.deptId === deptId);
    return {
      deptId,
      deptName: dept?.department || deptId,
      kra: `${meta.code} - ${meta.label}`,
      owner: meta.owner,
      phone: meta.ownerPhone || '',
      email: meta.ownerEmail || ''
    };
  });
}

function contactForDept(deptId) {
  return buildContactsList().find((c) => c.deptId === deptId) || null;
}

module.exports = { buildContactsList, contactForDept };
