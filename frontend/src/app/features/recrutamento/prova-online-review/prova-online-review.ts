import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface TimelineEvent {
  at: string;
  kind: string;
  severity: 'INFO' | 'WARN' | 'SEVERE';
  evidenceRef: string;
  decision: 'PENDING' | 'ACCEPT' | 'REJECT';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-recrutamento-prova-online-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prova-online-review.html',
  styleUrl: './prova-online-review.scss',
})
export class RecrutamentoProvaOnlineReview {
  selectedSessionId = '00000000-0000-4000-8000-000000000824';
  voidReason = '';
  decision = 'PENDING';
  events: TimelineEvent[] = [
    {
      at: '2026-05-02T12:05:15Z',
      kind: 'SNAPSHOT',
      severity: 'INFO',
      evidenceRef: 's3://tenant/proctoring/snapshot-001.jpg',
      decision: 'PENDING',
    },
    {
      at: '2026-05-02T12:11:02Z',
      kind: 'SCREEN_SHARE_LOST',
      severity: 'SEVERE',
      evidenceRef: 's3://tenant/proctoring/frame-044.jpg',
      decision: 'PENDING',
    },
    {
      at: '2026-05-02T12:12:40Z',
      kind: 'VOICE_MISMATCH',
      severity: 'SEVERE',
      evidenceRef: 's3://tenant/proctoring/audio-011.txt',
      decision: 'PENDING',
    },
  ];

  accept(): void {
    this.decision = 'ACCEPT';
    this.events = this.events.map((event) => ({ ...event, decision: 'ACCEPT' }));
  }

  voidSession(): void {
    this.decision = 'REJECT';
    this.events = this.events.map((event) => ({ ...event, decision: 'REJECT' }));
  }
}
