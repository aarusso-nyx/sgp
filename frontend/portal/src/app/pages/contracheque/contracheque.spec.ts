import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiClient } from '../../core/api/api-client';
import { Contracheque } from './contracheque';

describe('Contracheque', () => {
  let fixture: ComponentFixture<Contracheque>;
  const api = {
    get: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    api.get.mockReturnValue(of(paystub()));
    await TestBed.configureTestingModule({
      imports: [Contracheque],
      providers: [
        { provide: ApiClient, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ competence: '2026-05' })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Contracheque);
    fixture.detectChanges();
  });

  it('loads the paystub for the selected competence', () => {
    expect(api.get).toHaveBeenCalledWith('v1/portal/contracheque/2026-05');
    expect(fixture.nativeElement.textContent).toContain('Servidor Um');
    expect(fixture.nativeElement.textContent).toContain('1000.00');
  });

  it('handles invalid, empty, error, and download paths', () => {
    const component = fixture.componentInstance;

    component.form.controls.competence.setValue('2026');
    component.load();
    expect(component.form.controls.competence.touched).toBe(true);

    component.paystub = null;
    component.downloadHtml();

    api.get.mockReturnValueOnce(throwError(() => new Error('missing paystub')));
    component.form.controls.competence.setValue('2026-06');
    component.load();
    expect(component.error).toBe('Contracheque indisponivel para a competencia.');
    expect(component.paystub).toBeNull();

    component.paystub = paystub();
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:paystub');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    component.downloadHtml();
    expect(createObjectUrl).toHaveBeenCalled();
    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
    click.mockRestore();
  });
});

function paystub() {
  return {
    payrollRunId: 'run-1',
    competence: '2026-05',
    status: 'GENERATED',
    employee: {
      registration: 'MAT-1',
      name: 'Servidor Um',
    },
    totals: {
      earnings: '1000.00',
      deductions: '0.00',
      net: '1000.00',
    },
    lines: [
      {
        code: 'MONTHLY_BASE_SALARY',
        description: 'Monthly base salary',
        kind: 'EARNING',
        amount: '1000.00',
      },
    ],
    html: '<html></html>',
  };
}
