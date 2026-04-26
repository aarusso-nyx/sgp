import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { OpenApiClient } from '../../../core/api/generated/openapi-client';
import { RhWorkflows } from './rh-workflows';

describe('RhWorkflows', () => {
  let service: RhWorkflows;

  const api = {
    getApiV1AdminUsuarios: vi.fn(),
    postApiV1AdminUsuarios: vi.fn(),
    patchApiV1AdminUsuariosById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getApiV1AdminUsuarios.mockReturnValue(of({ items: [] }));
    api.postApiV1AdminUsuarios.mockReturnValue(of({ id: '1' }));
    api.patchApiV1AdminUsuariosById.mockReturnValue(of({ id: '1' }));

    TestBed.configureTestingModule({
      providers: [{ provide: OpenApiClient, useValue: api }],
    });
    service = TestBed.inject(RhWorkflows);
  });

  it('loads definitions and canonical employee list', () => {
    service.listWorkflowDefinitions().subscribe();
    service.listEmployees({ search: 'filho' }).subscribe();

    expect(api.getApiV1AdminUsuarios).toHaveBeenCalledWith({ search: 'filho' });
  });

  it('creates and updates employee records via canonical users endpoint', () => {
    service.createEmployee({ registration: 'M1', name: 'Servidor' }).subscribe();
    service.updateEmployee('u-1', { name: 'Servidor 2' }).subscribe();

    expect(api.postApiV1AdminUsuarios).toHaveBeenCalledWith({
      registration: 'M1',
      name: 'Servidor',
    });
    expect(api.patchApiV1AdminUsuariosById).toHaveBeenCalledWith(
      { id: 'u-1' },
      { name: 'Servidor 2' },
    );
  });
});
