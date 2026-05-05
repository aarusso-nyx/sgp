import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sgp-govbr-sign-callback',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './govbr-sign-callback.html',
  styleUrl: './govbr-sign-callback.scss',
})
export class GovBrSignCallback {
  private readonly route = inject(ActivatedRoute);

  get status(): string {
    return this.route.snapshot.queryParamMap.get('status') ?? 'unknown';
  }

  get signatureRequestId(): string {
    return this.route.snapshot.queryParamMap.get('signatureRequestId') ?? '';
  }

  get signed(): boolean {
    return this.status === 'signed';
  }
}
