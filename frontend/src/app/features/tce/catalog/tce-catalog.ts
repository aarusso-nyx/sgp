import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

import {
  TceCatalogApiService,
  TceCatalogState,
  TceLayoutField,
  TceLayoutVersion,
} from './tce-catalog.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tce-catalog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './tce-catalog.html',
  styleUrl: './tce-catalog.scss',
})
export class TceCatalog {
  private readonly service = inject(TceCatalogApiService);

  states: TceCatalogState[] = [];
  layouts: TceLayoutVersion[] = [];
  fields: TceLayoutField[] = [];
  selectedState: TceCatalogState | null = null;
  selectedLayout: TceLayoutVersion | null = null;
  loading = false;
  busyLayoutId = '';
  errorMessage = '';

  constructor() {
    void this.loadStates();
  }

  async loadStates(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const states = await firstValueFrom(this.service.states());
      this.states = states;
      this.loading = false;
      if (!this.selectedState) {
        const initial = states.find((state) => state.code === 'SP') ?? states[0] ?? null;
        if (initial) void this.selectState(initial);
      }
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  async selectState(state: TceCatalogState): Promise<void> {
    this.selectedState = state;
    this.selectedLayout = null;
    this.fields = [];
    try {
      const layouts = await firstValueFrom(this.service.layouts(state.code));
      this.layouts = layouts;
      this.selectedLayout = layouts[0] ?? null;
      if (this.selectedLayout) await this.loadFields(this.selectedLayout);
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  selectLayout(layout: TceLayoutVersion): void {
    this.selectedLayout = layout;
    void this.loadFields(layout);
  }

  activate(layout: TceLayoutVersion): void {
    void this.transition(layout, 'ACTIVE');
  }

  supersede(layout: TceLayoutVersion): void {
    void this.transition(layout, 'SUPERSEDED');
  }

  private async loadFields(layout: TceLayoutVersion): Promise<void> {
    try {
      this.fields = await firstValueFrom(this.service.fields(layout.id));
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  private async transition(
    layout: TceLayoutVersion,
    status: 'ACTIVE' | 'SUPERSEDED',
  ): Promise<void> {
    this.busyLayoutId = layout.id;
    try {
      const updated = await firstValueFrom(this.service.transition(layout.id, status));
      this.layouts = this.layouts.map((entry) => (entry.id === updated.id ? updated : entry));
      this.selectedLayout = updated;
      this.busyLayoutId = '';
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : 'Catalogo TCE indisponivel.';
    this.loading = false;
    this.busyLayoutId = '';
  }
}
