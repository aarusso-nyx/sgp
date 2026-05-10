import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';
import { Licencas } from './licencas';

describe('Licencas', () => {
  let fixture: ComponentFixture<Licencas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Licencas],
      providers: [
        {
          provide: ApiClient,
          useValue: {
            get: () => of([]),
            post: () =>
              of({
                id: 'leave-1',
                reason: 'maternidade',
                startsOn: '2026-05-01',
                endsOn: '2026-08-28',
                days: 120,
                paid: true,
                status: 'ACTIVE',
              }),
          },
        },
        { provide: ActivatedRoute, useValue: { url: of([{ path: 'solicitacoes' }]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Licencas);
    fixture.detectChanges();
  });

  it('submits maternity leave requests', () => {
    const component = fixture.componentInstance;
    component.form.patchValue({
      employeeId: 'employee-1',
      reason: 'maternidade',
      startsOn: '2026-05-01',
      days: 120,
    });

    component.submit();

    expect(component.records[0]!.days).toBe(120);
  });
});
