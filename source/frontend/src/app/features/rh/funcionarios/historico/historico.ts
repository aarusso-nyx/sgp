import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { RhCareerHistoryEvent, RhWorkflows } from '../../services/rh-workflows';

@Component({
  selector: 'app-rh-funcionarios-historico',
  standalone: false,
  templateUrl: './historico.html',
  styleUrl: './historico.scss',
})
export class RhFuncionariosHistorico implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  employeeId = '';
  startDate = '';
  endDate = '';
  type = '';
  events: RhCareerHistoryEvent[] = [];
  loading = false;
  error = '';

  constructor(private readonly rhWorkflows: RhWorkflows) {}

  ngOnInit(): void {
    this.employeeId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.rhWorkflows
      .getEmployeeHistory(this.employeeId, {
        startDate: this.startDate || undefined,
        endDate: this.endDate || undefined,
        type: this.type || undefined,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (events) => {
          this.events = events;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar o historico funcional.';
        },
      });
  }
}
