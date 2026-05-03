import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { RetornoBancarioService } from './retorno-bancario.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-retorno-bancario',
  standalone: false,
  templateUrl: './retorno-bancario.html',
  styleUrl: './retorno-bancario.scss',
})
export class RetornoBancario {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RetornoBancarioService);

  readonly form = this.fb.nonNullable.group({
    remittanceFileId: ['', Validators.required],
    remittanceFileHash: ['', Validators.required],
    returnFileId: [''],
    content: ['', Validators.required],
  });

  errorMessage = '';
  infoMessage = '';
  loading = false;

  process(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.infoMessage = '';
    this.service
      .process({
        remittanceFileId: this.form.controls.remittanceFileId.value.trim(),
        remittanceFileHash: this.form.controls.remittanceFileHash.value.trim(),
        content: this.form.controls.content.value,
      })
      .subscribe({
        next: (result) => {
          this.form.controls.returnFileId.setValue(result.returnFileId);
          this.infoMessage = `Retorno ${result.returnFileId} processado: ${result.processedRecords} linhas, ${result.rejectedRecords} rejeitadas.`;
          this.loading = false;
        },
        error: (error: unknown) => {
          this.errorMessage = this.messageFrom(error, 'Nao foi possivel processar o retorno.');
          this.loading = false;
        },
      });
  }

  reprocessRejected(): void {
    const returnFileId = this.form.controls.returnFileId.value.trim();
    if (!returnFileId) {
      this.form.controls.returnFileId.markAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.infoMessage = '';
    this.service.reprocessRejected(returnFileId).subscribe({
      next: (result) => {
        this.infoMessage = `Nova remessa ${result.remittanceFileId} criada com ${result.detailCount} pendencias.`;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error, 'Nao foi possivel reprocessar rejeitados.');
        this.loading = false;
      },
    });
  }

  private messageFrom(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message;
    return fallback;
  }
}
