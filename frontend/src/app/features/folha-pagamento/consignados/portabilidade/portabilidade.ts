import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import {
  PortabilidadeService,
  PortabilityProcessResult,
  PortabilityUploadResult,
} from './portabilidade.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-consignado-portabilidade',
  standalone: false,
  templateUrl: './portabilidade.html',
  styleUrl: './portabilidade.scss',
})
export class ConsignadoPortabilidade {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PortabilidadeService);

  readonly form = this.fb.nonNullable.group({
    sourceConsignmentEntityId: ['', Validators.required],
    targetConsignmentEntityId: ['', Validators.required],
    layout: ['CANONICAL_CSV' as const, Validators.required],
    fileName: [''],
    content: ['', Validators.required],
  });

  uploading = false;
  processing = false;
  errorMessage = '';
  uploadResult?: PortabilityUploadResult;
  processResult?: PortabilityProcessResult;

  upload(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.uploading = true;
    this.errorMessage = '';
    this.processResult = undefined;
    this.service.upload(this.form.getRawValue()).subscribe({
      next: (result) => {
        this.uploadResult = result;
        this.uploading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error);
        this.uploading = false;
      },
    });
  }

  process(): void {
    if (!this.uploadResult) return;
    this.processing = true;
    this.errorMessage = '';
    this.service.process(this.uploadResult.fileId).subscribe({
      next: (result) => {
        this.processResult = result;
        this.processing = false;
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error);
        this.processing = false;
      },
    });
  }

  private messageFrom(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Nao foi possivel processar a portabilidade.';
  }
}
