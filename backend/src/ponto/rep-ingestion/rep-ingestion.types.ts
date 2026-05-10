export interface ParsedRepLine {
  lineNo: number;
  nsr: number;
  rawLine: string;
  employeeId?: string | undefined;
  employeeRegistration?: string | undefined;
  employeeCpf?: string | undefined;
  recordedAt: string;
  payload: Record<string, unknown>;
  biometric?:
    | {
        kind: 'FINGERPRINT' | 'PALM_VEIN';
        sampleBase64: string;
        threshold?: number | undefined;
      }
    | undefined;
}

export interface RepDeviceSummary {
  repDeviceId: string;
  kind: 'REP_P' | 'REP_A' | 'REP_C' | 'FINGERPRINT' | 'PALM_VEIN';
  serialNumber: string | null;
  employerTaxId: string;
  manufacturer: string | null;
  model: string | null;
  programHash: string | null;
  registeredAt: string;
  status: string;
}

export interface RepIngestionBatchSummary {
  batchId: string;
  repDeviceId: string;
  kind: 'REP_P' | 'REP_A' | 'REP_C' | 'FINGERPRINT' | 'PALM_VEIN';
  fileName: string | null;
  fileSha256: string;
  receivedAt: string;
  processedAt: string | null;
  status: string;
  errorSummary: Record<string, unknown>;
  acceptedLines: number;
  duplicateLines: number;
  createdTimeRecords: number;
}
