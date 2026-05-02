import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { PublicoTransparencia } from './transparencia';
import { TransparenciaService } from './transparencia.service';

describe('PublicoTransparencia', () => {
  let fixture: ComponentFixture<PublicoTransparencia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, PublicoTransparencia],
      providers: [
        {
          provide: TransparenciaService,
          useValue: {
            list: () => of({ items: [], total: 0, totalPages: 0, page: 1, pageSize: 20 }),
            csvUrl: () => '/api/v1/public/transparency/tenant/payroll.csv',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicoTransparencia);
    fixture.detectChanges();
  });

  it('renders labelled keyboard-reachable filter controls and CSV export', () => {
    const element: HTMLElement = fixture.nativeElement;
    const labels = Array.from(element.querySelectorAll('label')).map((label) =>
      label.textContent?.trim(),
    );

    expect(labels.join(' ')).toContain('Competencia');
    expect(labels.join(' ')).toContain('Orgao');
    expect(labels.join(' ')).toContain('Cargo');
    expect(labels.join(' ')).toContain('Nome');
    expect(element.querySelector('button[type="submit"]')?.textContent).toContain('Filtrar');
    expect(element.querySelector('a.transparencia__csv')?.textContent).toContain('Exportar CSV');
  });
});
