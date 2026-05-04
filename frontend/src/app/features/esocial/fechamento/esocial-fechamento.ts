import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ESocialClosureState, ESocialFechamentoService } from './esocial-fechamento.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-fechamento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './esocial-fechamento.html',
  styleUrl: './esocial-fechamento.scss',
})
export class ESocialFechamento implements OnInit {
  private readonly service = inject(ESocialFechamentoService);
  year = 2026;
  month = 1;
  state: ESocialClosureState | null = null;
  loading = false;
  closing = false;
  error = '';
  lastHash = '';

  ngOnInit(): void {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth() + 1;
    void this.load();
  }

  get canClose(): boolean {
    return Boolean(this.state && this.state.pending.length === 0 && !this.closing);
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.state = await firstValueFrom(this.service.status(this.year, this.month));
    } catch {
      this.error = 'Nao foi possivel carregar o fechamento.';
    } finally {
      this.loading = false;
    }
  }

  async close(): Promise<void> {
    if (!this.canClose) return;
    this.closing = true;
    this.error = '';
    try {
      const result = await firstValueFrom(this.service.close(this.year, this.month));
      this.lastHash = result.xmlHash;
      this.state = result.state;
    } catch {
      this.error = 'Nao foi possivel fechar a competencia.';
    } finally {
      this.closing = false;
    }
  }
}
