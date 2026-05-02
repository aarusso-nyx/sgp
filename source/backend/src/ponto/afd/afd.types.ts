export interface AfdExportSummary {
  afdExportId: string;
  repDeviceId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  fileSha256: string | null;
  lineCount: number;
  requestedByUserId: string | null;
  status: string;
  objectStoreKey: string;
  errorSummary: Record<string, unknown>;
}

export interface AfdImportSummary {
  afdImportId: string;
  repDeviceId: string;
  fileName: string;
  fileSha256: string;
  importedAt: string;
  lineCount: number;
  status: string;
  errorSummary: Record<string, unknown>;
  objectStoreKey: string;
  acceptedLines: number;
  rejectedLines: number;
}

export interface GeneratedAfdContent {
  lines: string[];
  content: string;
  fileSha256: string;
  lineCount: number;
}
