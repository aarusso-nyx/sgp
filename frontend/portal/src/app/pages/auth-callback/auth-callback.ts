import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { StynxSessionService } from '@stynx-web/angular-auth';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sgp-portal-auth-callback',
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './auth-callback.html',
  styleUrl: './auth-callback.scss',
})
export class PortalAuthCallback implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly session = inject(StynxSessionService);

  message = 'Concluindo autenticação.';

  ngOnInit(): void {
    void this.completeLogin();
  }

  private async completeLogin(): Promise<void> {
    try {
      await this.session.completeLogin(window.location.href);
      await this.router.navigateByUrl('/');
    } catch {
      this.message = 'Não foi possível concluir a autenticação.';
      this.cdr.markForCheck();
    }
  }
}
