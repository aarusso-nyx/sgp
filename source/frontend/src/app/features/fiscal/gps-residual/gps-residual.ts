import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  GpsPaymentCode,
  GpsReason,
  GpsRemittance,
  GpsResidualApiService,
  GpsStatus,
} from './gps-residual.service';

@Component({
  selector: 'app-fiscal-gps-residual',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './gps-residual.html',
  styleUrl: './gps-residual.scss',
})
export class FiscalGpsResidual implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(GpsResidualApiService);

  readonly form = this.fb.nonNullable.group({
    competence: ['2018-06-01', Validators.required],
    paymentCodeId: ['', Validators.required],
    reason: ['RETROACTIVE' as GpsReason, Validators.required],
    reasonDetail: ['', Validators.required],
  });

  readonly filter = this.fb.nonNullable.group({
    reason: ['' as GpsReason | ''],
    status: ['' as GpsStatus | ''],
  });

  paymentCodes: GpsPaymentCode[] = [];
  remittances: GpsRemittance[] = [];
  selected: GpsRemittance | null = null;
  loading = false;
  busy = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadPaymentCodes();
    this.load();
  }

  loadPaymentCodes(): void {
    this.service.paymentCodes().subscribe({
      next: (codes) => {
        this.paymentCodes = codes;
        if (!this.form.controls.paymentCodeId.value && codes[0]) {
          this.form.controls.paymentCodeId.setValue(codes[0].id);
        }
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    const value = this.filter.getRawValue();
    this.service.list(value.reason, value.status).subscribe({
      next: (items) => {
        this.remittances = items;
        this.selected = items[0] ?? null;
        this.loading = false;
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  generate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy = true;
    this.errorMessage = '';
    this.service.generate(this.form.getRawValue()).subscribe({
      next: (created) => this.upsert(created),
      error: (error: unknown) => this.fail(error),
    });
  }

  select(item: GpsRemittance): void {
    this.selected = item;
  }

  downloadUrl(item: GpsRemittance): string {
    return `/api/v1/admin/fiscal/gps/${item.id}/txt`;
  }

  money(value: string): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  }

  private upsert(item: GpsRemittance): void {
    const index = this.remittances.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      this.remittances[index] = item;
    } else {
      this.remittances = [item, ...this.remittances];
    }
    this.selected = item;
    this.busy = false;
    this.loading = false;
  }

  private fail(error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : 'Operacao GPS indisponivel.';
    this.busy = false;
    this.loading = false;
  }
}
