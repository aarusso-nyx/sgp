import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  ADMIN_FEATURES,
  findAdminFeatureByRoutePath,
} from '../../../../core/navigation/admin-feature-catalog';
import type {
  AdminFeature,
  AdminFeatureMode,
} from '../../../../core/navigation/admin-feature-catalog';
import {
  CrudTable,
  CrudTableAction,
  CrudTableColumn,
} from '../../../../shared-platform/crud-table/crud-table';
import { FilterBar, FilterField } from '../../../../shared-platform/filter-bar/filter-bar';

interface WorkspaceRecord {
  [key: string]: unknown;
  id: string;
  code: string;
  title: string;
  status: string;
  owner: string;
  updatedAt: string;
  notes: string;
}

@Component({
  selector: 'app-admin-feature-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    CrudTable,
    FilterBar,
  ],
  templateUrl: './admin-feature-page.html',
  styleUrl: './admin-feature-page.scss',
})
export class AdminFeaturePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  feature = ADMIN_FEATURES[0];
  records: WorkspaceRecord[] = [];
  filteredRecords: WorkspaceRecord[] = [];
  formOpen = false;
  editingRecord: WorkspaceRecord | null = null;
  message = '';
  search = '';
  status = '';

  readonly columns: CrudTableColumn[] = [
    { key: 'code', header: 'Código' },
    { key: 'title', header: 'Registro' },
    { key: 'status', header: 'Status' },
    { key: 'owner', header: 'Responsável' },
    { key: 'updatedAt', header: 'Atualização' },
  ];

  readonly rowActions: CrudTableAction[] = [
    {
      id: 'edit',
      label: 'Editar',
      icon: 'edit',
      description: 'Editar registro',
    },
    {
      id: 'details',
      label: 'Detalhes',
      icon: 'visibility',
      description: 'Ver detalhes',
    },
  ];

  readonly filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Pesquisar',
      placeholder: 'Código, registro ou responsável',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Ativo', value: 'Ativo' },
        { label: 'Em revisão', value: 'Em revisão' },
        { label: 'Pendente', value: 'Pendente' },
      ],
    },
  ];

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    title: ['', [Validators.required, Validators.maxLength(160)]],
    status: ['Ativo', Validators.required],
    owner: ['', [Validators.required, Validators.maxLength(120)]],
    updatedAt: ['', Validators.required],
    notes: ['', Validators.maxLength(500)],
    generateAuditTrail: [true],
  });

  ngOnInit(): void {
    combineLatest([this.route.data, this.route.paramMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([data, params]) => {
        const featureRoutePath = data['featureRoutePath'] as string | undefined;
        const feature =
          (featureRoutePath ? findAdminFeatureByRoutePath(featureRoutePath) : undefined) ??
          this.findFirstFeatureForModule(data['moduleKey'] as string | undefined);

        this.feature = feature;
        this.records = this.seedRecords(feature, params.get('id'));
        this.resetWorkspace(feature.mode);
        this.applyCurrentFilters();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isFormMode(): boolean {
    return this.feature.mode === 'form';
  }

  get isDetailsMode(): boolean {
    return this.feature.mode === 'details';
  }

  get modeLabel(): string {
    const labels: Record<AdminFeatureMode, string> = {
      management: 'Gestão',
      form: 'Formulário',
      details: 'Detalhes',
      dashboard: 'Painel',
    };
    return labels[this.feature.mode];
  }

  applyFilters(filters: Record<string, string>): void {
    this.search = filters['search'] ?? '';
    this.status = filters['status'] ?? '';
    this.applyCurrentFilters();
  }

  clearFilters(): void {
    this.search = '';
    this.status = '';
    this.applyCurrentFilters();
  }

  openCreateForm(): void {
    this.editingRecord = null;
    this.form.reset({
      code: this.feature.requiredRole.split('.')[0] || this.feature.backendModule,
      title: '',
      status: 'Ativo',
      owner: 'Operador RH',
      updatedAt: new Date().toISOString().slice(0, 10),
      notes: '',
      generateAuditTrail: true,
    });
    this.formOpen = true;
    this.message = '';
  }

  handleRowAction(event: { actionId: string; row: Record<string, unknown> }): void {
    const record = event.row as unknown as WorkspaceRecord;
    this.editingRecord = record;
    this.form.reset({
      code: record.code,
      title: record.title,
      status: record.status,
      owner: record.owner,
      updatedAt: record.updatedAt,
      notes: record.notes,
      generateAuditTrail: true,
    });
    this.formOpen = true;
    this.message =
      event.actionId === 'details' ? 'Registro aberto em modo de consulta.' : '';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const record: WorkspaceRecord = {
      id: this.editingRecord?.id ?? `draft-${Date.now()}`,
      code: value.code,
      title: value.title,
      status: value.status,
      owner: value.owner,
      updatedAt: value.updatedAt,
      notes: value.notes,
    };

    if (this.editingRecord) {
      this.records = this.records.map((candidate) =>
        candidate.id === this.editingRecord?.id ? record : candidate,
      );
      this.message = 'Registro atualizado no workspace.';
    } else {
      this.records = [record, ...this.records];
      this.message = 'Registro incluído no workspace.';
    }

    this.formOpen = this.isFormMode;
    this.editingRecord = this.isFormMode ? record : null;
    this.applyCurrentFilters();
  }

  cancelForm(): void {
    this.formOpen = this.isFormMode || this.isDetailsMode;
    this.editingRecord = null;
    this.message = '';
  }

  trackByFeature(_: number, feature: AdminFeature): string {
    return feature.id;
  }

  private resetWorkspace(mode: AdminFeatureMode): void {
    this.formOpen = mode === 'form' || mode === 'details';
    this.editingRecord = this.formOpen ? this.records[0] ?? null : null;
    const selected = this.editingRecord;
    this.form.reset({
      code: selected?.code ?? this.feature.requiredRole.split('.')[0] ?? '',
      title: selected?.title ?? '',
      status: selected?.status ?? 'Ativo',
      owner: selected?.owner ?? 'Operador RH',
      updatedAt: selected?.updatedAt ?? new Date().toISOString().slice(0, 10),
      notes: selected?.notes ?? '',
      generateAuditTrail: true,
    });
    this.message = '';
  }

  private applyCurrentFilters(): void {
    const normalizedSearch = this.search.trim().toLowerCase();
    this.filteredRecords = this.records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        [record.code, record.title, record.owner, record.notes]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesStatus = !this.status || record.status === this.status;
      return matchesSearch && matchesStatus;
    });
  }

  private findFirstFeatureForModule(moduleKey: string | undefined): AdminFeature {
    return (
      ADMIN_FEATURES.find((feature) => feature.moduleKey === moduleKey) ?? ADMIN_FEATURES[0]
    );
  }

  private seedRecords(feature: AdminFeature, routeId: string | null): WorkspaceRecord[] {
    const prefix = feature.requiredRole.split('.')[0] || feature.backendModule.toUpperCase();
    const baseTitle = routeId ? `${feature.label} ${routeId}` : feature.label;

    return [
      {
        id: routeId ?? `${feature.id}-1`,
        code: `${prefix}-001`,
        title: baseTitle,
        status: 'Ativo',
        owner: 'Operador RH',
        updatedAt: '2026-04-26',
        notes: feature.comment,
      },
      {
        id: `${feature.id}-2`,
        code: `${prefix}-002`,
        title: `${feature.label} - revisão`,
        status: 'Em revisão',
        owner: 'Gestor do módulo',
        updatedAt: '2026-04-25',
        notes: feature.sectionLabel,
      },
      {
        id: `${feature.id}-3`,
        code: `${prefix}-003`,
        title: `${feature.label} - pendência`,
        status: 'Pendente',
        owner: 'Analista responsável',
        updatedAt: '2026-04-24',
        notes: feature.routePath,
      },
    ];
  }
}
