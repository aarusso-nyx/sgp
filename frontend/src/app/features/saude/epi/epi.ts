import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-epi',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './epi.html',
  styleUrl: './epi.scss',
})
export class SaudeEpi implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);

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
    void this.load();
  }

  async load(): Promise<void> {
    const { inventory, deliveries } = await firstValueFrom(
      forkJoin({
        inventory: this.api.get<EpiInventory[]>('v1/saude/epi/inventario'),
        deliveries: this.api.get<EpiDelivery[]>('v1/saude/epi/entregas'),
      }),
    );
    this.inventory = inventory;
    this.deliveries = deliveries;
  }

  createInventory(): void {
    if (this.inventoryForm.invalid) return this.inventoryForm.markAllAsTouched();
    void this.save('v1/saude/epi/inventario', this.inventoryForm.value);
  }

  registerDelivery(): void {
    if (this.deliveryForm.invalid) return this.deliveryForm.markAllAsTouched();
    void this.save('v1/saude/epi/entregas', this.compact(this.deliveryForm.value));
  }

  private async save(path: string, payload: Record<string, unknown>): Promise<void> {
    this.saving = true;
    this.error = '';
    try {
      await firstValueFrom(this.api.post<unknown, Record<string, unknown>>(path, payload));
      await this.load();
    } catch {
      this.error = 'Nao foi possivel salvar o EPI.';
    } finally {
      this.saving = false;
    }
  }

  private compact(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== '' && entry !== undefined),
    );
  }
}
