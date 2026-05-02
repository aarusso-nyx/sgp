import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { MoneyBrPipe } from '../../../shared/money-br.pipe';
import { FolhaMensal } from './folha-mensal';
import { FolhaMensalService } from './folha-mensal.service';

describe('FolhaMensal', () => {
  let fixture: ComponentFixture<FolhaMensal>;
  const service = {
    open: vi.fn(),
    calculate: vi.fn(),
    approve: vi.fn(),
    generate: vi.fn(),
    close: vi.fn(),
    review: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    service.open.mockReturnValue(of(result()));
    await TestBed.configureTestingModule({
      declarations: [FolhaMensal, MoneyBrPipe],
      imports: [
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
      ],
      providers: [{ provide: FolhaMensalService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(FolhaMensal);
    fixture.detectChanges();
  });

  it('opens a monthly competence and renders totals', () => {
    fixture.componentInstance.form.patchValue({ year: 2026, month: 5 });
    fixture.componentInstance.run('open');
    fixture.detectChanges();

    expect(service.open).toHaveBeenCalledWith({ year: 2026, month: 5 });
    expect(fixture.nativeElement.textContent).toContain('OPEN');
    expect(fixture.nativeElement.textContent).toContain('MAT-1');
  });
});

function result() {
  return {
    competenceId: 'competence-1',
    payrollRunId: 'run-1',
    competenceYear: 2026,
    competenceMonth: 5,
    competenceStatus: 'OPEN',
    payrollStatus: 'DRAFT',
    employeeCount: 1,
    totalEarnings: '1000.00',
    totalDeductions: '0.00',
    totalNet: '1000.00',
    review: [
      {
        employeeId: 'employee-1',
        registration: 'MAT-1',
        employeeName: 'Servidor Um',
        totalEarnings: '1000.00',
        totalDeductions: '0.00',
        netAmount: '1000.00',
      },
    ],
  };
}
