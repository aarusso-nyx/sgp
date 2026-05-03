import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApiClient } from '../../../../core/api/api-client';

interface AbonoPermanenciaState {
  employeeId: string;
  active: boolean;
  startsOn: string | null;
  legalBasis: string | null;
  updatedAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rh-abono-permanencia',
  standalone: false,
  templateUrl: './abono-permanencia.html',
  styleUrl: './abono-permanencia.scss',
})
export class RhAbonoPermanencia implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private employeeId = '';

  loading = false;
  saving = false;
  error = '';
  message = '';

  readonly form = this.fb.group({
    active: [false],
    startsOn: [''],
    legalBasis: ['', [Validators.maxLength(500)]],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiClient,
  ) {}

  ngOnInit(): void {
    this.employeeId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.error = '';
    this.api
      .get<AbonoPermanenciaState>(`/api/v1/funcionarios/${this.employeeId}/abono-permanencia`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.form.patchValue({
            active: state.active,
            startsOn: state.startsOn ?? '',
            legalBasis: state.legalBasis ?? '',
          });
          this.loading = false;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar o abono permanencia.';
          this.loading = false;
        },
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    if (value.active && (!value.startsOn || !value.legalBasis)) {
      this.error = 'Informe inicio e fundamento legal para ativar o abono.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.message = '';
    this.api
      .post<AbonoPermanenciaState>(`/api/v1/funcionarios/${this.employeeId}/abono-permanencia`, {
        active: Boolean(value.active),
        startsOn: value.startsOn || undefined,
        legalBasis: value.legalBasis || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.message = state.active
            ? 'Abono permanencia ativado.'
            : 'Abono permanencia desativado.';
          this.saving = false;
        },
        error: () => {
          this.error = 'Nao foi possivel salvar o abono permanencia.';
          this.saving = false;
        },
      });
  }
}
