import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface EpiInventory {
  id: string;
  caNumber: string;
  name: string;
  validityMonths: number;
}

interface EpiDelivery {
  id: string;
  employeeName: string | null;
  employeeId: string;
  caNumber: string | null;
  epiName: string | null;
  deliveredAt: string;
  quantity: number;
  signatureMethod: string;
  signatureEvidenceUri: string | null;
}

@Component({
  selector: 'app-saude-epi',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './epi.html',
  styleUrl: './epi.scss',
})
export class SaudeEpi implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly inventoryForm = this.formBuilder.group({
    caNumber: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    validityMonths: [12, [Validators.required]],
  });

  readonly deliveryForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    epiInventoryId: ['', [Validators.required]],
    deliveredAt: ['', [Validators.required]],
    quantity: [1, [Validators.required]],
    signatureMethod: ['DIGITAL', [Validators.required]],
    signatureEvidenceUri: ['', [Validators.required]],
    trainingDoneAt: [''],
  });

  inventory: EpiInventory[] = [];
  deliveries: EpiDelivery[] = [];
  saving = false;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api
      .get<EpiInventory[]>('v1/saude/epi/inventario')
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.inventory = rows));
    this.api
      .get<EpiDelivery[]>('v1/saude/epi/entregas')
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.deliveries = rows));
  }

  createInventory(): void {
    if (this.inventoryForm.invalid) return this.inventoryForm.markAllAsTouched();
    this.save('v1/saude/epi/inventario', this.inventoryForm.value);
  }

  registerDelivery(): void {
    if (this.deliveryForm.invalid) return this.deliveryForm.markAllAsTouched();
    this.save('v1/saude/epi/entregas', this.compact(this.deliveryForm.value));
  }

  private save(path: string, payload: Record<string, unknown>): void {
    this.saving = true;
    this.error = '';
    this.api
      .post<unknown, Record<string, unknown>>(path, payload)
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.load(),
        error: () => (this.error = 'Nao foi possivel salvar o EPI.'),
      });
  }

  private compact(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== '' && entry !== undefined),
    );
  }
}
