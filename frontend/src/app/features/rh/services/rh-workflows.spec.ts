import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { OpenApiClient } from '../../../core/api/openapi-client';
import { RhWorkflows } from './rh-workflows';

describe('RhWorkflows', () => {
  let service: RhWorkflows;

  const api = {
    getApiV1Funcionarios: vi.fn(),
    postApiV1Funcionarios: vi.fn(),
    postApiV1FuncionariosDesligamentoByFuncRescisao: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getApiV1Funcionarios.mockReturnValue(of({ items: [] }));
    api.postApiV1Funcionarios.mockReturnValue(of({ employee: { id: '1' } }));
    api.postApiV1FuncionariosDesligamentoByFuncRescisao.mockReturnValue(
      of({ employee: { id: '1', lifecycleStatus: 'TERMINATED' } }),
    );

    TestBed.configureTestingModule({
      providers: [{ provide: OpenApiClient, useValue: api }],
    });
    service = TestBed.inject(RhWorkflows);
  });

  it('loads definitions and canonical employee list', () => {
    service.listWorkflowDefinitions().subscribe();
    service.listEmployees({ search: 'filho' }).subscribe();

    expect(api.getApiV1Funcionarios).toHaveBeenCalledWith({ search: 'filho' });
  });

  it('creates and terminates employee records via canonical funcionarios endpoint', () => {
    service.createEmployee({ registration: 'M1', name: 'Servidor' }).subscribe();
    service
      .terminateEmployee('u-1', {
        terminationDate: '2026-04-15',
        terminationReasonId: 'reason-1',
      })
      .subscribe();

    expect(api.postApiV1Funcionarios).toHaveBeenCalledWith({
      registration: 'M1',
      name: 'Servidor',
    });
    expect(api.postApiV1FuncionariosDesligamentoByFuncRescisao).toHaveBeenCalledWith(
      { func_rescisao: 'u-1' },
      {
        terminationDate: '2026-04-15',
        terminationReasonId: 'reason-1',
      },
    );
  });
});
