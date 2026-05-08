import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Observable, Subject, finalize, takeUntil } from 'rxjs';

import { PagedResult } from '../../../../core/models/paged-result';
import {
  CrudTableAction,
  CrudTableColumn,
} from '../../../../shared-platform/crud-table/crud-table';
import { FilterField } from '../../../../shared-platform/filter-bar/filter-bar';
import {
  RhEmployeeRecord,
  RhMutation,
  RhWorkflowRecord,
  RhWorkflows,
} from '../../services/rh-workflows';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../../core/i18n/feature-messages';

type RhFieldType = 'text' | 'textarea' | 'date' | 'number' | 'checkbox';
type RhMode = 'employees' | 'workflow';
type RhRow = Record<string, unknown> & { id: string };

interface RhField {
  key: string;
  label: string;
  type: RhFieldType;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}

interface RhWorkflowUiConfig {
  childPath: string;
  key: string;
  label: string;
  legacyRoute: string;
  mode: RhMode;
  employeeScoped: boolean;
  observedStatus: 'observed' | 'inferred';
  evidence: string;
  fields: RhField[];
  columns: CrudTableColumn[];
  importKind?: string;
  reportKey?: string;
}

const EMPLOYEE_ID_FIELD: RhField = {
  key: 'employeeId',
  label: 'Funcionario',
  type: 'text',
  required: true,
  placeholder: SGP_FEATURE_I18N_MESSAGES.m187,
};

const RH_CONFIGS: RhWorkflowUiConfig[] = [
  {
    childPath: 'funcionario',
    key: 'employees',
    label: 'Funcionarios',
    legacyRoute: '#!/funcionario/gestao',
    mode: 'employees',
    employeeScoped: false,
    observedStatus: 'observed',
    evidence: 'docs/leg/rev-eng/modules/modulo-rh.md',
    fields: [
      { key: 'registration', label: 'Matricula', type: 'text', required: true, maxLength: 40 },
      { key: 'name', label: 'Nome', type: 'text', required: true, maxLength: 180 },
      { key: 'cpf', label: 'CPF', type: 'text', maxLength: 14 },
      { key: 'email', label: 'E-mail', type: 'text', maxLength: 120 },
      { key: 'active', label: 'Ativo', type: 'checkbox' },
    ],
    columns: [
      { key: 'registration', header: 'Matricula' },
      { key: 'name', header: 'Nome' },
      { key: 'cpf', header: 'CPF' },
      { key: 'functionalStatus', header: 'Situacao' },
      { key: 'branch', header: 'Lotacao' },
      { key: 'activeLabel', header: 'Ativo' },
    ],
    reportKey: 'employees',
  },
  workflowConfig('dependente', 'dependents', 'Dependentes', '#!/dependente/gestao', [
    EMPLOYEE_ID_FIELD,
    { key: 'name', label: 'Nome', type: 'text', required: true, maxLength: 180 },
    { key: 'cpf', label: 'CPF', type: 'text', maxLength: 14 },
    { key: 'relationship', label: 'Parentesco', type: 'text', required: true, maxLength: 120 },
    { key: 'birthDate', label: 'Nascimento', type: 'date' },
    { key: 'incomeTaxDependent', label: SGP_FEATURE_I18N_MESSAGES.m188, type: 'checkbox' },
  ]),
  workflowConfig(
    'experienciaProfissional',
    'professional-experiences',
    'Experiencia Profissional',
    '#!/experienciaProfissional/gestao',
    [
      EMPLOYEE_ID_FIELD,
      { key: 'employer', label: 'Empregador', type: 'text', required: true, maxLength: 180 },
      { key: 'roleTitle', label: SGP_FEATURE_I18N_MESSAGES.m189, type: 'text', maxLength: 120 },
      { key: 'startsOn', label: 'Inicio', type: 'date' },
      { key: 'endsOn', label: 'Fim', type: 'date' },
      { key: 'notes', label: 'Descricao', type: 'textarea', maxLength: 500 },
    ],
  ),
  workflowConfig(
    'historicoSituacaoFuncional',
    'status-history',
    'Afastamentos dos Funcionarios',
    '#!/historicoSituacaoFuncional/gestao',
    [
      EMPLOYEE_ID_FIELD,
      {
        key: 'functionalStatusId',
        label: SGP_FEATURE_I18N_MESSAGES.m190,
        type: 'text',
        required: true,
      },
      { key: 'reasonId', label: 'Motivo', type: 'text' },
      { key: 'startsOn', label: 'Inicio', type: 'date', required: true },
      { key: 'endsOn', label: 'Fim', type: 'date' },
      { key: 'notes', label: 'Observacao', type: 'textarea', maxLength: 500 },
    ],
  ),
  workflowConfig(
    'frequencia',
    'frequencies',
    'Frequencias',
    '#!/frequencia/gestao',
    [
      EMPLOYEE_ID_FIELD,
      { key: 'year', label: 'Ano', type: 'number', required: true },
      { key: 'month', label: 'Mes', type: 'number' },
      { key: 'absenceDays', label: SGP_FEATURE_I18N_MESSAGES.m191, type: 'number' },
      { key: 'workedDays', label: SGP_FEATURE_I18N_MESSAGES.m192, type: 'number' },
      { key: 'notes', label: 'Observacao', type: 'textarea', maxLength: 500 },
    ],
    'frequencies',
  ),
  workflowConfig(
    'nivelSalarialHistorico',
    'salary-history',
    'Historico Nivel Salarial',
    '#!/nivelSalarialHistorico/gestao',
    [
      EMPLOYEE_ID_FIELD,
      { key: 'salaryReferenceId', label: SGP_FEATURE_I18N_MESSAGES.m193, type: 'text' },
      { key: 'levelCode', label: 'Nivel', type: 'text', maxLength: 80 },
      { key: 'levelDescription', label: 'Descricao', type: 'text', maxLength: 180 },
      { key: 'adjustmentAmount', label: SGP_FEATURE_I18N_MESSAGES.m194, type: 'number' },
      { key: 'effectiveOn', label: 'Vigencia', type: 'date', required: true },
    ],
  ),
  workflowConfig('tempoServico', 'service-time', 'Tempo de Servico', '#!/tempoServico/gestao', [
    EMPLOYEE_ID_FIELD,
    { key: 'source', label: 'Origem', type: 'text', required: true, maxLength: 120 },
    { key: 'startsOn', label: 'Inicio', type: 'date', required: true },
    { key: 'endsOn', label: 'Fim', type: 'date' },
    { key: 'daysCount', label: 'Dias', type: 'number' },
    { key: 'notes', label: 'Observacao', type: 'textarea', maxLength: 500 },
  ]),
  workflowConfig(
    'transferenciaFuncionario',
    'transfers',
    'Transferencia de Funcionarios',
    '#!/transferenciaFuncionario/gestao',
    [
      EMPLOYEE_ID_FIELD,
      { key: 'fromBranchId', label: 'Origem', type: 'text' },
      { key: 'toBranchId', label: 'Destino', type: 'text' },
      { key: 'toWorkLocationId', label: SGP_FEATURE_I18N_MESSAGES.m195, type: 'text' },
      { key: 'reasonId', label: 'Motivo', type: 'text' },
      { key: 'effectiveOn', label: SGP_FEATURE_I18N_MESSAGES.m196, type: 'date', required: true },
      { key: 'notes', label: 'Observacao', type: 'textarea', maxLength: 500 },
    ],
  ),
  workflowConfig(
    'dadoCadastralComplementar',
    'complement-data',
    'Dados Cadastrais Complementares',
    '#!/dadoCadastralComplementar/gestao',
    [
      EMPLOYEE_ID_FIELD,
      { key: 'rg', label: 'RG', type: 'text', maxLength: 40 },
      { key: 'rgIssuer', label: SGP_FEATURE_I18N_MESSAGES.m197, type: 'text', maxLength: 40 },
      { key: 'pisPasep', label: SGP_FEATURE_I18N_MESSAGES.m198, type: 'text', maxLength: 40 },
      {
        key: 'voterRegistration',
        label: SGP_FEATURE_I18N_MESSAGES.m199,
        type: 'text',
        maxLength: 60,
      },
      { key: 'notes', label: 'Observacao', type: 'textarea', maxLength: 500 },
    ],
    undefined,
    'inferred',
  ),
  workflowConfig(
    'definicaoOrganico',
    'organic-definitions',
    'Definicao de Organico',
    '#!/definicaoOrganico/gestao',
    [
      { key: 'code', label: 'Codigo', type: 'text', maxLength: 40 },
      { key: 'name', label: 'Nome', type: 'text', required: true, maxLength: 180 },
      { key: 'branchId', label: SGP_FEATURE_I18N_MESSAGES.m200, type: 'text' },
      { key: 'parentId', label: SGP_FEATURE_I18N_MESSAGES.m201, type: 'text' },
      { key: 'notes', label: 'Descricao', type: 'textarea', maxLength: 500 },
    ],
    undefined,
    'inferred',
  ),
  workflowConfig(
    'feriasProgramacao',
    'vacations',
    'Programacao de Ferias',
    '#!/feriasProgramacao/gestao',
    [
      EMPLOYEE_ID_FIELD,
      { key: 'vacationTypeId', label: SGP_FEATURE_I18N_MESSAGES.m202, type: 'text' },
      { key: 'accrualStartOn', label: SGP_FEATURE_I18N_MESSAGES.m203, type: 'date' },
      { key: 'accrualEndOn', label: SGP_FEATURE_I18N_MESSAGES.m204, type: 'date' },
      { key: 'startsOn', label: 'Inicio', type: 'date', required: true },
      { key: 'endsOn', label: 'Fim', type: 'date', required: true },
      { key: 'days', label: 'Dias', type: 'number', required: true },
    ],
    undefined,
    'inferred',
  ),
  workflowConfig(
    'licencaPremio',
    'leaves',
    'Licenca Premio',
    '#!/licencaPremio/gestao',
    [
      EMPLOYEE_ID_FIELD,
      { key: 'absenceReasonId', label: SGP_FEATURE_I18N_MESSAGES.m205, type: 'text' },
      { key: 'startsOn', label: 'Inicio', type: 'date', required: true },
      { key: 'endsOn', label: 'Fim', type: 'date' },
      { key: 'days', label: 'Dias', type: 'number' },
      { key: 'notes', label: 'Observacao', type: 'textarea', maxLength: 500 },
    ],
    undefined,
    'inferred',
  ),
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rh-home',
  standalone: false,
  templateUrl: './rh-home.html',
  styleUrl: './rh-home.scss',
})
export class RhHome implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Pesquisar',
      placeholder: SGP_FEATURE_I18N_MESSAGES.m206,
    },
  ];

  readonly rowActions: CrudTableAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit', description: SGP_FEATURE_I18N_MESSAGES.m004 },
    {
      id: 'delete',
      label: 'Excluir',
      icon: 'delete',
      description: SGP_FEATURE_I18N_MESSAGES.m207,
      disabled: (row) => row['active'] === false || row['status'] === 'INACTIVE',
    },
  ];

  readonly form: UntypedFormGroup = this.formBuilder.group({});
  readonly configs = RH_CONFIGS;

  currentConfig: RhWorkflowUiConfig = RH_CONFIGS[0]!;
  records: RhRow[] = [];
  columns: CrudTableColumn[] = RH_CONFIGS[0]!.columns;
  formFields: RhField[] = RH_CONFIGS[0]!.fields;
  loading = false;
  saving = false;
  message = '';
  error = '';
  search = '';
  formOpen = false;
  editingRecord: RhRow | null = null;
  backendDefinitionCount = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly rhWorkflows: RhWorkflows,
  ) {}

  ngOnInit(): void {
    this.loadWorkflowDefinitions();
    this.rebuildForm();

    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      const childPath = (data['legacyChildPath'] as string | undefined) ?? 'funcionario';
      this.selectConfig(childPath);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(filters: Record<string, string>): void {
    this.search = filters['search'] ?? '';
    this.loadRecords();
  }

  clearFilters(): void {
    this.search = '';
    this.loadRecords();
  }

  openCreateForm(): void {
    this.editingRecord = null;
    this.rebuildForm();
    this.formOpen = true;
    this.message = '';
    this.error = '';
  }

  cancelForm(): void {
    this.formOpen = false;
    this.editingRecord = null;
  }

  handleRowAction(event: { actionId: string; row: Record<string, unknown> }): void {
    const row = event.row as RhRow;
    if (event.actionId === 'edit') {
      this.openEditForm(row);
      return;
    }

    if (event.actionId === 'delete') {
      this.delete(row);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const body = this.toMutation();
    const request$ =
      this.currentConfig.mode === 'employees' ? this.saveEmployee(body) : this.saveWorkflow(body);

    this.saving = true;
    this.error = '';
    request$
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = this.editingRecord
            ? SGP_FEATURE_I18N_MESSAGES.m081
            : SGP_FEATURE_I18N_MESSAGES.m082;
          this.cancelForm();
          this.loadRecords();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m208;
        },
      });
  }

  requestImport(): void {
    if (!this.currentConfig.importKind) return;
    this.saving = true;
    this.error = '';
    this.rhWorkflows
      .requestImport(this.currentConfig.importKind, { source: this.currentConfig.key })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m209;
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m210;
        },
      });
  }

  requestReport(): void {
    if (!this.currentConfig.reportKey) return;
    this.saving = true;
    this.error = '';
    this.rhWorkflows
      .requestReport(this.currentConfig.reportKey, { source: this.currentConfig.key })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m211;
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m212;
        },
      });
  }

  fieldControl(field: RhField): UntypedFormControl {
    return this.form.get(field.key) as UntypedFormControl;
  }

  trackByField(_: number, field: RhField): string {
    return field.key;
  }

  private loadWorkflowDefinitions(): void {
    this.rhWorkflows
      .listWorkflowDefinitions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (definitions) => {
          this.backendDefinitionCount = definitions.length;
        },
        error: () => {
          this.backendDefinitionCount = 0;
        },
      });
  }

  private selectConfig(childPath: string): void {
    this.currentConfig =
      this.configs.find((config) => config.childPath === childPath) ?? this.configs[0]!;
    this.columns = this.currentConfig.columns;
    this.formFields = this.currentConfig.fields;
    this.cancelForm();
    this.rebuildForm();
    this.loadRecords();
  }

  private loadRecords(): void {
    this.loading = true;
    this.error = '';
    const request$: Observable<PagedResult<RhEmployeeRecord | RhWorkflowRecord>> =
      this.currentConfig.mode === 'employees'
        ? (this.rhWorkflows.listEmployees({
            page: 1,
            pageSize: 25,
            search: this.search,
          }) as Observable<PagedResult<RhEmployeeRecord | RhWorkflowRecord>>)
        : (this.rhWorkflows.listWorkflow(this.currentConfig.key, {
            page: 1,
            pageSize: 25,
            search: this.search,
          }) as Observable<PagedResult<RhEmployeeRecord | RhWorkflowRecord>>);

    request$
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.records = result.items.map((record) =>
            this.currentConfig.mode === 'employees'
              ? this.toEmployeeRow(record as RhEmployeeRecord)
              : this.toWorkflowRow(record as RhWorkflowRecord),
          );
        },
        error: () => {
          this.records = [];
          this.error = SGP_FEATURE_I18N_MESSAGES.m213;
        },
      });
  }

  private rebuildForm(): void {
    for (const key of Object.keys(this.form.controls)) {
      this.form.removeControl(key);
    }

    for (const field of this.formFields) {
      const validators = [];
      if (field.required) validators.push(Validators.required);
      if (field.maxLength) validators.push(Validators.maxLength(field.maxLength));
      this.form.addControl(
        field.key,
        this.formBuilder.control(field.type === 'checkbox' ? false : '', validators),
      );
    }
  }

  private openEditForm(row: RhRow): void {
    this.editingRecord = row;
    this.rebuildForm();
    for (const field of this.formFields) {
      this.form.get(field.key)?.setValue(this.valueForForm(row, field));
    }
    this.formOpen = true;
    this.message = '';
    this.error = '';
  }

  private delete(row: RhRow): void {
    this.loading = true;
    this.error = '';
    const request$: Observable<unknown> =
      this.currentConfig.mode === 'employees'
        ? this.rhWorkflows.deactivateEmployee(row.id)
        : this.rhWorkflows.deleteWorkflow(this.currentConfig.key, row.id);

    request$
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message =
            this.currentConfig.mode === 'employees'
              ? 'Funcionario inativado.'
              : 'Registro removido ou inativado.';
          this.loadRecords();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m214;
        },
      });
  }

  private saveEmployee(body: RhMutation) {
    return (
      this.editingRecord
        ? this.rhWorkflows.updateEmployee(this.editingRecord.id, body)
        : this.rhWorkflows.createEmployee(body)
    ) as Observable<unknown>;
  }

  private saveWorkflow(body: RhMutation) {
    return (
      this.editingRecord
        ? this.rhWorkflows.updateWorkflow(this.currentConfig.key, this.editingRecord.id, body)
        : this.rhWorkflows.createWorkflow(this.currentConfig.key, body)
    ) as Observable<unknown>;
  }

  private toMutation(): RhMutation {
    const raw = this.form.getRawValue() as Record<string, unknown>;
    const body: RhMutation = {};
    const metadata: Record<string, unknown> = {};

    for (const field of this.formFields) {
      const value = raw[field.key];
      if (field.type !== 'checkbox' && value === '') {
        continue;
      }
      if (
        ['birthDate', 'accrualStartOn', 'accrualEndOn', 'branchId', 'parentId', 'code'].includes(
          field.key,
        )
      ) {
        metadata[field.key] = value;
      } else {
        body[field.key] = value;
      }
    }

    if (Object.keys(metadata).length > 0) {
      body['metadata'] = metadata;
    }
    return body;
  }

  private toEmployeeRow(record: RhEmployeeRecord): RhRow {
    return {
      ...record,
      activeLabel: record.active ? 'Sim' : 'Nao',
    };
  }

  private toWorkflowRow(record: RhWorkflowRecord): RhRow {
    return {
      ...record,
      ...record.metadata,
      employeeLabel: [record.employeeRegistration, record.employeeName].filter(Boolean).join(' - '),
      periodLabel: [this.shortDate(record.startsOn), this.shortDate(record.endsOn)]
        .filter(Boolean)
        .join(' a '),
    };
  }

  private valueForForm(row: RhRow, field: RhField): unknown {
    if (field.type === 'checkbox') {
      return Boolean(row[field.key]);
    }
    if (field.key === 'notes' && !row[field.key]) {
      return row['subtitle'] ?? '';
    }
    return row[field.key] ?? '';
  }

  private shortDate(value: unknown): string {
    if (typeof value !== 'string' || !value) return '';
    return value.slice(0, 10);
  }
}

function workflowConfig(
  childPath: string,
  key: string,
  label: string,
  legacyRoute: string,
  fields: RhField[],
  importKind?: string,
  observedStatus: 'observed' | 'inferred' = 'observed',
): RhWorkflowUiConfig {
  return {
    childPath,
    key,
    label,
    legacyRoute,
    mode: 'workflow',
    employeeScoped: fields.some((field) => field.key === 'employeeId'),
    observedStatus,
    evidence: 'docs/leg/rev-eng/modules/modulo-rh.md',
    fields,
    columns: [
      { key: 'employeeLabel', header: 'Funcionario' },
      { key: 'title', header: 'Registro' },
      { key: 'subtitle', header: 'Detalhe' },
      { key: 'periodLabel', header: 'Periodo' },
      { key: 'status', header: 'Status' },
    ],
    ...(importKind ? { importKind } : {}),
    reportKey: key,
  };
}
