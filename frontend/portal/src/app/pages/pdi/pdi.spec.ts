import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../core/api/api-client';
import { Pdi } from './pdi';

describe('Pdi', () => {
  let fixture: ComponentFixture<Pdi>;
  const api = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  };

  beforeEach(async () => {
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();

    api.get.mockImplementation((path: string) => {
      if (path === 'v1/portal/meus-dados/cadastro') {
        return of({ id: 'employee-1' });
      }
      if (path === 'v1/rh/pdi?employeeId=employee-1') {
        return of([
          {
            id: 'pdi-1',
            employeeId: 'employee-1',
            managerEmployeeId: 'mgr-1',
            periodStart: '2026-01-01',
            periodEnd: '2026-12-31',
            status: 'ACTIVE',
            objective: 'Crescer em arquitetura.',
            managerReview: '',
            reviewedAt: null,
          },
        ]);
      }
      if (path === 'v1/rh/pdi/pdi-1/metas') {
        return of([
          {
            id: 'goal-1',
            developmentPlanId: 'pdi-1',
            description: 'Concluir curso NestJS',
            status: 'PENDING',
            dueAt: '2026-06-30',
            completedAt: null,
            notes: '',
          },
        ]);
      }
      return of([]);
    });

    api.post.mockImplementation((_path: string, body: Record<string, unknown>) =>
      of({
        id: 'goal-2',
        developmentPlanId: 'pdi-1',
        description: body['description'],
        status: 'PENDING',
        dueAt: body['dueAt'] ?? null,
        completedAt: null,
        notes: '',
      }),
    );

    api.patch.mockImplementation((_path: string, _body: Record<string, unknown>) =>
      of({
        id: 'goal-1',
        developmentPlanId: 'pdi-1',
        description: 'Concluir curso NestJS',
        status: 'DONE',
        dueAt: '2026-06-30',
        completedAt: '2026-05-10',
        notes: '',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [Pdi],
      providers: [{ provide: ApiClient, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(Pdi);
    fixture.detectChanges();
  });

  it('loads active PDI plus goals and adds a new goal', () => {
    const component = fixture.componentInstance;
    expect(component.activePlan?.id).toBe('pdi-1');
    expect(component.goals).toHaveLength(1);
    expect(component.goals[0]?.description).toBe('Concluir curso NestJS');

    component.goalForm.patchValue({
      description: 'Aprender Postgres avancado',
      dueAt: '2026-12-15',
    });
    component.addGoal();

    expect(api.post).toHaveBeenCalledWith(
      'v1/rh/pdi/pdi-1/metas',
      expect.objectContaining({
        description: 'Aprender Postgres avancado',
        dueAt: '2026-12-15',
      }),
    );
    expect(component.goals).toHaveLength(2);
  });

  it('marks a goal as DONE through patch endpoint', () => {
    const component = fixture.componentInstance;
    const target = component.goals[0];
    if (!target) throw new Error('expected goal-1 to be loaded');
    component.markGoalDone(target);
    expect(api.patch).toHaveBeenCalledWith(`v1/rh/pdi/metas/${target.id}`, { status: 'DONE' });
    expect(component.goals.find((goal) => goal.id === target.id)?.status).toBe('DONE');
  });
});
