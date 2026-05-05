import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';

import {
  ESocialExcludableEvent,
  ESocialExclusaoService,
  S3000RequestStatus,
} from './esocial-exclusao.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-exclusao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './esocial-exclusao.html',
  styleUrl: './esocial-exclusao.scss',
})
export class ESocialExclusao implements OnInit {
  private readonly service = inject(ESocialExclusaoService);

  events: ESocialExcludableEvent[] = [];
  requests: S3000RequestStatus[] = [];
  selected: ESocialExcludableEvent | null = null;
  justification = '';
  loading = false;
  submitting = false;
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const { events, requests } = await firstValueFrom(
        forkJoin({
          events: this.service.events(),
          requests: this.service.requests(),
        }),
      );
      this.events = events;
      this.requests = requests;
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m026;
    } finally {
      this.loading = false;
    }
  }

  open(event: ESocialExcludableEvent): void {
    this.selected = event;
    this.justification = '';
    this.error = '';
  }

  close(): void {
    this.selected = null;
    this.justification = '';
  }

  async submit(): Promise<void> {
    if (!this.selected || this.justification.trim().length < 30) return;
    this.submitting = true;
    this.error = '';
    try {
      await firstValueFrom(this.service.exclude(this.selected.id, this.justification.trim()));
      this.close();
      await this.load();
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m027;
    } finally {
      this.submitting = false;
    }
  }
}
