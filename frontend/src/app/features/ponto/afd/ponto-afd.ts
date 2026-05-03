import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { AfdExportSummary, AfdImportSummary, PontoAfdService } from './ponto-afd.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ponto-afd',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ponto-afd.html',
  styleUrl: './ponto-afd.scss',
})
export class PontoAfd implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoAfdService);

  readonly exportForm = this.formBuilder.group({
    repDeviceId: ['', [Validators.required]],
    periodStart: ['', [Validators.required]],
    periodEnd: ['', [Validators.required]],
  });

  readonly importForm = this.formBuilder.group({
    repDeviceId: ['', [Validators.required]],
    fileName: ['afd.txt', [Validators.required]],
    content: ['', [Validators.required]],
  });

  exports: AfdExportSummary[] = [];
  imports: AfdImportSummary[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service
      .listExports()
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (exports) => {
          this.exports = exports;
          this.loadImports();
        },
        error: () => {
          this.error = 'Nao foi possivel carregar historico AFD.';
        },
      });
  }

  generate(): void {
    if (this.exportForm.invalid) {
      this.exportForm.markAllAsTouched();
      return;
    }
    const value = this.exportForm.value as Record<string, string>;
    this.saving = true;
    this.error = '';
    this.service
      .createExport({
        repDeviceId: value['repDeviceId'],
        periodStart: value['periodStart'],
        periodEnd: value['periodEnd'],
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (entry) => {
          this.message = `AFD ${entry.status}: ${entry.lineCount} linhas.`;
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel gerar o AFD.';
        },
      });
  }

  importAfd(): void {
    if (this.importForm.invalid) {
      this.importForm.markAllAsTouched();
      return;
    }
    const value = this.importForm.value as Record<string, string>;
    this.saving = true;
    this.error = '';
    this.service
      .importAfd({
        repDeviceId: value['repDeviceId'],
        fileName: value['fileName'],
        content: value['content'],
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (entry) => {
          this.message = `Importacao ${entry.status}: ${entry.acceptedLines} aceitas.`;
          this.loadImports();
        },
        error: () => {
          this.error = 'Nao foi possivel importar o AFD.';
        },
      });
  }

  readFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.importForm.patchValue({
        fileName: file.name,
        content: String(reader.result ?? ''),
      });
    };
    reader.readAsText(file, 'iso-8859-1');
  }

  downloadUrl(afdExportId: string): string {
    return this.service.exportDownloadUrl(afdExportId);
  }

  errorMessage(entry: AfdImportSummary): string {
    const message = entry.errorSummary['message'];
    return typeof message === 'string' ? message : '';
  }

  private loadImports(): void {
    this.service
      .listImports()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (imports) => {
          this.imports = imports;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar importacoes AFD.';
        },
      });
  }
}
