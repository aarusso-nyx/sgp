import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { PontoJustificativa, PontoJustificativasService } from './ponto-justificativas.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ponto-justificativas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ponto-justificativas.html',
  styleUrl: './ponto-justificativas.scss',
})
export class PontoJustificativas implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoJustificativasService);

  readonly decisionForm = this.formBuilder.group({
    approverUserId: ['', [Validators.required]],
    reason: [''],
  });

  requests: PontoJustificativa[] = [];
  filter = 'REQUESTED';
  loading = false;
  saving = false;
  error = '';
  message = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(status = this.filter): void {
    this.filter = status;
    this.loading = true;
    this.error = '';
    this.service
      .list(status || undefined)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (requests) => {
          this.requests = requests;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar justificativas.';
        },
      });
  }

  decide(request: PontoJustificativa, decision: 'APPROVED' | 'REJECTED'): void {
    if (this.decisionForm.invalid) {
      this.decisionForm.markAllAsTouched();
      return;
    }
    const value = this.decisionForm.value as { approverUserId: string; reason: string };
    this.saving = true;
    this.service
      .decide(request.absenceJustificationId, {
        decision,
        approverUserId: value.approverUserId,
        reason: value.reason,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message =
            decision === 'APPROVED' ? 'Justificativa aprovada.' : 'Justificativa rejeitada.';
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel decidir a justificativa.';
        },
      });
  }
}
