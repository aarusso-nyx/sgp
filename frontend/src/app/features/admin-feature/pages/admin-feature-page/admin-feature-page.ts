import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { combineLatest, map } from 'rxjs';
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
import { SGP_FEATURE_I18N_MESSAGES } from '../../../../core/i18n/feature-messages';

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

interface RouteWorkspaceState {
  feature: AdminFeature;
  routeId: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class AdminFeaturePage {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  private readonly routeState = toSignal(
    combineLatest([this.route.data, this.route.paramMap]).pipe(
      map(([data, params]): RouteWorkspaceState => {
        const featureRoutePath = data['featureRoutePath'] as string | undefined;
        const feature =
          (featureRoutePath ? findAdminFeatureByRoutePath(featureRoutePath) : undefined) ??
          this.findFirstFeatureForModule(data['moduleKey'] as string | undefined);

        return { feature, routeId: params.get('id') };
      }),
    ),
    { initialValue: { feature: ADMIN_FEATURES[0], routeId: null } },
  );

  readonly feature = computed(() => this.routeState().feature);
  readonly records = signal<WorkspaceRecord[]>([]);
  readonly formOpen = signal(false);
  readonly editingRecord = signal<WorkspaceRecord | null>(null);
  readonly message = signal('');
  readonly search = signal('');
  readonly status = signal('');
  readonly filteredRecords = computed(() => {
    const normalizedSearch = this.search().trim().toLowerCase();
    const status = this.status();

    return this.records().filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        [record.code, record.title, record.owner, record.notes]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesStatus = !status || record.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  private readonly routeWorkspaceEffect = effect(() => {
    const { feature, routeId } = this.routeState();
    const records = this.seedRecords(feature, routeId);
    this.records.set(records);
    this.resetWorkspace(feature, records);
  });

  readonly columns: CrudTableColumn[] = [
    { key: 'code', header: SGP_FEATURE_I18N_MESSAGES.m001 },
    { key: 'title', header: 'Registro' },
    { key: 'status', header: 'Status' },
    { key: 'owner', header: SGP_FEATURE_I18N_MESSAGES.m002 },
    { key: 'updatedAt', header: SGP_FEATURE_I18N_MESSAGES.m003 },
  ];

  readonly rowActions: CrudTableAction[] = [
    {
      id: 'edit',
      label: 'Editar',
      icon: 'edit',
      description: SGP_FEATURE_I18N_MESSAGES.m004,
    },
    {
      id: 'details',
      label: 'Detalhes',
      icon: 'visibility',
      description: SGP_FEATURE_I18N_MESSAGES.m005,
    },
  ];

  readonly filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Pesquisar',
      placeholder: SGP_FEATURE_I18N_MESSAGES.m006,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Ativo', value: 'Ativo' },
        { label: SGP_FEATURE_I18N_MESSAGES.m007, value: SGP_FEATURE_I18N_MESSAGES.m007 },
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

  get isFormMode(): boolean {
    return this.feature().mode === 'form';
  }

  get isDetailsMode(): boolean {
    return this.feature().mode === 'details';
  }

  get modeLabel(): string {
    const labels: Record<AdminFeatureMode, string> = {
      management: 'Gestão',
      form: 'Formulário',
      details: 'Detalhes',
      dashboard: 'Painel',
    };
    return labels[this.feature().mode];
  }

  applyFilters(filters: Record<string, string>): void {
    this.search.set(filters['search'] ?? '');
    this.status.set(filters['status'] ?? '');
  }

  clearFilters(): void {
    this.search.set('');
    this.status.set('');
  }

  openCreateForm(): void {
    const feature = this.feature();
    this.editingRecord.set(null);
    this.form.reset({
      code: feature.requiredRole.split('.')[0] || feature.backendModule,
      title: '',
      status: 'Ativo',
      owner: 'Operador RH',
      updatedAt: new Date().toISOString().slice(0, 10),
      notes: '',
      generateAuditTrail: true,
    });
    this.formOpen.set(true);
    this.message.set('');
  }

  handleRowAction(event: { actionId: string; row: Record<string, unknown> }): void {
    const record = event.row as unknown as WorkspaceRecord;
    this.editingRecord.set(record);
    this.form.reset({
      code: record.code,
      title: record.title,
      status: record.status,
      owner: record.owner,
      updatedAt: record.updatedAt,
      notes: record.notes,
      generateAuditTrail: true,
    });
    this.formOpen.set(true);
    this.message.set(event.actionId === 'details' ? 'Registro aberto em modo de consulta.' : '');
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editingRecord = this.editingRecord();
    const record: WorkspaceRecord = {
      id: editingRecord?.id ?? `draft-${Date.now()}`,
      code: value.code,
      title: value.title,
      status: value.status,
      owner: value.owner,
      updatedAt: value.updatedAt,
      notes: value.notes,
    };

    if (editingRecord) {
      this.records.update((records) =>
        records.map((candidate) => (candidate.id === editingRecord.id ? record : candidate)),
      );
      this.message.set('Registro atualizado no workspace.');
    } else {
      this.records.update((records) => [record, ...records]);
      this.message.set('Registro incluído no workspace.');
    }

    this.formOpen.set(this.isFormMode);
    this.editingRecord.set(this.isFormMode ? record : null);
  }

  cancelForm(): void {
    this.formOpen.set(this.isFormMode || this.isDetailsMode);
    this.editingRecord.set(null);
    this.message.set('');
  }

  trackByFeature(_: number, feature: AdminFeature): string {
    return feature.id;
  }

  private resetWorkspace(feature: AdminFeature, records: WorkspaceRecord[]): void {
    const formOpen = feature.mode === 'form' || feature.mode === 'details';
    this.formOpen.set(formOpen);
    const selected = formOpen ? (records[0] ?? null) : null;
    this.editingRecord.set(selected);
    this.form.reset({
      code: selected?.code ?? feature.requiredRole.split('.')[0] ?? '',
      title: selected?.title ?? '',
      status: selected?.status ?? 'Ativo',
      owner: selected?.owner ?? 'Operador RH',
      updatedAt: selected?.updatedAt ?? new Date().toISOString().slice(0, 10),
      notes: selected?.notes ?? '',
      generateAuditTrail: true,
    });
    this.message.set('');
  }

  private findFirstFeatureForModule(moduleKey: string | undefined): AdminFeature {
    return ADMIN_FEATURES.find((feature) => feature.moduleKey === moduleKey) ?? ADMIN_FEATURES[0];
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
        title: SGP_FEATURE_I18N_MESSAGES.m008(feature.label),
        status: 'Em revisão',
        owner: 'Gestor do módulo',
        updatedAt: '2026-04-25',
        notes: feature.sectionLabel,
      },
      {
        id: `${feature.id}-3`,
        code: `${prefix}-003`,
        title: SGP_FEATURE_I18N_MESSAGES.m009(feature.label),
        status: 'Pendente',
        owner: 'Analista responsável',
        updatedAt: '2026-04-24',
        notes: feature.routePath,
      },
    ];
  }
}
