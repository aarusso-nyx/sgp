import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  TceCircuitState,
  TceQueueApiService,
  TceQueueJob,
  TceSubmissionAttempt,
} from './tce-queue.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tce-queue',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './tce-queue.html',
  styleUrl: './tce-queue.scss',
})
export class TceQueue {
  private readonly service = inject(TceQueueApiService);

  jobs: TceQueueJob[] = [];
  circuits: TceCircuitState[] = [];
  selected: TceQueueJob | null = null;
  adapter = '';
  stateCode = '';
  status = '';
  competence = '';
  loading = false;
  busyId = '';
  errorMessage = '';

  readonly statuses = ['PENDING', 'LOCKED', 'SUCCEEDED', 'FAILED', 'RETRY', 'DEAD_LETTER'];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.service
      .list({
        adapter: this.adapter.trim() || undefined,
        stateCode: this.stateCode.trim() || undefined,
        status: this.status || undefined,
        competence: this.competence.trim() || undefined,
      })
      .subscribe({
        next: (items) => {
          this.jobs = items;
          this.selected = this.keepSelection(items);
          this.loading = false;
        },
        error: (error: unknown) => this.fail(error),
      });
    this.service.circuits().subscribe({
      next: (items) => {
        this.circuits = items;
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  select(job: TceQueueJob): void {
    this.busyId = job.id;
    this.service.get(job.id).subscribe({
      next: (details) => {
        this.selected = details;
        this.busyId = '';
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  replay(job: TceQueueJob): void {
    this.busyId = job.id;
    this.service.replay(job.id).subscribe({
      next: (updated) => {
        this.upsert(updated);
        this.busyId = '';
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  reset(circuit: TceCircuitState): void {
    const key = `${circuit.adapterId}:${circuit.endpointUrl}`;
    this.busyId = key;
    this.service.resetCircuit(circuit.adapterId, circuit.endpointUrl).subscribe({
      next: (updated) => {
        this.circuits = this.circuits.map((entry) =>
          entry.adapterId === updated.adapterId && entry.endpointUrl === updated.endpointUrl
            ? updated
            : entry,
        );
        this.busyId = '';
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  canReplay(job: TceQueueJob): boolean {
    return ['FAILED', 'RETRY', 'DEAD_LETTER'].includes(job.status);
  }

  attemptNumber(attempt: TceSubmissionAttempt): number {
    return attempt.attemptNumber ?? attempt.attempt_number ?? 0;
  }

  attemptStarted(attempt: TceSubmissionAttempt): string {
    return attempt.startedAt ?? attempt.started_at ?? '-';
  }

  attemptFinished(attempt: TceSubmissionAttempt): string {
    return attempt.finishedAt ?? attempt.finished_at ?? '-';
  }

  attemptError(attempt: TceSubmissionAttempt): string {
    return JSON.stringify(attempt.errorPayload ?? attempt.error_payload ?? {});
  }

  errorPayload(job: TceQueueJob): string {
    return JSON.stringify(job.lastErrorPayload ?? {});
  }

  circuitBusy(circuit: TceCircuitState): boolean {
    return this.busyId === `${circuit.adapterId}:${circuit.endpointUrl}`;
  }

  private upsert(job: TceQueueJob): void {
    const index = this.jobs.findIndex((entry) => entry.id === job.id);
    if (index >= 0) {
      this.jobs[index] = job;
    } else {
      this.jobs = [job, ...this.jobs];
    }
    this.selected = job;
  }

  private keepSelection(items: TceQueueJob[]): TceQueueJob | null {
    if (!this.selected) return items[0] ?? null;
    return items.find((item) => item.id === this.selected?.id) ?? items[0] ?? null;
  }

  private fail(error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : 'Fila TCE indisponivel.';
    this.busyId = '';
    this.loading = false;
  }
}
