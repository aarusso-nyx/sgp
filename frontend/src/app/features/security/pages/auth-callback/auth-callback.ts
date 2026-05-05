import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StynxSessionService } from '@stynx-web/angular-auth';

import { SGP_FEATURE_I18N_MESSAGES } from '../../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-auth-callback',
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './auth-callback.html',
  styleUrl: './auth-callback.scss',
})
export class AuthCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(StynxSessionService);

  message = SGP_FEATURE_I18N_MESSAGES.m234;

  ngOnInit(): void {
    void this.completeLogin();
  }

  private async completeLogin(): Promise<void> {
    const error = this.route.snapshot.queryParamMap.get('error');
    const code = this.route.snapshot.queryParamMap.get('code');

    if (error) {
      this.message = SGP_FEATURE_I18N_MESSAGES.m235;
      return;
    }

    if (!code) {
      this.message = SGP_FEATURE_I18N_MESSAGES.m236;
      return;
    }

    this.message = SGP_FEATURE_I18N_MESSAGES.m234;

    try {
      await this.session.completeLogin(window.location.href);
      await this.router.navigateByUrl('/gestao');
    } catch {
      this.message = SGP_FEATURE_I18N_MESSAGES.m235;
    }
  }
}
