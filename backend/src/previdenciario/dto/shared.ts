export const PENSION_COMPENSATION_STATUSES = [
  'RASCUNHO',
  'SOLICITADA',
  'APROVADA',
  'REPROVADA',
  'LIQUIDADA',
] as const;

export const RECERTIFICATION_TYPES = [
  'APOSENTADO',
  'PENSIONISTA',
  'PENSIONISTA_UNIVERSITARIO',
] as const;

export const RECERTIFICATION_STATUSES = [
  'PENDENTE',
  'RECADASTRADO',
  'PROXIMO_VENCIMENTO',
  'VENCIDO',
  'BLOQUEADO',
] as const;

export const EXTERNAL_LIFE_PROOF_CHANNELS = [
  'PORTAL_COLABORADOR',
  'PREFEITURA_PUBLICA',
  'GOV_BR',
] as const;

export const RETIREMENT_GENDERS = ['FEMALE', 'MALE'] as const;
export const EC103_TRANSITION_RULES = [
  'EC103_PEDAGIO_100',
  'EC103_PEDAGIO_50',
  'EC103_PONTOS',
  'EC103_IDADE_PROGRESSIVA',
  'EC103_ATIVIDADE_RISCO_PROFESSOR',
] as const;
export const EC103_ATIVIDADE_RISCO_PROFESSOR_POPULATIONS = [
  'RISK_ACTIVITY',
  'TEACHER',
] as const;

export type PensionCompensationStatusInput =
  (typeof PENSION_COMPENSATION_STATUSES)[number];
export type RecertificationTypeInput = (typeof RECERTIFICATION_TYPES)[number];
export type RecertificationStatusInput =
  (typeof RECERTIFICATION_STATUSES)[number];
export type ExternalLifeProofChannelInput =
  (typeof EXTERNAL_LIFE_PROOF_CHANNELS)[number];
export type RetirementGenderInput = (typeof RETIREMENT_GENDERS)[number];
export type Ec103TransitionRuleInput = (typeof EC103_TRANSITION_RULES)[number];
export type Ec103AtividadeRiscoProfessorPopulationInput =
  (typeof EC103_ATIVIDADE_RISCO_PROFESSOR_POPULATIONS)[number];
