import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

import { AudespSpApiService, AudespSubmission } from './audesp-sp.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

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
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const items = await firstValueFrom(this.service.list(this.year, this.month));
      this.submissions = items;
      this.selected = this.keepSelection(items);
      this.loading = false;
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  async create(): Promise<void> {
    const payrollRunId = this.payrollRunId.trim();
    if (!payrollRunId) return;
    this.loading = true;
    this.errorMessage = '';
    try {
      this.upsert(await firstValueFrom(this.service.create(payrollRunId)));
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  select(submission: AudespSubmission): void {
    this.selected = submission;
  }

  validate(submission: AudespSubmission): void {
    void this.transition(submission, 'validate');
  }

  submit(submission: AudespSubmission): void {
    void this.transition(submission, 'submit');
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

  private async transition(
    submission: AudespSubmission,
    action: 'validate' | 'submit',
  ): Promise<void> {
    this.busyId = submission.id;
    this.errorMessage = '';
    const request =
      action === 'validate'
        ? this.service.validate(submission.id)
        : this.service.submit(submission.id);
    try {
      this.upsert(await firstValueFrom(request));
    } catch (error: unknown) {
      this.fail(error);
    }
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
    this.errorMessage = error instanceof Error ? error.message : SGP_FEATURE_I18N_MESSAGES.m238;
    this.busyId = '';
    this.loading = false;
  }
}
