import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { RhWorkflows } from '../services/rh-workflows';
import { RhFerias } from './ferias';

describe('RhFerias', () => {
  let fixture: ComponentFixture<RhFerias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RhFerias],
      imports: [ReactiveFormsModule],
      providers: [
        {
          provide: ApiClient,
          useValue: {
            get: () => of([]),
            post: () => of({ id: 'vac-1', status: 'aprovado' }),
          },
        },
        {
          provide: RhWorkflows,
          useValue: {
            listEmployees: () => of({ items: [], page: 1, pageSize: 50, total: 0 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RhFerias);
    fixture.detectChanges();
  });

  it('requires a vacation schedule id before approval', () => {
    const component = fixture.componentInstance;

    component.approve();

    expect(component.approvalForm.invalid).toBe(true);
  });
});
