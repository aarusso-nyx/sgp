import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

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

  message = 'Processando retorno da autenticação...';

  ngOnInit(): void {
    const error = this.route.snapshot.queryParamMap.get('error');
    const code = this.route.snapshot.queryParamMap.get('code');

    if (error) {
      this.message = 'Não foi possível concluir a autenticação. Tente acessar novamente.';
      return;
    }

    if (!code) {
      this.message = 'Callback recebido sem código OAuth2. Fluxo ainda em modo placeholder.';
      return;
    }

    this.message =
      'Código de autorização recebido. A troca por token será implementada nesta rota.';

    setTimeout(() => {
      void this.router.navigateByUrl('/gestao');
    }, 1200);
  }
}
