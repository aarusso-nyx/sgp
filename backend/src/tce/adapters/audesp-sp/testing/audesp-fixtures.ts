import { AudespLayoutField, AudespPayrollEnvelope } from '../audesp-sp.types';

export function audespFixturePayload(): AudespPayrollEnvelope {
  return {
    adapterId: 'audesp-sp',
    layoutCode: 'AUDESP-FOLHA',
    layoutVersion: '0.0.1',
    tenantId: '00000000-0000-0000-0000-000000000100',
    payrollRunId: '00000000-0000-4000-8000-000000001200',
    organizationCode: '3550308',
    competenceYear: 2026,
    competenceMonth: 4,
    shipmentKind: 'FOLHA_PAGAMENTO',
    generatedAt: '2026-05-02T00:00:00.000Z',
    servers: [
      {
        employeeId: '00000000-0000-4000-8000-000000000001',
        registration: 'MAT-001',
        cpf: '11122233344',
        position: 'Analista',
        earnings: '3000.00',
        deductions: '330.00',
        net: '2670.00',
      },
      {
        employeeId: '00000000-0000-4000-8000-000000000002',
        registration: 'MAT-002',
        cpf: '22233344405',
        position: 'Professor',
        earnings: '4200.00',
        deductions: '245.50',
        net: '3954.50',
      },
    ],
  };
}

export function audespLayoutFields(): AudespLayoutField[] {
  return [
    field('AudespFolha', 'XML_NODE', true),
    field('AudespFolha.Cabecalho', 'XML_NODE', true),
    field('AudespFolha.Cabecalho.OrgaoCodigo', 'STRING', true, 20),
    field('AudespFolha.Cabecalho.CompetenciaAno', 'INT', true),
    field('AudespFolha.Cabecalho.CompetenciaMes', 'INT', true),
    field('AudespFolha.Cabecalho.TipoRemessa', 'STRING', true, 20),
    field('AudespFolha.Servidores.Servidor', 'XML_NODE', true),
    field('AudespFolha.Servidores.Servidor.Matricula', 'STRING', true, 30),
    field('AudespFolha.Servidores.Servidor.Cpf', 'STRING', true, 11),
    field('AudespFolha.Servidores.Servidor.Cargo', 'STRING', true, 120),
    field(
      'AudespFolha.Servidores.Servidor.Proventos',
      'DECIMAL',
      true,
      null,
      14,
      2,
    ),
    field(
      'AudespFolha.Servidores.Servidor.Descontos',
      'DECIMAL',
      true,
      null,
      14,
      2,
    ),
    field(
      'AudespFolha.Servidores.Servidor.Liquido',
      'DECIMAL',
      true,
      null,
      14,
      2,
    ),
  ];
}

function field(
  fieldPath: string,
  dataType: AudespLayoutField['dataType'],
  required: boolean,
  maxLength: number | null = null,
  decimalPrecision: number | null = null,
  decimalScale: number | null = null,
): AudespLayoutField {
  return {
    fieldPath,
    dataType,
    required,
    maxLength,
    decimalPrecision,
    decimalScale,
  };
}
