export type LgpdDataCategory = 'PERSONAL' | 'SENSITIVE' | 'MIXED';

export interface LgpdLegalBasisRule {
  flowKey: string;
  flowName: string;
  dataCategory: LgpdDataCategory;
  legalBasisCode: string;
  legalBasisArticle: string;
  sensitiveBasisCode: string | null;
  sensitiveBasisArticle: string | null;
  purpose: string;
  dataSubjects: string[];
  dataCategories: string[];
  sourceTables: string[];
  readSurfaces: string[];
  retentionRule: string;
  sharingScope: string;
  requiresConsent: boolean;
  requiresDpia: boolean;
  decisionRecordAnchor: string;
}

export const LGPD_DATA_FLOWS = {
  PAYROLL_PAYSLIP_PDF: 'payroll.payslip_pdf',
  FISCAL_YEARLY_INCOME_PDF: 'fiscal.yearly_income_pdf',
  TIME_ATTENDANCE_REGISTER: 'time.attendance_register',
  TIME_BIOMETRIC_CLOCK: 'time.biometric_clock',
  RECRUITMENT_PUBLIC_APPLICATION: 'recruitment.public_application',
  RECRUITMENT_ONLINE_EXAM_PROCTORING: 'recruitment.online_exam_proctoring',
  HEALTH_MEDICAL_RECORD: 'health.medical_record',
  REGULATORY_ESOCIAL_REPORTING: 'regulatory.esocial_reporting',
  TRANSPARENCY_REMUNERATION_PUBLICATION:
    'transparency.remuneration_publication',
} as const;

export type LgpdDataFlowKey =
  (typeof LGPD_DATA_FLOWS)[keyof typeof LGPD_DATA_FLOWS];

export const LGPD_LEGAL_BASIS_RULES: readonly LgpdLegalBasisRule[] = [
  {
    flowKey: LGPD_DATA_FLOWS.PAYROLL_PAYSLIP_PDF,
    flowName: 'Official payslip PDF/A',
    dataCategory: 'MIXED',
    legalBasisCode: 'LGPD_ART_7_II',
    legalBasisArticle:
      'LGPD art. 7, II - legal or regulatory obligation by the controller',
    sensitiveBasisCode: 'LGPD_ART_11_II_A',
    sensitiveBasisArticle:
      'LGPD art. 11, II, a - legal or regulatory obligation by the controller',
    purpose:
      'Generate and provide official remuneration statements to employees and authorized operators.',
    dataSubjects: ['public employee'],
    dataCategories: [
      'functional identification',
      'CPF',
      'bank data',
      'payroll earnings',
      'statutory deductions',
    ],
    sourceTables: [
      'hr.employee',
      'payroll.payroll_run',
      'payroll.payroll_financial_record',
      'payroll.v_payroll_run_line_active',
      'public.generated_report_file',
    ],
    readSurfaces: ['report-service/payslip', 'employee portal'],
    retentionRule:
      'Retain under the functional, fiscal, and external-control period applicable to official payslips.',
    sharingScope: 'internal_employee_portal',
    requiresConsent: false,
    requiresDpia: true,
    decisionRecordAnchor: 'ADR-LGPD-001',
  },
  {
    flowKey: LGPD_DATA_FLOWS.FISCAL_YEARLY_INCOME_PDF,
    flowName: 'Annual income and withholding certificate',
    dataCategory: 'MIXED',
    legalBasisCode: 'LGPD_ART_7_II',
    legalBasisArticle:
      'LGPD art. 7, II - legal or regulatory obligation by the controller',
    sensitiveBasisCode: 'LGPD_ART_11_II_A',
    sensitiveBasisArticle:
      'LGPD art. 11, II, a - legal or regulatory obligation by the controller',
    purpose:
      'Generate annual income and IRRF certificate for fiscal duties and employee delivery.',
    dataSubjects: ['public employee', 'fiscal beneficiary'],
    dataCategories: [
      'tax identification',
      'CPF',
      'income',
      'IRRF',
      'dependent aggregate count',
    ],
    sourceTables: [
      'fiscal.v_yearly_income',
      'fiscal.yearly_income_aggregate',
      'public.generated_report_file',
    ],
    readSurfaces: ['report-service/yearly-income', 'employee portal'],
    retentionRule:
      'Retain generated official fiscal files for at least 10 years.',
    sharingScope: 'internal_employee_portal',
    requiresConsent: false,
    requiresDpia: true,
    decisionRecordAnchor: 'ADR-LGPD-002',
  },
  {
    flowKey: LGPD_DATA_FLOWS.TIME_ATTENDANCE_REGISTER,
    flowName: 'Attendance and time-bank records',
    dataCategory: 'PERSONAL',
    legalBasisCode: 'LGPD_ART_7_II',
    legalBasisArticle:
      'LGPD art. 7, II - legal or regulatory obligation by the controller',
    sensitiveBasisCode: null,
    sensitiveBasisArticle: null,
    purpose:
      'Record working time, calculate attendance, produce AFDT/ACJEF, and integrate attendance effects into payroll.',
    dataSubjects: ['public employee'],
    dataCategories: [
      'registration',
      'time punches',
      'work location',
      'attendance justifications',
    ],
    sourceTables: [
      'ponto.time_record',
      'ponto.mobile_clock_in_attempt',
      'hr.employee',
    ],
    readSurfaces: ['ponto admin', 'employee portal', 'payroll integration'],
    retentionRule:
      'Retain according to Portaria MTP 671/2021 and labor/administrative limitation periods.',
    sharingScope: 'internal_operational',
    requiresConsent: false,
    requiresDpia: false,
    decisionRecordAnchor: 'ADR-LGPD-003',
  },
  {
    flowKey: LGPD_DATA_FLOWS.TIME_BIOMETRIC_CLOCK,
    flowName: 'Biometric time-clock verification',
    dataCategory: 'SENSITIVE',
    legalBasisCode: 'LGPD_ART_7_II',
    legalBasisArticle:
      'LGPD art. 7, II - legal or regulatory obligation by the controller',
    sensitiveBasisCode: 'LGPD_ART_11_II_A',
    sensitiveBasisArticle:
      'LGPD art. 11, II, a - legal or regulatory obligation by the controller',
    purpose:
      'Bind encrypted biometric templates to time-clock authenticity checks.',
    dataSubjects: ['public employee'],
    dataCategories: [
      'encrypted biometric template',
      'match decision',
      'highlighted operational consent',
    ],
    sourceTables: [
      'ponto.employee_biometric_template',
      'ponto.employee_face_template',
      'ponto.face_match',
      'ponto.face_consent',
    ],
    readSurfaces: [
      'REP biometric adapter',
      'ponto face clock',
      'portal meus dados',
    ],
    retentionRule:
      'Retain active template while the employment relationship and time-clock purpose remain active.',
    sharingScope: 'internal_operational',
    requiresConsent: true,
    requiresDpia: true,
    decisionRecordAnchor: 'ADR-LGPD-004',
  },
  {
    flowKey: LGPD_DATA_FLOWS.RECRUITMENT_PUBLIC_APPLICATION,
    flowName: 'Public recruitment application',
    dataCategory: 'MIXED',
    legalBasisCode: 'LGPD_ART_7_V',
    legalBasisArticle:
      'LGPD art. 7, V - contract execution or preliminary procedures requested by the data subject',
    sensitiveBasisCode: 'LGPD_ART_11_II_D',
    sensitiveBasisArticle:
      'LGPD art. 11, II, d - regular exercise of rights in administrative process',
    purpose:
      'Receive applications, validate requirements, process exemptions/quotas, and keep candidate follow-up.',
    dataSubjects: ['candidate'],
    dataCategories: [
      'CPF',
      'name',
      'birth date',
      'contact',
      'address',
      'quota self-declarations when provided',
    ],
    sourceTables: [
      'recrutamento.candidato',
      'recrutamento.inscricao',
      'recrutamento.payment_charge',
    ],
    readSurfaces: ['public recruitment portal', 'recruitment admin'],
    retentionRule:
      'Retain for the edital lifecycle, appeal period, and administrative-control limitation period.',
    sharingScope: 'internal_candidate_portal',
    requiresConsent: true,
    requiresDpia: true,
    decisionRecordAnchor: 'ADR-LGPD-005',
  },
  {
    flowKey: LGPD_DATA_FLOWS.RECRUITMENT_ONLINE_EXAM_PROCTORING,
    flowName: 'Online exam proctoring and biometrics',
    dataCategory: 'SENSITIVE',
    legalBasisCode: 'LGPD_ART_7_VI',
    legalBasisArticle:
      'LGPD art. 7, VI - regular exercise of rights in administrative process',
    sensitiveBasisCode: 'LGPD_ART_11_II_D',
    sensitiveBasisArticle:
      'LGPD art. 11, II, d - regular exercise of rights in administrative process',
    purpose:
      'Prevent fraud, audit exam sessions, and support administrative appeals.',
    dataSubjects: ['candidate'],
    dataCategories: [
      'facial image',
      'audio/video/snapshot artifact',
      'session event',
      'liveness/proctoring decision',
    ],
    sourceTables: [
      'recrutamento.online_exam_session',
      'recrutamento.online_exam_artifact',
      'recrutamento.biometric_template',
    ],
    readSurfaces: ['online exam', 'recruitment audit'],
    retentionRule:
      'Retain until the recruitment process, appeal window, and control period end.',
    sharingScope: 'internal_candidate_portal',
    requiresConsent: true,
    requiresDpia: true,
    decisionRecordAnchor: 'ADR-LGPD-006',
  },
  {
    flowKey: LGPD_DATA_FLOWS.HEALTH_MEDICAL_RECORD,
    flowName: 'Medical record, ASO, and PCMSO/PGR',
    dataCategory: 'SENSITIVE',
    legalBasisCode: 'LGPD_ART_7_II',
    legalBasisArticle:
      'LGPD art. 7, II - legal or regulatory obligation by the controller',
    sensitiveBasisCode: 'LGPD_ART_11_II_F',
    sensitiveBasisArticle:
      'LGPD art. 11, II, f - health protection by health professionals/services or sanitary authority',
    purpose:
      'Record occupational health care, ASO, medical leave, and restricted medical files.',
    dataSubjects: ['public employee'],
    dataCategories: ['health data', 'CID when allowed', 'reports', 'ASO'],
    sourceTables: [
      'saude.medical_record',
      'saude.aso',
      'hr.medical_leave',
      'hr.work_accident',
    ],
    readSurfaces: ['health/pericia', 'SST', 'eSocial SST builders'],
    retentionRule:
      'Retain according to PCMSO/PGR, eSocial SST, and medical-legal periods.',
    sharingScope: 'restricted_health_staff',
    requiresConsent: false,
    requiresDpia: true,
    decisionRecordAnchor: 'ADR-LGPD-007',
  },
  {
    flowKey: LGPD_DATA_FLOWS.REGULATORY_ESOCIAL_REPORTING,
    flowName: 'eSocial, DCTFWeb, DIRF/Reinf, and TCE reporting',
    dataCategory: 'MIXED',
    legalBasisCode: 'LGPD_ART_7_II',
    legalBasisArticle:
      'LGPD art. 7, II - legal or regulatory obligation by the controller',
    sensitiveBasisCode: 'LGPD_ART_11_II_A',
    sensitiveBasisArticle:
      'LGPD art. 11, II, a - legal or regulatory obligation by the controller',
    purpose:
      'Meet labor, social-security, fiscal, and external-control reporting duties.',
    dataSubjects: ['public employee', 'beneficiary', 'appointed candidate'],
    dataCategories: [
      'CPF',
      'registration',
      'remuneration',
      'tax',
      'employment relationship',
      'SST data when required',
    ],
    sourceTables: [
      'public.esocial_spool',
      'fiscal.dctfweb_debit',
      'payroll.payroll_financial_record',
      'hr.employee',
    ],
    readSurfaces: ['stynx-esocial', 'integrations-worker', 'TCE adapters'],
    retentionRule:
      'Retain according to official layouts, Receita Federal, eSocial, and courts of accounts.',
    sharingScope: 'government_regulators',
    requiresConsent: false,
    requiresDpia: true,
    decisionRecordAnchor: 'ADR-LGPD-008',
  },
  {
    flowKey: LGPD_DATA_FLOWS.TRANSPARENCY_REMUNERATION_PUBLICATION,
    flowName: 'Active remuneration transparency',
    dataCategory: 'PERSONAL',
    legalBasisCode: 'LGPD_ART_7_III',
    legalBasisArticle:
      'LGPD art. 7, III - public-policy execution by public administration',
    sensitiveBasisCode: null,
    sensitiveBasisArticle: null,
    purpose:
      'Publish remuneration transparency with public identifiers and data minimization.',
    dataSubjects: ['public employee'],
    dataCategories: [
      'public employee identifier',
      'position',
      'work unit',
      'aggregated remuneration',
    ],
    sourceTables: ['public_data.transparency_snapshot', 'hr.employee'],
    readSurfaces: ['transparency portal'],
    retentionRule:
      'Retain according to LAI, Transparency Law, and active-publicity policy.',
    sharingScope: 'public_transparency',
    requiresConsent: false,
    requiresDpia: false,
    decisionRecordAnchor: 'ADR-LGPD-009',
  },
];

export function findLgpdLegalBasisRule(
  flowKey: string,
): LgpdLegalBasisRule | undefined {
  return LGPD_LEGAL_BASIS_RULES.find((rule) => rule.flowKey === flowKey);
}
