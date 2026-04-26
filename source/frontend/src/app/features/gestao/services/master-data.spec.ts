import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { OpenApiClient } from '../../../core/api/generated/openapi-client';
import { MasterData } from './master-data';

describe('MasterData', () => {
  let service: MasterData;

  const api = {
    getApiV1AdminMenus: vi.fn(),
    postApiV1AdminMenus: vi.fn(),
    putApiV1AdminMenusById: vi.fn(),
    deleteApiV1AdminMenusById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getApiV1AdminMenus.mockReturnValue(of({ items: [] }));
    api.postApiV1AdminMenus.mockReturnValue(of({ id: '1' }));
    api.putApiV1AdminMenusById.mockReturnValue(of({ id: '1' }));
    api.deleteApiV1AdminMenusById.mockReturnValue(of({ id: '1', active: false }));

    TestBed.configureTestingModule({
      providers: [{ provide: OpenApiClient, useValue: api }],
    });
    service = TestBed.inject(MasterData);
  });

  it('lists records for canonical admin menus resource', () => {
    service.listRecords('adminMenus', { search: 'analista' }).subscribe();

    expect(api.getApiV1AdminMenus).toHaveBeenCalledWith();
  });

  it('creates, updates, and deactivates records', () => {
    service.createRecord('adminMenus', { code: 'A', name: 'Analista' }).subscribe();
    service.updateRecord('adminMenus', '1', { code: 'B', name: 'Tecnico' }).subscribe();
    service.deactivateRecord('adminMenus', '1').subscribe();

    expect(api.postApiV1AdminMenus).toHaveBeenCalledWith({
      codigo: 'A',
      nome: 'Analista',
      rota: '/',
      ativo: true,
    });
    expect(api.putApiV1AdminMenusById).toHaveBeenCalledWith(
      { id: '1' },
      {
        codigo: 'B',
        nome: 'Tecnico',
        rota: '/',
        ativo: true,
      },
    );
    expect(api.deleteApiV1AdminMenusById).toHaveBeenCalledWith({ id: '1' });
  });
});
