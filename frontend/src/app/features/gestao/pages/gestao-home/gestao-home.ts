import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  CrudTableAction,
  CrudTableColumn,
} from '../../../../shared-platform/crud-table/crud-table';
import { FilterField } from '../../../../shared-platform/filter-bar/filter-bar';
import {
  MasterData,
  MasterDataMutation,
  MasterDataRecord,
  MasterDataResource,
} from '../../services/master-data';

type ViewRecord = Record<string, unknown> & MasterDataRecord;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gestao-home',
  standalone: false,
  templateUrl: './gestao-home.html',
  styleUrl: './gestao-home.scss',
})
export class GestaoHome implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly defaultResourceKey = 'adminMenus';
  private readonly formBuilder = inject(FormBuilder);

  resources: MasterDataResource[] = [];
  currentResource: MasterDataResource | null = null;
  records: ViewRecord[] = [];
  columns: CrudTableColumn[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';
  search = '';
  editingRecord: MasterDataRecord | null = null;
  formOpen = false;

  readonly filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Pesquisar',
      placeholder: 'Codigo, nome ou descricao',
    },
  ];

  readonly rowActions: CrudTableAction[] = [
    {
      id: 'edit',
      label: 'Editar',
      icon: 'edit',
      description: 'Editar registro',
    },
    {
      id: 'deactivate',
      label: 'Desativar',
      icon: 'block',
      description: 'Desativar registro',
      disabled: (row) => row['active'] === false,
    },
  ];

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    description: ['', [Validators.maxLength(500)]],
    active: [true],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly masterData: MasterData,
  ) {}

  ngOnInit(): void {
    this.loadResources();

    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      const resourceKey =
        (data['legacyChildPath'] as string | undefined) ?? this.defaultResourceKey;
      this.selectResource(resourceKey);
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
    this.form.reset({
      code: '',
      name: '',
      description: '',
      active: true,
    });
    this.formOpen = true;
    this.message = '';
    this.error = '';
  }

  cancelForm(): void {
    this.formOpen = false;
    this.editingRecord = null;
  }

  handleRowAction(event: { actionId: string; row: Record<string, unknown> }): void {
    const row = event.row as ViewRecord;
    if (event.actionId === 'edit') {
      this.openEditForm(row);
      return;
    }

    if (event.actionId === 'deactivate') {
      this.deactivate(row);
    }
  }

  save(): void {
    if (!this.currentResource || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const body: MasterDataMutation = this.form.getRawValue();
    const request$ = this.editingRecord
      ? this.masterData.updateRecord(this.currentResource.key, this.editingRecord.id, body)
      : this.masterData.createRecord(this.currentResource.key, body);

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
          this.message = this.editingRecord ? 'Registro atualizado.' : 'Registro criado.';
          this.cancelForm();
          this.loadRecords();
        },
        error: () => {
          this.error = 'Nao foi possivel salvar o registro.';
        },
      });
  }

  private loadResources(): void {
    this.masterData
      .listResources({ page: 1, pageSize: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.resources = result.items;
          this.selectResource(this.currentResource?.key ?? this.defaultResourceKey);
        },
        error: () => {
          this.error = 'Nao foi possivel carregar os recursos de Gestao.';
        },
      });
  }

  private selectResource(resourceKey: string): void {
    const found =
      this.resources.find((resource) => resource.key === resourceKey) ??
      this.currentResource ??
      null;
    this.currentResource = found;
    this.columns = this.columnsFor(found);
    this.formOpen = false;
    this.editingRecord = null;

    if (found) {
      this.loadRecords();
    }
  }

  private loadRecords(): void {
    if (!this.currentResource) return;

    this.loading = true;
    this.error = '';
    this.masterData
      .listRecords(this.currentResource.key, {
        page: 1,
        pageSize: 25,
        search: this.search,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.records = result.items.map((record) => ({
            ...record,
            ...record.metadata,
            activeLabel: record.active ? 'Sim' : 'Nao',
          }));
        },
        error: () => {
          this.records = [];
          this.error = 'Nao foi possivel carregar os registros.';
        },
      });
  }

  private openEditForm(record: MasterDataRecord): void {
    this.editingRecord = record;
    this.form.reset({
      code: record.code,
      name: record.name,
      description: record.description,
      active: record.active,
    });
    this.formOpen = true;
    this.message = '';
    this.error = '';
  }

  private deactivate(record: MasterDataRecord): void {
    if (!this.currentResource) return;

    this.loading = true;
    this.error = '';
    this.masterData
      .deactivateRecord(this.currentResource.key, record.id)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = 'Registro desativado.';
          this.loadRecords();
        },
        error: () => {
          this.error = 'Nao foi possivel desativar o registro.';
        },
      });
  }

  private columnsFor(resource: MasterDataResource | null): CrudTableColumn[] {
    const baseColumns = resource?.columns.length
      ? resource.columns
      : [
          { key: 'code', label: 'Codigo' },
          { key: 'name', label: 'Nome' },
          { key: 'description', label: 'Descricao' },
        ];

    return [
      ...baseColumns.map((column) => ({
        key: column.key,
        header: column.label,
      })),
      {
        key: 'activeLabel',
        header: 'Ativo',
      },
    ];
  }
}
