import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface WorkAccident {
  id: string;
  employeeId: string;
  employeeName: string | null;
  accidentAt: string;
  accidentType: string;
  severity: string;
  deathAt: string | null;
  status: string;
  latestCatKind: string | null;
  latestDeadlineAt: string | null;
}

interface CatDeadlineAlert {
  id: string;
  workAccidentId: string;
  employeeName: string;
  catKind: string;
  deadlineAt: string;
  enqueuedAt: string | null;
  esocialEventId: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-acidentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './acidentes.html',
  styleUrl: './acidentes.scss',
})
export class SaudeAcidentes implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly accidentForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    accidentAt: ['', [Validators.required]],
    accidentType: ['TIPICO', [Validators.required]],
    locationText: ['', [Validators.required]],
    bodyPartCode: ['000000001', [Validators.required]],
    agentCauseCode: ['000000001', [Validators.required]],
    witnessText: [''],
    severity: ['LEVE', [Validators.required]],
    deathAt: [''],
  });

  readonly catForm = this.formBuilder.group({
    workAccidentId: ['', [Validators.required]],
    catKind: ['INICIAL', [Validators.required]],
    doctorCrm: ['', [Validators.required]],
    doctorName: ['', [Validators.required]],
    internment: [false],
    leaveUntil: [''],
  });

  accidents: WorkAccident[] = [];
  alerts: CatDeadlineAlert[] = [];
  saving = false;
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const { accidents, alerts } = await firstValueFrom(
      forkJoin({
        accidents: this.api.get<WorkAccident[]>('v1/saude/acidentes'),
        alerts: this.api.get<CatDeadlineAlert[]>('v1/saude/acidentes/prazos'),
      }),
    );
    this.accidents = accidents;
    this.alerts = alerts;
  }

  register(): void {
    if (this.accidentForm.invalid) return this.accidentForm.markAllAsTouched();
    void this.save('v1/saude/acidentes', this.compact(this.accidentForm.value));
  }

  emitCat(): void {
    if (this.catForm.invalid) return this.catForm.markAllAsTouched();
    const workAccidentId = String(this.catForm.value['workAccidentId']);
    const payload = this.compact({ ...this.catForm.value, workAccidentId: undefined });
    void this.save(`v1/saude/acidentes/${workAccidentId}/cat`, payload);
  }

  async close(record: WorkAccident): Promise<void> {
    this.saving = true;
    try {
      await firstValueFrom(
        this.api.patch<WorkAccident, Record<string, never>>(
          `v1/saude/acidentes/${record.id}/encerrar`,
          {},
        ),
      );
      await this.load();
    } catch {
      this.error = 'Nao foi possivel encerrar o acidente.';
    } finally {
      this.saving = false;
    }
  }

  select(record: WorkAccident, catKind = 'INICIAL'): void {
    this.catForm.patchValue({ workAccidentId: record.id, catKind });
  }

  private async save(path: string, payload: Record<string, unknown>): Promise<void> {
    this.saving = true;
    this.error = '';
    try {
      await firstValueFrom(this.api.post<unknown, Record<string, unknown>>(path, payload));
      await this.load();
    } catch {
      this.error = 'Nao foi possivel salvar a CAT.';
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
