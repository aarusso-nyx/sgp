import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  JobPositionRecord,
  MasterData,
  SalaryRangeLevelRecord,
  SalaryRangeRecord,
} from '../services/master-data';
import { Cargos } from './cargos';

describe('Cargos', () => {
  const salaryRange: SalaryRangeRecord = {
    id: 'range-1',
    code: 'A',
    name: 'Faixa A',
  };
  const salaryLevel: SalaryRangeLevelRecord = {
    id: 'level-1',
    classNumber: 1,
    levelNumber: 1,
    baseSalary: '2500.00',
  };
  const analyst: JobPositionRecord = {
    id: 'job-1',
    code: 'ANL',
    name: 'Analista',
    description: 'Analista municipal',
    category: 'efetivo',
    legalRegime: 'estatutario',
    creationLaw: 'Lei 1/2026',
    vacanciesCount: 3,
    salaryRangeId: 'range-1',
    salaryRangeCode: 'A',
  };

  function makeComponent(overrides: Partial<MasterData> = {}): {
    component: Cargos;
    masterData: MasterData;
  } {
    const masterData = {
      listJobPositions: vi.fn(() => of({ items: [analyst], page: 1, pageSize: 100, total: 1 })),
      listSalaryRanges: vi.fn(() => of([salaryRange])),
      listSalaryLevels: vi.fn(() => of([salaryLevel])),
      createJobPosition: vi.fn(() => of({ ...analyst, id: 'job-2', code: 'TEC' })),
      ...overrides,
    } as unknown as MasterData;

    return {
      component: new Cargos(new FormBuilder(), masterData),
      masterData,
    };
  }

  it('loads job positions and the selected salary table', () => {
    const { component, masterData } = makeComponent();

    component.load();

    expect(component.cargos).toEqual([analyst]);
    expect(component.salaryRanges).toEqual([salaryRange]);
    expect(component.selectedCargo).toEqual(analyst);
    expect(component.salaryLevels).toEqual([salaryLevel]);
    expect(masterData.listSalaryLevels).toHaveBeenCalledWith('range-1');
    expect(component.loading).toBe(false);
  });

  it('saves a new job position and refreshes salary levels', () => {
    const { component, masterData } = makeComponent();
    component.cargos = [analyst];
    component.form.setValue({
      code: 'TEC',
      name: 'Tecnico',
      description: 'Tecnico municipal',
      category: 'efetivo',
      legalRegime: 'estatutario',
      creationLaw: 'Lei 2/2026',
      vacanciesCount: 2,
      salaryRangeId: 'range-1',
    });

    component.save();

    expect(masterData.createJobPosition).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TEC', vacanciesCount: 2 }),
    );
    expect(component.selectedCargo?.code).toBe('TEC');
    expect(component.salaryLevels).toEqual([salaryLevel]);
  });

  it('surfaces load errors without keeping the spinner active', () => {
    const { component } = makeComponent({
      listJobPositions: vi.fn(() => throwError(() => new Error('offline'))),
    });

    component.load();

    expect(component.loading).toBe(false);
    expect(component.error).toBe('Nao foi possivel carregar cargos.');
  });
});
