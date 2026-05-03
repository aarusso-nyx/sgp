import type { AuditEventQueryDto } from '../audit/audit.dto';
import type { CreateConsignmentLoanDto } from '../folha-pagamento/operations/consignment/consignment.dto';
import type {
  CalculatePayrollRunDto,
  CreateAdvancePaymentDto,
  CreatePayrollRunDto,
  PopulatePayrollRunDto,
  RunDecimoTerceiroDto,
  RunFeriasPayrollDto,
  UpdatePayrollRunStatusDto,
} from '../folha-pagamento/payroll/payroll.dto';
import type {
  JobPositionMutationDto,
  SalaryRangeLevelMutationDto,
  SalaryRangeMutationDto,
} from '../gestao/master-data/job-position.dto';
import type {
  AdmitEmployeeDto,
  ChangeContractRegimeDto,
  EmployeeMutationDto,
  TerminateEmployeeDto,
} from '../rh/employees/employees.dto';
import type {
  ConcursoVagaDto,
  CreateConcursoDto,
  CreateEditalDto,
  PublishEditalDto,
} from '../recrutamento/concurso/concurso.dto';

type SnapshotCase = {
  readonly surface: string;
  readonly payload: unknown;
};

function stableDto(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload.map((item) => stableDto(item));
  if (!payload || typeof payload !== 'object') return payload;

  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, stableDto(value)]),
  );
}

describe('DTO serialization snapshots', () => {
  const cases: SnapshotCase[] = [
    {
      surface: 'AuditEventQueryDto',
      payload: {
        actor: 'auditor',
        action: 'UPDATE',
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.000Z',
        page: 2,
        pageSize: 50,
        resourceType: 'employee',
        statusCode: 403,
      } satisfies Partial<AuditEventQueryDto>,
    },
    {
      surface: 'JobPositionMutationDto',
      payload: {
        code: 'ANL-RH',
        name: 'Analista de RH',
        category: 'efetivo',
        legalRegime: 'estatutario',
        creationLaw: 'Lei 100/2026',
        vacanciesCount: 5,
      } satisfies JobPositionMutationDto,
    },
    {
      surface: 'SalaryRangeMutationDto',
      payload: {
        code: 'RH-A',
        name: 'RH Classe A',
        classCode: 'A',
        groupCode: 'RH',
        startsOn: '2026-05-01',
      } satisfies SalaryRangeMutationDto,
    },
    {
      surface: 'SalaryRangeLevelMutationDto',
      payload: {
        salaryRangeId: '00000000-0000-4000-8000-000000000151',
        code: 'A1',
        name: 'Nivel A1',
        classNumber: 1,
        levelNumber: 1,
        baseSalary: '4200.00',
      } satisfies SalaryRangeLevelMutationDto,
    },
    {
      surface: 'EmployeeMutationDto',
      payload: {
        registration: '000151',
        name: 'Servidor Snapshot',
        cpf: '12345678901',
        email: 'servidor@example.test',
        active: true,
      } satisfies EmployeeMutationDto,
    },
    {
      surface: 'AdmitEmployeeDto',
      payload: {
        registration: '000152',
        name: 'Servidor Admitido',
        hiredOn: '2026-05-02',
        appointedOn: '2026-04-20',
        possessionOn: '2026-05-01',
        exerciseOn: '2026-05-02',
        active: true,
      } satisfies AdmitEmployeeDto,
    },
    {
      surface: 'TerminateEmployeeDto',
      payload: {
        terminationDate: '2026-05-31',
        terminationReasonId: 'aposentadoria',
        justification: 'Portaria 151/2026',
        generateTerminationPayroll: true,
      } satisfies TerminateEmployeeDto,
    },
    {
      surface: 'ChangeContractRegimeDto',
      payload: {
        contractType: 'statutory',
        effectiveOn: '2026-06-01',
        regimeLawReference: 'Lei 151/2026',
        justification: 'Alteracao por concurso interno',
      } satisfies ChangeContractRegimeDto,
    },
    {
      surface: 'CreatePayrollRunDto',
      payload: {
        competenceYear: 2026,
        competenceMonth: 5,
        payrollTypeId: 'mensal',
        processingTypeId: 'normal',
        branchId: 'matriz',
      } satisfies CreatePayrollRunDto,
    },
    {
      surface: 'UpdatePayrollRunStatusDto',
      payload: {
        status: 'APPROVED',
      } satisfies UpdatePayrollRunStatusDto,
    },
    {
      surface: 'CalculatePayrollRunDto',
      payload: {
        mode: 'TOTAL',
      } satisfies CalculatePayrollRunDto,
    },
    {
      surface: 'PopulatePayrollRunDto',
      payload: {
        replaceCalculatedItems: true,
      } satisfies PopulatePayrollRunDto,
    },
    {
      surface: 'CreateAdvancePaymentDto',
      payload: {
        employeeId: '00000000-0000-4000-8000-000000000153',
        requestedAmount: '1200.00',
        approvedAmount: '1000.00',
        requestedOn: '2026-05-03',
        notes: 'Adiantamento autorizado',
      } satisfies CreateAdvancePaymentDto,
    },
    {
      surface: 'RunDecimoTerceiroDto',
      payload: {
        year: 2026,
      } satisfies RunDecimoTerceiroDto,
    },
    {
      surface: 'RunFeriasPayrollDto',
      payload: {
        vacationRecordId: '00000000-0000-4000-8000-000000000154',
      } satisfies RunFeriasPayrollDto,
    },
    {
      surface: 'CreateConsignmentLoanDto',
      payload: {
        consignmentEntityId: '00000000-0000-4000-8000-000000000155',
        contractNumber: 'CONSIG-151',
        kind: 'PAYROLL_LOAN',
        monthlyAmount: '350.00',
        installmentsTotal: 24,
        installmentsPaid: 2,
        rate: '1.450000',
        validFrom: '2026-05-01',
        validTo: '2028-04-30',
      } satisfies CreateConsignmentLoanDto,
    },
    {
      surface: 'ConcursoVagaDto',
      payload: {
        positionId: '00000000-0000-4000-8000-000000000156',
        totalSeats: 10,
        pcdSeats: 1,
        racialSeats: 2,
        indigenousSeats: 1,
        requirement: { schooling: 'SUPERIOR' },
        baseSalary: '5100.00',
      } satisfies ConcursoVagaDto,
    },
    {
      surface: 'CreateConcursoDto',
      payload: {
        code: 'CP-2026-01',
        name: 'Concurso Publico Snapshot',
        validUntil: '2028-05-03',
        vagas: [
          {
            positionId: '00000000-0000-4000-8000-000000000156',
            totalSeats: 10,
            pcdSeats: 1,
            racialSeats: 2,
            indigenousSeats: 1,
            baseSalary: '5100.00',
          },
        ],
      } satisfies CreateConcursoDto,
    },
    {
      surface: 'CreateEditalDto',
      payload: {
        documentRef: 's3://sgp/editais/cp-2026-01.pdf',
        administrativeAct: 'Portaria 151/2026',
        administrativeActDate: '2026-05-03',
        resourceDeadlineAt: '2026-05-10T23:59:59.000Z',
      } satisfies CreateEditalDto,
    },
    {
      surface: 'PublishEditalDto',
      payload: {
        administrativeAct: 'Portaria 151/2026',
        administrativeActDate: '2026-05-03',
        publicUrl: 'https://publico.example.test/editais/cp-2026-01',
      } satisfies PublishEditalDto,
    },
  ];

  it.each(cases)('$surface remains stable on the wire', ({ payload }) => {
    expect(stableDto(payload)).toMatchSnapshot();
  });
});
