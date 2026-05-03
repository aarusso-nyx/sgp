import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';

import { PontoBiometriaService } from '../../../ponto/biometria/ponto-biometria.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-biometria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './portal-biometria.html',
  styleUrl: './portal-biometria.scss',
})
export class PortalBiometria {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoBiometriaService);

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
  });

  saving = false;
  message = '';
  error = '';

  revoke(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.service.withdraw(this.form.value.employeeId).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Solicitacao registrada.';
      },
      error: () => {
        this.saving = false;
        this.error = 'Nao foi possivel registrar a solicitacao.';
      },
    });
  }
}
