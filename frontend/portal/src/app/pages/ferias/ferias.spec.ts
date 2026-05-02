import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';
import { Ferias } from './ferias';

describe('Ferias', () => {
  let fixture: ComponentFixture<Ferias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ferias],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { url: of([{ path: 'solicitar' }]) },
        },
        {
          provide: ApiClient,
          useValue: {
            get: () => of([]),
            post: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Ferias);
    fixture.detectChanges();
  });

  it('limits vacation installments to three periods', () => {
    const component = fixture.componentInstance;

    component.addInstallment();
    component.addInstallment();
    component.addInstallment();

    expect(component.installments.length).toBe(3);
  });
});
