import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  ESocialReturnFailure,
  ESocialReturnStatus,
  ESocialRetornosService,
} from './esocial-retornos.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-retornos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './esocial-retornos.html',
  styleUrl: './esocial-retornos.scss',
})
export class ESocialRetornos implements OnInit {
  private readonly service = inject(ESocialRetornosService);
  failures: ESocialReturnFailure[] = [];
  selected: ESocialReturnFailure | null = null;
  loading = false;
  actionEventId = '';
  activeStatus: ESocialReturnStatus | '' = '';
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(status: ESocialReturnStatus | '' = this.activeStatus): Promise<void> {
    this.loading = true;
    this.error = '';
    this.activeStatus = status;
    try {
      const failures = await firstValueFrom(this.service.listFailures(status || undefined));
      this.failures = failures;
      this.selected =
        failures.find((failure) => failure.eventId === this.selected?.eventId) ??
        failures[0] ??
        null;
    } catch {
      this.error = 'Nao foi possivel carregar os retornos.';
    } finally {
      this.loading = false;
    }
  }

  select(failure: ESocialReturnFailure): void {
    this.selected = failure;
  }

  async forceRetry(failure: ESocialReturnFailure): Promise<void> {
    this.actionEventId = failure.eventId;
    this.error = '';
    try {
      await firstValueFrom(this.service.forceRetry(failure.eventId));
      await this.load();
    } catch {
      this.error = 'Nao foi possivel forcar o retry.';
    } finally {
      this.actionEventId = '';
    }
  }

  async markHandled(failure: ESocialReturnFailure): Promise<void> {
    this.actionEventId = failure.eventId;
    this.error = '';
    try {
      await firstValueFrom(this.service.markHandled(failure.eventId));
      await this.load();
    } catch {
      this.error = 'Nao foi possivel marcar como tratado.';
    } finally {
      this.actionEventId = '';
    }
  }

  definitiveFailures(): ESocialReturnFailure[] {
    return this.failures.filter((failure) => failure.status === 'ERRO_DEFINITIVO');
  }

  recoverableFailures(): ESocialReturnFailure[] {
    return this.failures.filter((failure) => failure.status === 'ERRO_TECNICO_RETENTAVEL');
  }

  canMarkHandled(failure: ESocialReturnFailure): boolean {
    return failure.status === 'ERRO_DEFINITIVO';
  }

  canRetry(failure: ESocialReturnFailure): boolean {
    return failure.status === 'ERRO_TECNICO_RETENTAVEL';
  }

  shortId(value: string): string {
    return value.slice(0, 8);
  }
}
