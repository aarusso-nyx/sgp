export type TceOrganKind = 'TCE' | 'TCM' | 'TCU';
export type ValidationStatus = 'OK' | 'FAIL';
export type SubmissionStatus = 'ACCEPTED' | 'REJECTED' | 'PENDING';
export type HealthState = 'OK' | 'FAIL';

export interface LayoutDescriptor {
  code: string;
  version: string;
  description?: string;
}

export interface ValidationResult {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
}

export interface SerializedEnvelope {
  layoutCode: string;
  layoutVersion: string;
  contentType: string;
  payloadHash: string;
  body: string;
}

export interface SubmissionReceipt {
  protocol: string;
  status: SubmissionStatus;
  submittedAt: string;
  rawResponse: unknown;
}

export interface ParsedResponse {
  protocol: string | null;
  status: SubmissionStatus;
  message: string;
}

export interface HealthStatus {
  status: HealthState;
  checkedAt: string;
  details: Record<string, unknown>;
}

export interface TceAdapter<TPayload = unknown, TRawResponse = unknown> {
  id(): string;
  state_code(): string;
  organ_kind(): TceOrganKind;
  supported_layouts(): LayoutDescriptor[];
  validate(payload: TPayload, layout_version: string): ValidationResult;
  serialize(payload: TPayload, layout_version: string): SerializedEnvelope;
  submit(envelope: SerializedEnvelope): Promise<SubmissionReceipt>;
  parseResponse(raw: TRawResponse): ParsedResponse;
  health(): Promise<HealthStatus>;
}
