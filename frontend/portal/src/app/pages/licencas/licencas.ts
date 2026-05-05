import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';

type LicencasSection = 'solicitacoes' | 'historico' | 'documentos';

interface LeaveRecord {
  id: string;
  reason: string;
  startsOn: string;
  endsOn: string;
  days: number;
  paid: boolean;
  status: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-licencas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './licencas.html',
  styleUrl: './licencas.scss',
})
export class Licencas implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.nonNullable.group({
    employeeId: ['', [Validators.required]],
    reason: ['maternidade', [Validators.required]],
    startsOn: ['', [Validators.required]],
    days: [120, [Validators.min(1)]],
    supportingDocumentRef: [''],
    notes: [''],
  });

  readonly reasons = [
    'maternidade',
    'paternidade',
    'adotante',
    'premio',
    'capacitacao',
    'interesse_particular',
    'conjuge',
    'mandato_classista',
    'atividade_politica',
    'mandato_eletivo',
    'falecimento',
    'doacao_sangue',
    'pessoa_familia',
  ];

  section: LicencasSection = 'solicitacoes';
  records: LeaveRecord[] = [];
  saving = false;
  loading = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.route.url.pipe(takeUntil(this.destroy$)).subscribe((segments) => {
      this.section = (segments.at(-1)?.path ?? 'solicitacoes') as LicencasSection;
      this.message = '';
      this.error = '';
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHistory(): void {
    const employeeId = this.form.controls.employeeId.value.trim();
    if (!employeeId) {
      this.form.controls.employeeId.markAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .get<LeaveRecord[]>(`v1/licencas/${employeeId}`)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (records) => {
          this.records = records;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar as licencas.';
        },
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    this.saving = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .post<LeaveRecord, Record<string, unknown>>('v1/licencas', payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (record) => {
          this.records = [record, ...this.records.filter((item) => item.id !== record.id)];
          this.message = 'Solicitacao de licenca enviada.';
        },
        error: () => {
          this.error = 'Nao foi possivel enviar a solicitacao de licenca.';
        },
      });
  }
}
