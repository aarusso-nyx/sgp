import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { AudespSpApiService, AudespSubmission } from './audesp-sp.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audesp-sp',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './audesp-sp.html',
  styleUrl: './audesp-sp.scss',
})
export class AudespSp {
  private readonly service = inject(AudespSpApiService);

  submissions: AudespSubmission[] = [];
  selected: AudespSubmission | null = null;
  payrollRunId = '';
  year?: number;
  month?: number;
  loading = false;
  busyId = '';
  errorMessage = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.service.list(this.year, this.month).subscribe({
      next: (items) => {
        this.submissions = items;
        this.selected = this.keepSelection(items);
        this.loading = false;
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  create(): void {
    const payrollRunId = this.payrollRunId.trim();
    if (!payrollRunId) return;
    this.loading = true;
    this.errorMessage = '';
    this.service.create(payrollRunId).subscribe({
      next: (submission) => this.upsert(submission),
      error: (error: unknown) => this.fail(error),
    });
  }

  select(submission: AudespSubmission): void {
    this.selected = submission;
  }

  validate(submission: AudespSubmission): void {
    this.transition(submission, 'validate');
  }

  submit(submission: AudespSubmission): void {
    this.transition(submission, 'submit');
  }

  downloadXml(submission: AudespSubmission): void {
    window.open(this.service.envelopeUrl(submission.id), '_blank', 'noopener');
  }

  isBusy(submission: AudespSubmission): boolean {
    return this.busyId === submission.id;
  }

  responseSummary(submission: AudespSubmission): string {
    return JSON.stringify(submission.responsePayload);
  }

  private transition(submission: AudespSubmission, action: 'validate' | 'submit'): void {
    this.busyId = submission.id;
    this.errorMessage = '';
    const request =
      action === 'validate'
        ? this.service.validate(submission.id)
        : this.service.submit(submission.id);
    request.subscribe({
      next: (updated) => this.upsert(updated),
      error: (error: unknown) => this.fail(error),
    });
  }

  private upsert(submission: AudespSubmission): void {
    const index = this.submissions.findIndex((entry) => entry.id === submission.id);
    if (index >= 0) {
      this.submissions[index] = submission;
    } else {
      this.submissions = [submission, ...this.submissions];
    }
    this.selected = submission;
    this.busyId = '';
    this.loading = false;
  }

  private keepSelection(items: AudespSubmission[]): AudespSubmission | null {
    if (!this.selected) return items[0] ?? null;
    return items.find((item) => item.id === this.selected?.id) ?? items[0] ?? null;
  }

  private fail(error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : 'Submissao AUDESP indisponivel.';
    this.busyId = '';
    this.loading = false;
  }
}
