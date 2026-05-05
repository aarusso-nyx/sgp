import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';

import { ApiClient } from '../../../core/api/api-client';

interface UpcomingRosterEntry {
  workDate: string;
  expectedEntry: string | null;
  expectedExit: string | null;
  expectedMinutes: number;
  nightShiftFlag: boolean;
  hazardFlag: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-proximas-escalas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proximas-escalas.html',
  styleUrl: './proximas-escalas.scss',
})
export class ProximasEscalas implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly cdr = inject(ChangeDetectorRef);

  entries: UpcomingRosterEntry[] = [];
  error = '';

  ngOnInit(): void {
    this.api.get<UpcomingRosterEntry[]>('v1/ponto/escalas/proximas').subscribe({
      next: (entries) => {
        this.entries = entries;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Nao foi possivel carregar suas proximas escalas.';
        this.cdr.markForCheck();
      },
    });
  }
}
