import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AdminFeaturePage } from './admin-feature-page';

describe('AdminFeaturePage', () => {
  let fixture: ComponentFixture<AdminFeaturePage>;
  let component: AdminFeaturePage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFeaturePage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              moduleKey: 'avaliacao',
              featureRoutePath: '/avaliacao/avaliacao-desempenho/gestao',
            }),
            paramMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFeaturePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads documented feature metadata from route data', () => {
    expect(component.feature.label).toBe('Avaliação de Desempenho');
    expect(component.filteredRecords.length).toBe(3);
  });

  it('creates workspace records from the generic form', () => {
    component.openCreateForm();
    component.form.patchValue({
      code: 'AVD-010',
      title: 'Ciclo anual',
      status: 'Ativo',
      owner: 'Gestor',
      updatedAt: '2026-04-26',
    });
    component.save();

    expect(component.records[0].code).toBe('AVD-010');
    expect(component.message).toContain('incluído');
  });
});
