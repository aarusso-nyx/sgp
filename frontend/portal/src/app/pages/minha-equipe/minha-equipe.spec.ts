import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../core/api/api-client';
import { MinhaEquipe } from './minha-equipe';

describe('MinhaEquipe', () => {
  let fixture: ComponentFixture<MinhaEquipe>;
  const queue = [
    {
      kind: 'leave',
      id: 'leave-1',
      employeeRegistration: 'MAT-1',
      employeeName: 'Servidor Um',
      title: 'Licenca',
      startsOn: '2026-05-10',
      endsOn: '2026-05-12',
      days: 3,
      status: 'ACTIVE',
      requestedAt: '2026-05-08T12:00:00.000Z',
    },
  ];
  const api = {
    get: vi.fn(() => of(queue)),
    post: vi.fn(() => of({ ok: true })),
  };

  beforeEach(async () => {
    api.get.mockClear();
    api.post.mockClear();
    await TestBed.configureTestingModule({
      imports: [MinhaEquipe],
      providers: [
        {
          provide: ApiClient,
          useValue: api,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MinhaEquipe);
    fixture.detectChanges();
  });

  it('loads the approval queue and posts approval actions', () => {
    const component = fixture.componentInstance;

    const item = component.queue[0];
    expect(item).toBeDefined();
    component.approve(item!);

    expect(api.get).toHaveBeenCalledWith('v1/portal/minha-equipe/aprovacoes');
    expect(api.post).toHaveBeenCalledWith(
      'v1/portal/minha-equipe/aprovacoes/leave/leave-1/aprovar',
      {},
    );
    expect(component.queue).toEqual([]);
  });
});
