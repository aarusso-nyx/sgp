import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { GestaoModule } from '../gestao-module';
import { MasterData } from '../services/master-data';
import { GestaoMasterData } from './master-data';

describe('GestaoMasterData', () => {
  let fixture: ComponentFixture<GestaoMasterData>;

  const masterData = {
    listResources: vi.fn(),
    listRecords: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    masterData.listResources.mockReturnValue(
      of({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 }),
    );
    masterData.listRecords.mockImplementation((resource: string) => {
      const items =
        resource === 'lotacao'
          ? [
              record('1', 'ROOT', 'Prefeitura', {}),
              record('2', 'SEC', 'Secretaria', { parentId: '1' }),
              record('3', 'DEP', 'Departamento', { parentId: '2' }),
            ]
          : resource === 'cargo'
            ? [record('4', 'ANL', 'Analista', { vacanciesFilled: 1, vacanciesTotal: 3 })]
            : [record(resource, resource.toUpperCase(), resource, {})];
      return of({ items, page: 1, pageSize: 100, total: items.length, totalPages: 1 });
    });

    await TestBed.configureTestingModule({
      imports: [GestaoModule],
      providers: [{ provide: MasterData, useValue: masterData }],
    }).compileComponents();

    fixture = TestBed.createComponent(GestaoMasterData);
    fixture.detectChanges();
  });

  it('loads a three-level work-location hierarchy without using AdminFeaturePage', () => {
    const component = fixture.componentInstance;

    expect(component.locationTree[0].children[0].children[0].code).toBe('DEP');
    expect(component.jobPositions[0].metadata['vacanciesTotal']).toBe(3);
  });
});

function record(
  id: string,
  code: string,
  name: string,
  metadata: Record<string, unknown>,
) {
  return {
    id,
    code,
    name,
    description: '',
    active: true,
    status: 'observed',
    metadata,
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
  };
}
