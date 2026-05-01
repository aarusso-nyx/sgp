import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  JobPositionRecord,
  MasterData,
  SalaryRangeLevelRecord,
  SalaryRangeRecord,
} from '../services/master-data';

@Component({
  selector: 'app-gestao-cargos',
  standalone: false,
  templateUrl: './cargos.html',
  styleUrl: './cargos.scss',
})
export class Cargos implements OnInit {
  cargos: JobPositionRecord[] = [];
  salaryRanges: SalaryRangeRecord[] = [];
  salaryLevels: SalaryRangeLevelRecord[] = [];
  selectedCargo?: JobPositionRecord;
  loading = false;
  error = '';
  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly masterData: MasterData,
  ) {
    this.form = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.maxLength(40)]],
      name: ['', [Validators.required, Validators.maxLength(160)]],
      description: [''],
      category: ['efetivo', Validators.required],
      legalRegime: ['estatutario', Validators.required],
      creationLaw: ['', Validators.required],
      vacanciesCount: [0, [Validators.required, Validators.min(0)]],
      salaryRangeId: [''],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      cargos: this.masterData.listJobPositions({ page: 1, pageSize: 100 }),
      ranges: this.masterData.listSalaryRanges(),
    }).subscribe({
      next: ({ cargos, ranges }) => {
        this.cargos = cargos.items;
        this.salaryRanges = ranges;
        this.selectedCargo = this.cargos[0];
        this.loadSalaryTable();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Nao foi possivel carregar cargos.';
      },
    });
  }

  selectCargo(cargo: JobPositionRecord): void {
    this.selectedCargo = cargo;
    this.loadSalaryTable();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (this.cargos.some((cargo) => cargo.code === value.code)) {
      this.error = 'Codigo ja cadastrado para este tenant.';
      return;
    }
    this.masterData
      .createJobPosition({
        code: value.code,
        name: value.name,
        description: value.description,
        category: value.category,
        legalRegime: value.legalRegime,
        creationLaw: value.creationLaw,
        vacanciesCount: Number(value.vacanciesCount ?? 0),
        salaryRangeId: value.salaryRangeId || null,
      })
      .subscribe({
        next: (created) => {
          this.cargos = [...this.cargos, created].sort((a, b) =>
            a.code.localeCompare(b.code),
          );
          this.selectedCargo = created;
          this.form.reset({
            category: 'efetivo',
            legalRegime: 'estatutario',
            vacanciesCount: 0,
          });
          this.loadSalaryTable();
        },
        error: () => {
          this.error = 'Nao foi possivel salvar o cargo.';
        },
      });
  }

  private loadSalaryTable(): void {
    const salaryRangeId = this.selectedCargo?.salaryRangeId;
    if (!salaryRangeId) {
      this.salaryLevels = [];
      return;
    }
    this.masterData.listSalaryLevels(salaryRangeId).subscribe({
      next: (levels) => {
        this.salaryLevels = levels;
      },
      error: () => {
        this.salaryLevels = [];
      },
    });
  }
}
