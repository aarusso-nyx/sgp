import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  ESocialTabelasService,
  S1xxxDispatchResult,
  S1xxxEventKind,
  S1xxxStatus,
} from './esocial-tabelas.service';

const EVENT_KINDS: S1xxxEventKind[] = ['S-1000', 'S-1005', 'S-1010', 'S-1020', 'S-1050', 'S-1070'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-tabelas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './esocial-tabelas.html',
  styleUrl: './esocial-tabelas.scss',
})
export class ESocialTabelas implements OnInit {
  private readonly service = inject(ESocialTabelasService);
  readonly eventKinds = EVENT_KINDS;
  statuses: S1xxxStatus[] = [];
  lastResults: S1xxxDispatchResult[] = [];
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
      this.statuses = await firstValueFrom(this.service.status());
    } catch {
      this.error = 'Nao foi possivel carregar as tabelas iniciais.';
    } finally {
      this.loading = false;
    }
  }

  async emitAll(): Promise<void> {
    await this.emit('all', () => this.service.emitAll(true));
  }

  async emitOne(eventKind: S1xxxEventKind): Promise<void> {
    await this.emit(eventKind, () => this.service.emitOne(eventKind, true));
  }

  statusFor(eventKind: S1xxxEventKind): S1xxxStatus | undefined {
    return this.statuses.find((status) => status.eventKind === eventKind);
  }

  private async emit(
    marker: string,
    callback: () => ReturnType<ESocialTabelasService['emitAll']>,
  ): Promise<void> {
    this.emitting = marker;
    this.error = '';
    this.lastResults = [];
    try {
      this.lastResults = await firstValueFrom(callback());
      await this.load();
    } catch {
      this.error = 'Nao foi possivel emitir os deltas S-1xxx.';
    } finally {
      this.emitting = '';
    }
  }
}
