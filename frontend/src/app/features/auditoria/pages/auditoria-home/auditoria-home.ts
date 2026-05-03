import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, finalize, forkJoin, takeUntil } from 'rxjs';

import {
  CrudTableAction,
  CrudTableColumn,
} from '../../../../shared-platform/crud-table/crud-table';
import {
  AuditEventQuery,
  AuditEventRecord,
  AuditEvents,
  AuditFacet,
} from '../../services/audit-events';

type AuditRow = Record<string, unknown> & AuditEventRecord;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-auditoria-home',
  standalone: false,
  templateUrl: './auditoria-home.html',
  styleUrl: './auditoria-home.scss',
})
export class AuditoriaHome implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(FormBuilder);

  readonly filters = this.formBuilder.nonNullable.group({
    search: [''],
    dateFrom: [''],
    dateTo: [''],
    actor: [''],
    action: [''],
    tableName: [''],
    resourceType: [''],
    resourceId: [''],
    requestId: [''],
    statusCode: [''],
  });

  readonly columns: CrudTableColumn[] = [
    { key: 'occurredAtLabel', header: 'Data' },
    { key: 'actorLabel', header: 'Usuario' },
    { key: 'action', header: 'Operacao' },
    { key: 'tableName', header: 'Tabela' },
    { key: 'resourceType', header: 'Recurso' },
    { key: 'resourceId', header: 'Registro' },
    { key: 'requestId', header: 'Request ID' },
    { key: 'statusCodeLabel', header: 'HTTP' },
  ];

  readonly rowActions: CrudTableAction[] = [
    {
      id: 'details',
      label: 'Detalhes',
      icon: 'visibility',
      description: 'Ver detalhes do evento',
    },
  ];

  records: AuditRow[] = [];
  actionFacets: AuditFacet[] = [];
  tableFacets: AuditFacet[] = [];
  userFacets: AuditFacet[] = [];
  selected: AuditRow | null = null;
  loading = false;
  reporting = false;
  message = '';
  error = '';

  constructor(private readonly auditEvents: AuditEvents) {}

  ngOnInit(): void {
    this.loadFacets();
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    this.selected = null;
    this.loadEvents();
    this.loadFacets();
  }

  clearFilters(): void {
    this.filters.reset({
      search: '',
      dateFrom: '',
      dateTo: '',
      actor: '',
      action: '',
      tableName: '',
      resourceType: '',
      resourceId: '',
      requestId: '',
      statusCode: '',
    });
    this.selected = null;
    this.loadEvents();
    this.loadFacets();
  }

  refresh(): void {
    this.loadEvents();
    this.loadFacets();
  }

  requestReport(): void {
    const query = this.queryFromForm();
    this.reporting = true;
    this.error = '';
    this.auditEvents
      .requestReport({
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        actor: query.actor,
        action: query.action,
        tableName: query.tableName,
        resourceType: query.resourceType,
        search: query.search,
        parameters: {
          resourceId: query.resourceId,
          requestId: query.requestId,
          statusCode: query.statusCode,
        },
      })
      .pipe(
        finalize(() => {
          this.reporting = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = 'Solicitacao de relatorio de auditoria registrada.';
        },
        error: () => {
          this.error = 'Nao foi possivel solicitar o relatorio de auditoria.';
        },
      });
  }

  handleRowAction(event: { actionId: string; row: Record<string, unknown> }): void {
    if (event.actionId === 'details') {
      this.selected = event.row as AuditRow;
    }
  }

  metadataEntries(record: AuditRow | null): { key: string; value: string }[] {
    if (!record) return [];
    return Object.entries(record.metadata ?? {}).map(([key, value]) => ({
      key,
      value: this.formatMetadata(value),
    }));
  }

  trackByFacet(_: number, facet: AuditFacet): string {
    return facet.value;
  }

  private loadEvents(): void {
    this.loading = true;
    this.error = '';
    this.auditEvents
      .list({ ...this.queryFromForm(), page: 1, pageSize: 25 })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.records = result.items.map((record) => this.toRow(record));
        },
        error: () => {
          this.records = [];
          this.error = 'Nao foi possivel carregar eventos de auditoria.';
        },
      });
  }

  private loadFacets(): void {
    const query = this.queryFromForm();
    forkJoin({
      actions: this.auditEvents.actionFacets(query),
      tables: this.auditEvents.tableFacets(query),
      users: this.auditEvents.userFacets(query),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ actions, tables, users }) => {
          this.actionFacets = actions;
          this.tableFacets = tables;
          this.userFacets = users;
        },
        error: () => {
          this.actionFacets = [];
          this.tableFacets = [];
          this.userFacets = [];
        },
      });
  }

  private queryFromForm(): AuditEventQuery {
    const raw = this.filters.getRawValue();
    const statusCode = raw.statusCode ? Number(raw.statusCode) : undefined;
    return {
      search: raw.search || undefined,
      dateFrom: raw.dateFrom || undefined,
      dateTo: raw.dateTo || undefined,
      actor: raw.actor || undefined,
      action: raw.action || undefined,
      tableName: raw.tableName || undefined,
      resourceType: raw.resourceType || undefined,
      resourceId: raw.resourceId || undefined,
      requestId: raw.requestId || undefined,
      statusCode,
    };
  }

  private toRow(record: AuditEventRecord): AuditRow {
    return {
      ...record,
      occurredAtLabel: this.formatDate(record.occurredAt),
      actorLabel: record.actorLogin || record.actorSub || 'Sistema',
      statusCodeLabel: record.statusCode ? String(record.statusCode) : '',
      tableName: record.tableName ?? '',
      resourceId: record.resourceId ?? '',
      requestId: record.requestId ?? '',
    };
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(value));
  }

  private formatMetadata(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  }
}
