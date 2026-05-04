import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface PgrProgram {
  id: string;
  workLocationName: string | null;
  validFrom: string;
  validUntil: string;
  responsibleEngineerId: string | null;
  riskSnapshot: unknown[];
  status: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-pgr',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pgr.html',
  styleUrl: './pgr.scss',
})
export class SaudePgr {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly form = this.formBuilder.group({
    workLocationId: ['', [Validators.required]],
    validFrom: ['', [Validators.required]],
    validUntil: ['', [Validators.required]],
    responsibleEngineerId: [''],
  });

  programs: PgrProgram[] = [];
  saving = false;

  async load(): Promise<void> {
    this.programs = await firstValueFrom(this.api.get<PgrProgram[]>('v1/saude/programas/pgr'));
  }

  async create(): Promise<void> {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saving = true;
    try {
      const program = await firstValueFrom(
        this.api.post<PgrProgram, Record<string, unknown>>(
          'v1/saude/programas/pgr',
          this.form.value,
        ),
      );
      this.programs = [program, ...this.programs];
    } finally {
      this.saving = false;
    }
  }

  async activate(program: PgrProgram): Promise<void> {
    await firstValueFrom(
      this.api.patch<PgrProgram, Record<string, never>>(
        `v1/saude/programas/pgr/${program.id}/ativar`,
        {},
      ),
    );
    await this.load();
  }
}
