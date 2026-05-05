import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';

import { MasterData, MasterDataRecord, MasterDataResource } from '../services/master-data';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

interface LocationNode extends MasterDataRecord {
  children: LocationNode[];
  depth: number;
  parentId?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gestao-master-data',
  standalone: false,
  templateUrl: './master-data.html',
  styleUrl: './master-data.scss',
})
export class GestaoMasterData implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  resources: MasterDataResource[] = [];
  jobPositions: MasterDataRecord[] = [];
  jobFunctions: MasterDataRecord[] = [];
  costCenters: MasterDataRecord[] = [];
  structureLinks: MasterDataRecord[] = [];
  locationTree: LocationNode[] = [];
  loading = false;
  error = '';

  constructor(private readonly masterData: MasterData) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(): void {
    this.loading = true;
    this.error = '';
    this.masterData
      .listResources({ page: 1, pageSize: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.resources = result.items;
          this.loadRecords();
        },
        error: () => {
          this.loading = false;
          this.error = SGP_FEATURE_I18N_MESSAGES.m077;
        },
      });
  }

  private loadRecords(): void {
    const resources = [
      ['cargo', (items: MasterDataRecord[]) => (this.jobPositions = items)],
      ['funcao', (items: MasterDataRecord[]) => (this.jobFunctions = items)],
      ['lotacao', (items: MasterDataRecord[]) => (this.locationTree = this.toTree(items))],
      ['centroCusto', (items: MasterDataRecord[]) => (this.costCenters = items)],
      ['cargoVinculo', (items: MasterDataRecord[]) => (this.structureLinks = items)],
    ] as const;

    let pending = resources.length;
    for (const [resource, assign] of resources) {
      this.masterData
        .listRecords(resource, { page: 1, pageSize: 100 })
        .pipe(
          finalize(() => {
            pending -= 1;
            if (pending === 0) {
              this.loading = false;
            }
          }),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (result) => assign(result.items),
          error: () => {
            this.error = SGP_FEATURE_I18N_MESSAGES.m078;
          },
        });
    }
  }

  private toTree(records: MasterDataRecord[]): LocationNode[] {
    const nodes = new Map<string, LocationNode>();
    for (const record of records) {
      nodes.set(record.id, {
        ...record,
        children: [],
        depth: 0,
        parentId: String(record.metadata['parentId'] ?? ''),
      });
    }

    const roots: LocationNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) {
        node.depth = parent.depth + 1;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }
}
