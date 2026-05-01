import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ApiClient } from '../../../core/api/api-client';
import { SaudePericia } from './pericia';

describe('SaudePericia', () => {
  let fixture: ComponentFixture<SaudePericia>;
  let api: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = {
      get: vi.fn(() => of([])),
      post: vi.fn(() =>
        of({
          appointment_id: 'appointment-1',
          scheduledOn: '2026-05-01',
          scheduledTime: '09:00',
          status: 'SCHEDULED',
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [SaudePericia],
      providers: [{ provide: ApiClient, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(SaudePericia);
    fixture.detectChanges();
  });

  it('schedules an appointment and fills the opinion form', () => {
    const component = fixture.componentInstance;
    component.scheduleForm.patchValue({
      employeeId: 'employee-1',
      slotRef: 'slot-1',
      scheduledOn: '2026-05-01',
      scheduledTime: '09:00',
    });

    component.schedule();

    expect(api.post).toHaveBeenCalledWith(
      'v1/licencas/saude/agendamento',
      expect.objectContaining({ slotRef: 'slot-1' }),
    );
    expect(component.opinionForm.value['appointmentId']).toBe('appointment-1');
  });

  it('loads medical leaves for an employee', () => {
    const component = fixture.componentInstance;
    component.lookupForm.patchValue({ employeeId: 'employee-1' });

    component.loadLeaves();

    expect(api.get).toHaveBeenCalledWith('v1/licencas/saude/employee-1');
  });
});
