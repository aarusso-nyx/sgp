import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { FolhaPagamentoModule } from '../../folha-pagamento-module';
import { DecimoTerceiroProcessamentosService } from '../../processamentos/decimo-terceiro.service';
import { FolhaPagamentoHome } from './folha-pagamento-home';

describe('FolhaPagamentoHome', () => {
  let component: FolhaPagamentoHome;
  let fixture: ComponentFixture<FolhaPagamentoHome>;

  const decimoTerceiroService = {
    runAdiantamento: () =>
      of({
        payrollRunId: 'run-1',
        kind: 'DECIMO_TERCEIRO_ADIANTAMENTO',
        year: 2026,
        month: 11,
        employeeCount: 1,
        totalEarnings: '5000.00',
        totalDeductions: '0.00',
        totalNet: '5000.00',
      }),
    runFechamento: () =>
      of({
        payrollRunId: 'run-2',
        kind: 'DECIMO_TERCEIRO_FECHAMENTO',
        year: 2026,
        month: 12,
        employeeCount: 1,
        totalEarnings: '10000.00',
        totalDeductions: '5000.00',
        totalNet: '5000.00',
      }),
    runFerias: () =>
      of({
        payrollRunId: 'run-3',
        vacationRecordId: 'vacation-1',
        employeeId: 'employee-1',
        year: 2026,
        month: 5,
        employeeCount: 1,
        totalEarnings: '1500.00',
        totalDeductions: '0.00',
        totalNet: '1500.00',
      }),
    getExecutionHistory: () => of([]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolhaPagamentoModule],
      providers: [
        {
          provide: DecimoTerceiroProcessamentosService,
          useValue: decimoTerceiroService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FolhaPagamentoHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
