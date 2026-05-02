import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  TceCatalogApiService,
  TceCatalogState,
  TceLayoutField,
  TceLayoutVersion,
} from './tce-catalog.service';

@Component({
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
    this.loadStates();
  }

  loadStates(): void {
    this.loading = true;
    this.errorMessage = '';
    this.service.states().subscribe({
      next: (states) => {
        this.states = states;
        this.loading = false;
        if (!this.selectedState) {
          const initial = states.find((state) => state.code === 'SP') ?? states[0] ?? null;
          if (initial) this.selectState(initial);
        }
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  selectState(state: TceCatalogState): void {
    this.selectedState = state;
    this.selectedLayout = null;
    this.fields = [];
    this.service.layouts(state.code).subscribe({
      next: (layouts) => {
        this.layouts = layouts;
        this.selectedLayout = layouts[0] ?? null;
        if (this.selectedLayout) this.loadFields(this.selectedLayout);
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  selectLayout(layout: TceLayoutVersion): void {
    this.selectedLayout = layout;
    this.loadFields(layout);
  }

  activate(layout: TceLayoutVersion): void {
    this.transition(layout, 'ACTIVE');
  }

  supersede(layout: TceLayoutVersion): void {
    this.transition(layout, 'SUPERSEDED');
  }

  private loadFields(layout: TceLayoutVersion): void {
    this.service.fields(layout.id).subscribe({
      next: (fields) => {
        this.fields = fields;
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  private transition(layout: TceLayoutVersion, status: 'ACTIVE' | 'SUPERSEDED'): void {
    this.busyLayoutId = layout.id;
    this.service.transition(layout.id, status).subscribe({
      next: (updated) => {
        this.layouts = this.layouts.map((entry) => (entry.id === updated.id ? updated : entry));
        this.selectedLayout = updated;
        this.busyLayoutId = '';
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  private fail(error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : 'Catalogo TCE indisponivel.';
    this.loading = false;
    this.busyLayoutId = '';
  }
}
