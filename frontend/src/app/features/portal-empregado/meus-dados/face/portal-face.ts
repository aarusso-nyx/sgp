import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';

import { FaceAdminService } from '../../../ponto/face-admin/face-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-face',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './portal-face.html',
  styleUrl: './portal-face.scss',
})
export class PortalFace {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(FaceAdminService);

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
  });

  status: Record<string, unknown> | null = null;
  saving = false;
  message = '';
  error = '';

  load(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error = '';
    this.service.status(this.form.value.employeeId).subscribe({
      next: (status) => {
        this.status = status as Record<string, unknown>;
      },
      error: () => {
        this.error = 'Nao foi possivel carregar o status facial.';
      },
    });
  }

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
        this.message = 'Solicitacao de exclusao registrada.';
        this.load();
      },
      error: () => {
        this.saving = false;
        this.error = 'Nao foi possivel registrar a exclusao.';
      },
    });
  }
}
