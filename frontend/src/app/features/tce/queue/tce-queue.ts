import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom, forkJoin } from 'rxjs';

import {
  TceCircuitState,
  TceQueueApiService,
  TceQueueJob,
  TceSubmissionAttempt,
} from './tce-queue.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

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
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const { jobs, circuits } = await firstValueFrom(
        forkJoin({
          jobs: this.service.list({
            ...(this.adapter.trim() ? { adapter: this.adapter.trim() } : {}),
            ...(this.stateCode.trim() ? { stateCode: this.stateCode.trim() } : {}),
            ...(this.status ? { status: this.status } : {}),
            ...(this.competence.trim() ? { competence: this.competence.trim() } : {}),
          }),
          circuits: this.service.circuits(),
        }),
      );
      this.jobs = jobs;
      this.selected = this.keepSelection(jobs);
      this.circuits = circuits;
      this.loading = false;
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  async select(job: TceQueueJob): Promise<void> {
    this.busyId = job.id;
    try {
      this.selected = await firstValueFrom(this.service.get(job.id));
      this.busyId = '';
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  async replay(job: TceQueueJob): Promise<void> {
    this.busyId = job.id;
    try {
      this.upsert(await firstValueFrom(this.service.replay(job.id)));
      this.busyId = '';
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  async reset(circuit: TceCircuitState): Promise<void> {
    const key = `${circuit.adapterId}:${circuit.endpointUrl}`;
    this.busyId = key;
    try {
      const updated = await firstValueFrom(
        this.service.resetCircuit(circuit.adapterId, circuit.endpointUrl),
      );
      this.circuits = this.circuits.map((entry) =>
        entry.adapterId === updated.adapterId && entry.endpointUrl === updated.endpointUrl
          ? updated
          : entry,
      );
      this.busyId = '';
    } catch (error: unknown) {
      this.fail(error);
    }
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
    this.errorMessage = error instanceof Error ? error.message : SGP_FEATURE_I18N_MESSAGES.m240;
    this.busyId = '';
    this.loading = false;
  }
}
