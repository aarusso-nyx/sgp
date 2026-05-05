import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

import {
  ESocialTrabalhadoresService,
  ESocialWorkerEventQueue,
  ESocialWorkerDispatchResult,
  ESocialWorkerStatus,
} from './esocial-trabalhadores.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-trabalhadores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './esocial-trabalhadores.html',
  styleUrl: './esocial-trabalhadores.scss',
})
export class ESocialTrabalhadores implements OnInit {
  private readonly service = inject(ESocialTrabalhadoresService);
  rows: ESocialWorkerStatus[] = [];
  eventRows: ESocialWorkerEventQueue[] = [];
  lastResult: ESocialWorkerDispatchResult | null = null;
  loading = false;
  emitting = '';
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const { rows, eventRows } = await firstValueFrom(
        forkJoin({
          rows: this.service.status(),
          eventRows: this.service.eventQueue(),
        }),
      );
      this.rows = rows;
      this.eventRows = eventRows;
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m038;
    } finally {
      this.loading = false;
    }
  }

  reemitS2200(row: ESocialWorkerStatus): void {
    void this.run(row.employeeId, () => this.service.reemitS2200(row.employeeId));
  }

  emitWorkerEvent(row: ESocialWorkerEventQueue): void {
    const request =
      row.eventKind === 'S-2210'
        ? this.service.emitS2210(row.catEmissionId ?? row.sourceId)
        : row.eventKind === 'S-2220'
          ? this.service.retryS2220(row.asoRecordId ?? row.sourceId)
          : row.eventKind === 'S-2240'
            ? this.service.emitS2240(
                row.environmentalExposureId ?? row.sourceId,
                row.triggerEvent ?? 'START',
              )
            : row.eventKind === 'S-2230'
              ? this.service.emitS2230(row.id)
              : this.service.emitS2299(row.id);
    void this.run(row.id, () => request);
  }

  emitS2205(row: ESocialWorkerStatus): void {
    void this.run(row.employeeId, () => this.service.emitS2205(row.employeeId));
  }

  private async run(
    marker: string,
    callback: () => ReturnType<ESocialTrabalhadoresService['emitS2205']>,
  ): Promise<void> {
    this.emitting = marker;
    this.error = '';
    try {
      this.lastResult = await firstValueFrom(callback());
      await this.load();
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m039;
    } finally {
      this.emitting = '';
    }
  }
}
