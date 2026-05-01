import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MasterData, JobPositionRecord } from '../../gestao/services/master-data';
import {
  JobPositionRubrica,
  RubricaAttribute,
  RubricaRecord,
  RubricasService,
} from './rubricas.service';

@Component({
  selector: 'app-folha-rubricas',
  standalone: false,
  templateUrl: './rubricas.html',
  styleUrl: './rubricas.scss',
})
export class Rubricas implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rubricasService = inject(RubricasService);
  private readonly masterData = inject(MasterData);

  rubricas: RubricaRecord[] = [];
  jobPositions: JobPositionRecord[] = [];
  jobPositionLinks: JobPositionRubrica[] = [];
  selected?: RubricaRecord;
  attributes: RubricaAttribute[] = [];
  error = '';
  message = '';
  previewAmount = '';
  readonly today = '2026-05-01';

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    description: ['', Validators.required],
    type: ['provento', Validators.required],
    taxable: [true],
    active: [true],
    irrf: [true],
    inss: [true],
    fgts: [false],
    rpps: [false],
    employerContribution: [false],
    startsOn: [this.today, Validators.required],
    endsOn: [''],
    formulaAlias: [''],
    formulaExpression: [
      'base_salary(p_employee_id, make_date(p_year, p_month, 1))',
      Validators.required,
    ],
    esocialCode: [''],
    officialRubricCode: [''],
  });

  readonly attributeForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['decimal', Validators.required],
    defaultValue: [''],
    required: [false],
  });

  readonly previewForm = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    competenceYear: [2026, Validators.required],
    competenceMonth: [5, Validators.required],
  });

  readonly linkForm = this.fb.nonNullable.group({
    jobPositionId: ['', Validators.required],
    startsOn: [this.today, Validators.required],
    endsOn: [''],
    applicationCondition: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error = '';
    forkJoin({
      rubricas: this.rubricasService.list({ page: 1, pageSize: 100 }),
      jobPositions: this.masterData.listJobPositions({ page: 1, pageSize: 100 }),
      links: this.rubricasService.listJobPositionLinks(),
    }).subscribe({
      next: ({ rubricas, jobPositions, links }) => {
        this.rubricas = rubricas.items;
        this.jobPositions = jobPositions.items;
        this.jobPositionLinks = links;
        if (!this.selected && this.rubricas.length > 0) {
          this.select(this.rubricas[0]);
        }
      },
      error: () => {
        this.error = 'Nao foi possivel carregar rubricas.';
      },
    });
  }

  select(rubrica: RubricaRecord): void {
    this.selected = rubrica;
    this.attributes = [...rubrica.attributes];
    this.previewAmount = '';
    this.form.reset({
      code: rubrica.code,
      description: rubrica.description,
      type: rubrica.type,
      taxable: rubrica.taxable,
      active: rubrica.active,
      irrf: Boolean(rubrica.incidences['irrf']),
      inss: Boolean(rubrica.incidences['inss']),
      fgts: Boolean(rubrica.incidences['fgts']),
      rpps: Boolean(rubrica.incidences['rpps']),
      employerContribution: Boolean(rubrica.incidences['employerContribution']),
      startsOn: rubrica.startsOn,
      endsOn: rubrica.endsOn ?? '',
      formulaAlias: rubrica.formulaAlias ?? '',
      formulaExpression: rubrica.formulaExpression ?? '',
      esocialCode: '',
      officialRubricCode: '',
    });
  }

  newRubrica(): void {
    this.selected = undefined;
    this.attributes = [];
    this.previewAmount = '';
    this.form.reset({
      type: 'provento',
      taxable: true,
      active: true,
      irrf: true,
      inss: true,
      fgts: false,
      rpps: false,
      employerContribution: false,
      startsOn: this.today,
      formulaExpression: 'base_salary(p_employee_id, make_date(p_year, p_month, 1))',
    });
  }

  addAttribute(): void {
    if (this.attributeForm.invalid) {
      this.attributeForm.markAllAsTouched();
      return;
    }
    const value = this.attributeForm.getRawValue();
    this.attributes = [
      ...this.attributes.filter((attribute) => attribute.name !== value.name),
      {
        name: value.name,
        type: value.type as RubricaAttribute['type'],
        defaultValue: value.defaultValue || null,
        required: value.required,
      },
    ];
    this.attributeForm.reset({ type: 'decimal', required: false });
  }

  removeAttribute(name: string): void {
    this.attributes = this.attributes.filter((attribute) => attribute.name !== name);
  }

  validateFormula(): void {
    const expression = this.form.getRawValue().formulaExpression;
    this.rubricasService.validateFormula(expression).subscribe({
      next: (result) => {
        this.message = result.ready ? 'Formula valida.' : result.error || 'Formula invalida.';
      },
      error: () => {
        this.error = 'Nao foi possivel validar a formula.';
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.payload();
    const request = this.selected
      ? this.rubricasService.update(this.selected.id, payload)
      : this.rubricasService.create(payload);
    request.subscribe({
      next: (rubrica) => {
        this.message = 'Rubrica salva.';
        this.selected = rubrica;
        this.load();
      },
      error: () => {
        this.error = 'Nao foi possivel salvar a rubrica.';
      },
    });
  }

  preview(): void {
    if (!this.selected || this.previewForm.invalid) {
      this.previewForm.markAllAsTouched();
      return;
    }
    const value = this.previewForm.getRawValue();
    const attributes = Object.fromEntries(
      this.attributes.map((attribute) => [attribute.name, attribute.defaultValue ?? '']),
    );
    this.rubricasService
      .preview(this.selected.id, {
        employeeId: value.employeeId,
        competenceYear: Number(value.competenceYear),
        competenceMonth: Number(value.competenceMonth),
        attributes,
      })
      .subscribe({
        next: (result) => {
          this.previewAmount = result.amount ?? 'sem valor';
        },
        error: () => {
          this.error = 'Nao foi possivel executar o preview.';
        },
      });
  }

  linkJobPosition(): void {
    if (!this.selected || this.linkForm.invalid) {
      this.linkForm.markAllAsTouched();
      return;
    }
    const value = this.linkForm.getRawValue();
    this.rubricasService
      .linkJobPosition({
        jobPositionId: value.jobPositionId,
        rubricaId: this.selected.id,
        startsOn: value.startsOn,
        endsOn: value.endsOn || null,
        applicationCondition: value.applicationCondition,
      })
      .subscribe({
        next: () => {
          this.message = 'Cargo vinculado a rubrica.';
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel vincular cargo e rubrica.';
        },
      });
  }

  private payload() {
    const value = this.form.getRawValue();
    return {
      code: value.code,
      description: value.description,
      type: value.type as RubricaRecord['type'],
      taxable: value.taxable,
      active: value.active,
      incidences: {
        irrf: value.irrf,
        inss: value.inss,
        fgts: value.fgts,
        rpps: value.rpps,
        employerContribution: value.employerContribution,
      },
      startsOn: value.startsOn,
      endsOn: value.endsOn || null,
      formulaAlias: value.formulaAlias || null,
      formulaExpression: value.formulaExpression || null,
      esocialCode: value.esocialCode || null,
      officialRubricCode: value.officialRubricCode || null,
      attributes: this.attributes,
    };
  }
}
