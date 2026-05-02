import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { RhModule } from '../../rh-module';
import { RhWorkflows } from '../../services/rh-workflows';
import { RhHome } from './rh-home';

describe('RhHome', () => {
  let component: RhHome;
  let fixture: ComponentFixture<RhHome>;
  let routeData$: Subject<Record<string, unknown>>;

  const rhWorkflows = {
    listWorkflowDefinitions: vi.fn(),
    listEmployees: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    deactivateEmployee: vi.fn(),
    listWorkflow: vi.fn(),
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    deleteWorkflow: vi.fn(),
    requestImport: vi.fn(),
    requestReport: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    routeData$ = new Subject<Record<string, unknown>>();
    rhWorkflows.listWorkflowDefinitions.mockReturnValue(
      of([{ key: 'dependents', label: 'Dependentes' }]),
    );
    rhWorkflows.listEmployees.mockReturnValue(
      of({
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        items: [
          {
            id: 'emp-1',
            registration: 'MAT-1',
            name: 'Servidor',
            cpf: null,
            email: null,
            lifecycleStatus: 'ACTIVE',
            functionalStatus: 'Ativo',
            branch: 'Sede',
            active: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    rhWorkflows.listWorkflow.mockReturnValue(
      of({
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        items: [
          {
            id: 'dep-1',
            workflow: 'dependents',
            employeeId: 'emp-1',
            employeeRegistration: 'MAT-1',
            employeeName: 'Servidor',
            title: 'Dependente',
            subtitle: 'Filho',
            startsOn: null,
            endsOn: null,
            status: 'ACTIVE',
            metadata: { relationship: 'Filho' },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    rhWorkflows.createWorkflow.mockReturnValue(of({ id: 'dep-2' }));
    rhWorkflows.createEmployee.mockReturnValue(of({ id: 'emp-2' }));

    await TestBed.configureTestingModule({
      imports: [RhModule],
      providers: [
        { provide: RhWorkflows, useValue: rhWorkflows },
        { provide: ActivatedRoute, useValue: { data: routeData$.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RhHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads employee registry by default', () => {
    routeData$.next({ legacyChildPath: 'funcionario' });

    expect(component.currentConfig.key).toBe('employees');
    expect(component.records[0]['name']).toBe('Servidor');
  });

  it('maps legacy dependent route to RH workflow API', () => {
    routeData$.next({ legacyChildPath: 'dependente' });

    expect(component.currentConfig.key).toBe('dependents');
    expect(rhWorkflows.listWorkflow).toHaveBeenCalledWith('dependents', {
      page: 1,
      pageSize: 25,
      search: '',
    });
  });

  it('creates workflow records from dynamic form fields', () => {
    routeData$.next({ legacyChildPath: 'dependente' });
    component.openCreateForm();
    component.form.patchValue({
      employeeId: 'emp-1',
      name: 'Dependente',
      cpf: '000',
      relationship: 'Filho',
      birthDate: '2020-01-01',
      incomeTaxDependent: true,
    });
    component.save();

    expect(rhWorkflows.createWorkflow).toHaveBeenCalledWith('dependents', {
      employeeId: 'emp-1',
      name: 'Dependente',
      cpf: '000',
      relationship: 'Filho',
      incomeTaxDependent: true,
      metadata: { birthDate: '2020-01-01' },
    });
  });
});
