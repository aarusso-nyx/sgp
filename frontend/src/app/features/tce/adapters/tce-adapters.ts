import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TceAdapterRegistry, TceAdaptersApiService } from './tce-adapters.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tce-adapters',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './tce-adapters.html',
  styleUrl: './tce-adapters.scss',
})
export class TceAdapters {
  private readonly service = inject(TceAdaptersApiService);

  adapters: TceAdapterRegistry[] = [];
  selected: TceAdapterRegistry | null = null;
  loading = false;
  busyId = '';
  errorMessage = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.service.list().subscribe({
      next: (items) => {
        this.adapters = items;
        this.selected = this.keepSelection(items);
        this.loading = false;
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  select(adapter: TceAdapterRegistry): void {
    this.selected = adapter;
  }

  enable(adapter: TceAdapterRegistry): void {
    this.transition(adapter, 'enable');
  }

  disable(adapter: TceAdapterRegistry): void {
    this.transition(adapter, 'disable');
  }

  isBusy(adapter: TceAdapterRegistry): boolean {
    return this.busyId === adapter.adapterId;
  }

  layoutSummary(adapter: TceAdapterRegistry): string {
    const layouts = adapter.capabilities['layouts'];
    if (!Array.isArray(layouts)) return '-';
    return layouts
      .map((layout) => {
        if (!layout || typeof layout !== 'object') return '';
        const entry = layout as Record<string, unknown>;
        return `${entry['code'] ?? 'layout'} ${entry['version'] ?? ''}`.trim();
      })
      .filter(Boolean)
      .join(', ');
  }

  payloadSummary(payload: Record<string, unknown>): string {
    return JSON.stringify(payload);
  }

  private transition(adapter: TceAdapterRegistry, action: 'enable' | 'disable'): void {
    this.busyId = adapter.adapterId;
    this.errorMessage = '';
    const request =
      action === 'enable'
        ? this.service.enable(adapter.adapterId)
        : this.service.disable(adapter.adapterId);
    request.subscribe({
      next: (updated) => this.upsert(updated),
      error: (error: unknown) => this.fail(error),
    });
  }

  private upsert(adapter: TceAdapterRegistry): void {
    const index = this.adapters.findIndex((entry) => entry.adapterId === adapter.adapterId);
    if (index >= 0) {
      this.adapters[index] = adapter;
    } else {
      this.adapters = [adapter, ...this.adapters];
    }
    this.selected = adapter;
    this.busyId = '';
    this.loading = false;
  }

  private keepSelection(items: TceAdapterRegistry[]): TceAdapterRegistry | null {
    if (!this.selected) return items[0] ?? null;
    return items.find((item) => item.adapterId === this.selected?.adapterId) ?? items[0] ?? null;
  }

  private fail(error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : 'Registro TCE indisponivel.';
    this.busyId = '';
    this.loading = false;
  }
}
