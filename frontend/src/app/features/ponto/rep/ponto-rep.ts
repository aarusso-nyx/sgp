import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { PontoRepService, RepBatchSummary, RepDeviceSummary } from './ponto-rep.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ponto-rep',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ponto-rep.html',
  styleUrl: './ponto-rep.scss',
})
export class PontoRep implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoRepService);

  readonly deviceForm = this.formBuilder.group({
    kind: ['REP_C', [Validators.required]],
    serialNumber: [''],
    employerTaxId: ['', [Validators.required]],
    manufacturer: [''],
    model: [''],
    programHash: [''],
  });

  readonly batchForm = this.formBuilder.group({
    repDeviceId: ['', [Validators.required]],
    fileName: ['afdt.txt', [Validators.required]],
    content: ['', [Validators.required]],
  });

  devices: RepDeviceSummary[] = [];
  batches: RepBatchSummary[] = [];
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
      .listDevices()
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (devices) => {
          this.devices = devices;
          if (!this.batchForm.value.repDeviceId && devices[0]) {
            this.batchForm.patchValue({ repDeviceId: devices[0].repDeviceId });
          }
          this.loadBatches();
        },
        error: () => {
          this.error = 'Nao foi possivel carregar equipamentos REP.';
        },
      });
  }

  createDevice(): void {
    if (this.deviceForm.invalid) {
      this.deviceForm.markAllAsTouched();
      return;
    }
    const value = this.deviceForm.value as Record<string, string>;
    this.saving = true;
    this.error = '';
    this.service
      .createDevice({
        kind: value['kind'],
        serialNumber: value['serialNumber'] || undefined,
        employerTaxId: value['employerTaxId'],
        manufacturer: value['manufacturer'] || undefined,
        model: value['model'] || undefined,
        programHash: value['programHash'] || undefined,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (device) => {
          this.message = `Equipamento ${device.kind} cadastrado.`;
          this.batchForm.patchValue({ repDeviceId: device.repDeviceId });
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel cadastrar o equipamento REP.';
        },
      });
  }

  uploadBatch(): void {
    if (this.batchForm.invalid) {
      this.batchForm.markAllAsTouched();
      return;
    }
    const value = this.batchForm.value as Record<string, string>;
    this.saving = true;
    this.error = '';
    this.service
      .uploadBatch(value['repDeviceId'], {
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
        next: (batch) => {
          this.message = `Lote ${batch.status}: ${batch.createdTimeRecords} marcacoes criadas.`;
          this.loadBatches();
        },
        error: (response) => {
          this.error =
            response?.error?.errorSummary?.message ?? 'Nao foi possivel processar o lote REP.';
          this.loadBatches();
        },
      });
  }

  originalUrl(batchId: string): string {
    return this.service.originalUrl(batchId);
  }

  private loadBatches(): void {
    this.service
      .listBatches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batches) => {
          this.batches = batches;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar lotes REP.';
        },
      });
  }
}
