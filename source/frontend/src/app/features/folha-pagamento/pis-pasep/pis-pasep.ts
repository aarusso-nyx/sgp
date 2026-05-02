import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { PisPasepApiService, PisPasepYear } from './pis-pasep.service';

@Component({
  selector: 'app-pis-pasep',
  standalone: false,
  templateUrl: './pis-pasep.html',
  styleUrl: './pis-pasep.scss',
})
export class PisPasep {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PisPasepApiService);

  readonly currentYear = new Date().getFullYear();
  readonly monthKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  readonly form = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    year: [this.currentYear, [Validators.required, Validators.min(2000), Validators.max(2100)]],
  });

  result: PisPasepYear | null = null;
  errorMessage = '';
  loading = false;

  load(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.result = null;
    this.service
      .byEmployee(this.form.controls.employeeId.value, Number(this.form.controls.year.value))
      .subscribe({
        next: (result) => {
          this.result = result;
          this.loading = false;
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error ? error.message : 'Nao foi possivel carregar a base PIS/PASEP.';
          this.loading = false;
        },
      });
  }
}
