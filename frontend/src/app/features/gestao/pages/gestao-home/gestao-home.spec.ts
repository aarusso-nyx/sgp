import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { GestaoModule } from '../../gestao-module';
import { MasterData } from '../../services/master-data';
import { GestaoHome } from './gestao-home';

describe('GestaoHome', () => {
  let component: GestaoHome;
  let fixture: ComponentFixture<GestaoHome>;
  let routeData$: Subject<Record<string, unknown>>;

  const masterData = {
    listResources: vi.fn(),
    listRecords: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deactivateRecord: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    routeData$ = new Subject<Record<string, unknown>>();
    masterData.listResources.mockReturnValue(
      of({
        page: 1,
        pageSize: 100,
        total: 2,
        totalPages: 1,
        items: [
          {
            key: 'cargo',
            label: 'Cargos',
            route: '#!/cargo/gestao',
            module: 'Gestao',
            status: 'observed',
            observedActions: ['create', 'edit', 'deactivate'],
            fields: [],
            columns: [
              { key: 'code', label: 'Codigo' },
              { key: 'name', label: 'Nome' },
            ],
          },
          {
            key: 'tipoFerias',
            label: 'Tipos de Ferias',
            route: '#!/tipoFerias/gestao',
            module: 'Gestao',
            status: 'observed',
            observedActions: ['create', 'edit', 'deactivate'],
            fields: [],
            columns: [
              { key: 'code', label: 'Codigo' },
              { key: 'name', label: 'Descricao' },
            ],
          },
        ],
      }),
    );
    masterData.listRecords.mockImplementation((resource: string) => {
      const record =
        resource === 'tipoFerias'
          ? {
              id: 'ferias-1',
              code: 'REG',
              name: 'Ferias regulares',
              description: 'Ferias regulares',
              active: true,
              status: 'observed',
              metadata: {},
              createdAt: '2026-05-04T00:00:00.000Z',
              updatedAt: '2026-05-04T00:00:00.000Z',
            }
          : {
              id: 'cargo-1',
              code: 'ANL',
              name: 'Analista',
              description: '',
              active: true,
              status: 'inferred',
              metadata: {},
              createdAt: '2026-04-16T00:00:00.000Z',
              updatedAt: '2026-04-16T00:00:00.000Z',
            };
      return of({
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        items: [record],
      });
    });
    masterData.createRecord.mockReturnValue(of({ id: 'cargo-2' }));

    await TestBed.configureTestingModule({
      imports: [GestaoModule],
      providers: [
        { provide: MasterData, useValue: masterData },
        { provide: ActivatedRoute, useValue: { data: routeData$.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestaoHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
    routeData$.next({ legacyChildPath: 'cargo' });
  });

  it('loads the selected master-data resource and records', () => {
    expect(component.currentResource?.key).toBe('cargo');
    expect(component.records[0]['name']).toBe('Analista');
    expect(component.columns.map((column) => column.key)).toContain('activeLabel');
  });

  it('creates a new master-data record from the form', () => {
    component.openCreateForm();
    component.form.setValue({
      code: 'QA',
      name: 'Cargo QA',
      description: 'Teste',
      active: true,
    });
    component.save();

    expect(masterData.createRecord).toHaveBeenCalledWith('cargo', {
      code: 'QA',
      name: 'Cargo QA',
      description: 'Teste',
      active: true,
    });
  });

  it('maps the Tipos de Ferias route to the tipoFerias master-data resource', () => {
    routeData$.next({ legacyChildPath: 'tipo-ferias/gestao' });

    expect(component.currentResource?.key).toBe('tipoFerias');
    expect(component.records[0]['name']).toBe('Ferias regulares');
    expect(masterData.listRecords).toHaveBeenLastCalledWith(
      'tipoFerias',
      expect.objectContaining({ page: 1, pageSize: 25 }),
    );
  });
});
