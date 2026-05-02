import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { MeusDados } from './meus-dados';

describe('MeusDados', () => {
  let fixture: ComponentFixture<MeusDados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeusDados],
      providers: [
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: { url: of([{ path: 'meus-dados' }, { path: 'endereco' }]) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MeusDados);
  });

  it('builds a visible diff before submit', () => {
    const component = fixture.componentInstance;
    component.section = 'endereco';
    component.current = { street: 'Rua A', number: '10', city: 'Recife', zipCode: '50000' };
    component['patchForm']();

    component.form.patchValue({ fieldA: 'Rua B' });

    expect(component.diff).toEqual([{ field: 'street', before: 'Rua A', after: 'Rua B' }]);
  });
});
