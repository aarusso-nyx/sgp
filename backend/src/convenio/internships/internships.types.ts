import { QueryResultRow } from 'pg';

export interface InternshipProgramSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  institution: string | null;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
}

export interface InternshipSummary {
  id: string;
  programId: string | null;
  agreementId: string | null;
  employeeId: string | null;
  tsvContractId: string | null;
  internName: string;
  internCpf: string | null;
  supervisorName: string | null;
  startsOn: string;
  endsOn: string | null;
  status: string;
  termNumber: string;
  termSignedOn: string | null;
  activityPlanUri: string;
  activityPlanDescription: string;
  weeklyHours: string;
  stipendAmount: string | null;
  esocialStartEvent: {
    eventKind: 'S-2300';
    tsvContractId: string;
  } | null;
}

export interface S2300BuildResult {
  eventKind: 'S-2300';
  tsvContractId: string;
  messageId: string;
  status: string;
}

export interface CountRow extends QueryResultRow {
  total: string;
}

export interface ProgramRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string;
  institution_name: string | null;
  starts_on: Date | string | null;
  ends_on: Date | string | null;
  status: string;
}

export interface InternshipRow extends QueryResultRow {
  id: string;
  program_id: string | null;
  agreement_id: string | null;
  employee_id: string | null;
  tsv_contract_id: string | null;
  intern_name: string;
  intern_cpf: string | null;
  supervisor_name: string | null;
  starts_on: Date | string;
  ends_on: Date | string | null;
  stipend_amount: string | null;
  status: string;
  term_number: string;
  term_signed_on: Date | string | null;
  activity_plan_uri: string;
  activity_plan_description: string;
  weekly_hours: string;
}

export interface ProgramLookupRow extends QueryResultRow {
  id: string;
  institution_name: string | null;
}
