import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class PontoAfdService {
  private readonly http = inject(HttpClient);

  listExports(): Observable<AfdExportSummary[]> {
    return this.http.get<AfdExportSummary[]>('/api/v1/ponto/afd/exports');
  }

  createExport(payload: {
    repDeviceId: string;
    periodStart: string;
    periodEnd: string;
  }): Observable<AfdExportSummary> {
    return this.http.post<AfdExportSummary>('/api/v1/ponto/afd/exports', payload);
  }

  listImports(): Observable<AfdImportSummary[]> {
    return this.http.get<AfdImportSummary[]>('/api/v1/ponto/afd/imports');
  }

  importAfd(payload: {
    repDeviceId: string;
    fileName: string;
    content: string;
  }): Observable<AfdImportSummary> {
    return this.http.post<AfdImportSummary>('/api/v1/ponto/afd/imports', payload);
  }

  exportDownloadUrl(afdExportId: string): string {
    return `/api/v1/ponto/afd/exports/${encodeURIComponent(afdExportId)}/download`;
  }
}
