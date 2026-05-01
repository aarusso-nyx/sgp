import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { LicencasSaude } from './saude';

describe('LicencasSaude', () => {
  let fixture: ComponentFixture<LicencasSaude>;
  let api: { get: () => unknown; post: () => unknown };

  beforeEach(async () => {
    api = {
      get: () => of([{ id: 'leave-1', grantedDays: 5 }]),
      post: () => of({ appointment_id: 'appointment-1' }),
    };

    await TestBed.configureTestingModule({
      imports: [LicencasSaude],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { url: of([{ path: 'solicitar' }]) },
        },
        { provide: ApiClient, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LicencasSaude);
    fixture.detectChanges();
  });

  it('submits the medical leave appointment request', () => {
    const component = fixture.componentInstance;
    component.form.patchValue({
      employeeId: 'employee-1',
      slotRef: 'slot-1',
      scheduledOn: '2026-05-01',
      scheduledTime: '09:00',
    });

    component.submit();

    expect(component.message).toBe('Solicitacao de pericia registrada.');
  });
});
