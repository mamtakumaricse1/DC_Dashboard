/**
 * KRA (Key Result Area) metadata for Tirap Performance Index.
 *
 * Stored here — not in SQL — because labels/owners change rarely and are
 * presentation-only. Department IDs (D01–D14) match the Departments table.
 */

/** RAG colour rules used across dashboard and action tracker. */
const RAG_THRESHOLDS = {
  GREEN: 90,   // ≥90% of target
  YELLOW: 70   // 70–89% warning; <70 = RED (mandatory action plan)
};

/** Demo contact numbers for Call/Remind — replace with real HoD mobiles before go-live. */
const KRA_META = {
  D01: { code: 'H', label: 'Health Service Delivery', owner: 'DMO (District Medical Officer)', ownerPhone: '9862345101', ownerEmail: 'dmo.tirap@gov.in' },
  D02: { code: 'E', label: 'Education Attendance & Outcomes', owner: 'DDSE (Deputy Director, School Education)', ownerPhone: '9436254872', ownerEmail: 'ddse.tirap@gov.in' },
  D03: { code: 'A', label: 'Anganwadi & ECCE', owner: 'DPO (ICDS)', ownerPhone: '8794321560', ownerEmail: 'dpo.icds.tirap@gov.in' },
  D04: { code: 'D', label: 'Drug Demand-Reduction & Youth', owner: 'DC + DMO + SP (joint)', ownerPhone: '9863127845', ownerEmail: 'socialjustice.tirap@gov.in' },
  D05: { code: 'S', label: 'Sanitation, Cleanliness & Urban Services', owner: 'TMC / Municipal Cmsr + SDO', ownerPhone: '9436672198', ownerEmail: 'sanitation.tirap@gov.in' },
  D06: { code: 'I', label: 'Infrastructure, Roads & Connectivity', owner: 'PWD SE + PMGSY PIA', ownerPhone: '8798451023', ownerEmail: 'pwd.tirap@gov.in' },
  D07: { code: 'W', label: 'Power Supply & Distribution', owner: 'Executive Engineer (Power)', ownerPhone: '9862459036', ownerEmail: 'power.tirap@gov.in' },
  D08: { code: 'L', label: 'Law & Order, Public Safety', owner: 'Superintendent of Police', ownerPhone: '9436042781', ownerEmail: 'sp.tirap@gov.in' },
  D09: { code: 'G', label: 'Agriculture, Horticulture & Allied', owner: 'DAO + DHO + DPM-NRLM', ownerPhone: '8792563410', ownerEmail: 'agri.tirap@gov.in' },
  D10: { code: 'C', label: 'Convergence & Saturation Villages', owner: 'DC (chair) + multi-departmental', ownerPhone: '9862784519', ownerEmail: 'welfare.tirap@gov.in' },
  D11: { code: 'R', label: 'Revenue & Land', owner: 'Revenue Officer + COs', ownerPhone: '9436128904', ownerEmail: 'revenue.tirap@gov.in' },
  D12: { code: 'J', label: 'Jan Suvidha (Certificates & Services)', owner: 'OIC, Jan Suvidha (DC Office)', ownerPhone: '8794315672', ownerEmail: 'jansuvidha.tirap@gov.in' },
  D13: { code: 'M', label: 'Disaster Management & Resilience', owner: 'District Disaster Mgmt Officer (DDMO)', ownerPhone: '9862437815', ownerEmail: 'ddmo.tirap@gov.in' },
  D14: { code: 'P', label: 'Process, People & Citizen Grievance', owner: 'DC Office', ownerPhone: '9436281047', ownerEmail: 'dcoffice.tirap@gov.in' }
};

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/** Build display string e.g. "L - Law & Order, Public Safety". */
function formatKraLabel(deptId, fallbackName = '') {
  const meta = KRA_META[deptId] || {};
  return `${meta.code || 'NA'} - ${meta.label || fallbackName}`;
}

module.exports = {
  RAG_THRESHOLDS,
  KRA_META,
  MONTH_LABELS,
  formatKraLabel
};
