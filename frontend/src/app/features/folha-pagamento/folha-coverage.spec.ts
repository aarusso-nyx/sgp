import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../core/api/api-client';
import { MasterData } from '../gestao/services/master-data';
import { ComprovantesRendimentos } from './comprovantes-rendimentos/comprovantes-rendimentos';
import { ComprovantesRendimentosService } from './comprovantes-rendimentos/comprovantes-rendimentos.service';
import { Contracheques } from './contracheques/contracheques';
import { ContrachequesService } from './contracheques/contracheques.service';
import { ConsignadoPortabilidade } from './consignados/portabilidade/portabilidade';
import { PortabilidadeService } from './consignados/portabilidade/portabilidade.service';
import { Consignados } from './consignados/consignados';
import { ConsignadosService } from './consignados/consignados.service';
import { FolhaMensal } from './competencia/folha-mensal';
import { FolhaMensalService } from './competencia/folha-mensal.service';
import { FgtsRemessas } from './fgts-remessas/fgts-remessas';
import { FgtsRemessasService } from './fgts-remessas/fgts-remessas.service';
import { Fgts } from './fgts/fgts';
import { FgtsApiService } from './fgts/fgts.service';
import { FolhaPagamentoHome } from './pages/folha-pagamento-home/folha-pagamento-home';
import { PisPasep } from './pis-pasep/pis-pasep';
import { PisPasepApiService } from './pis-pasep/pis-pasep.service';
import { DecimoTerceiroProcessamentosService } from './processamentos/decimo-terceiro.service';
import { RescisaoFolha } from './processamentos/rescisao/rescisao';
import { RescisaoFolhaService } from './processamentos/rescisao/rescisao.service';
import { RemessaBancaria } from './remessa/remessa-bancaria';
import { RemessaBancariaService } from './remessa/remessa-bancaria.service';
import { RetornoBancario } from './retorno/retorno-bancario';
import { RetornoBancarioService } from './retorno/retorno-bancario.service';
import { Rubricas } from './rubricas/rubricas';
import { RubricasService } from './rubricas/rubricas.service';
import { SimulacaoFolha } from './simulacao/simulacao';
import { SimulacaoFolhaService } from './simulacao/simulacao.service';

describe('folha coverage flows', () => {
  const api = {
    get: vi.fn(),
    list: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('routes monthly payroll service calls', async () => {
    api.post.mockReturnValue(of(monthlyResult()));
    api.get.mockReturnValue(of(monthlyResult()));
    const service = new FolhaMensalService(api as unknown as ApiClient);
    const input = { year: 2026, month: 5 };

    await firstValueFrom(service.open(input));
    await firstValueFrom(service.calculate(input));
    await firstValueFrom(service.approve(input));
    await firstValueFrom(service.generate(input));
    await firstValueFrom(service.close(input));
    await firstValueFrom(service.review(input));

    expect(api.post).toHaveBeenCalledWith('v1/folhas/mensal/fechar', input);
    expect(api.get).toHaveBeenCalledWith('v1/folhas/mensal/revisao', input);
  });

  it('routes remaining folha service APIs through the shared client', async () => {
    api.get.mockReturnValue(of({}));
    api.list.mockReturnValue(of({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }));
    api.patch.mockReturnValue(of(rubricaRecord()));
    api.post.mockReturnValue(of({}));

    const rubricas = new RubricasService(api as unknown as ApiClient);
    await firstValueFrom(rubricas.list({ page: 2, pageSize: 10, search: 'base' }));
    await firstValueFrom(rubricas.create(rubricaMutation()));
    await firstValueFrom(rubricas.update('rubrica-1', rubricaMutation()));
    await firstValueFrom(rubricas.validateFormula('SALARIO_BASE'));
    await firstValueFrom(rubricas.recompile('rubrica-1'));
    await firstValueFrom(
      rubricas.preview('rubrica-1', {
        employeeId: 'employee-1',
        competenceYear: 2026,
        competenceMonth: 5,
        attributes: {},
      }),
    );
    await firstValueFrom(rubricas.listJobPositionLinks());
    await firstValueFrom(
      rubricas.linkJobPosition({
        jobPositionId: 'job-1',
        rubricaId: 'rubrica-1',
        startsOn: '2026-05-01',
      }),
    );

    const decimo = new DecimoTerceiroProcessamentosService(api as unknown as ApiClient);
    await firstValueFrom(decimo.runAdiantamento(2026));
    await firstValueFrom(decimo.runFechamento(2026));
    await firstValueFrom(decimo.runFerias('vac-1'));
    await firstValueFrom(decimo.getExecutionHistory('run-1'));

    const fgtsRemessas = new FgtsRemessasService(api as unknown as ApiClient);
    await firstValueFrom(fgtsRemessas.generateMonthly('2026-05'));
    await firstValueFrom(
      fgtsRemessas.generateTermination({ employmentLinkId: 'link-1', terminationId: 'term-1' }),
    );
    await firstValueFrom(fgtsRemessas.find('fgts-1'));

    const fgts = new FgtsApiService(api as unknown as ApiClient);
    await firstValueFrom(fgts.byEmployee('employee-1'));
    await firstValueFrom(fgts.reprocess('run-1'));

    await firstValueFrom(
      new ComprovantesRendimentosService(api as unknown as ApiClient).generate(2025),
    );
    await firstValueFrom(
      new ContrachequesService(api as unknown as ApiClient).generate({
        payrollRunId: 'run-1',
        competence: '2026-05-01',
      }),
    );
    await firstValueFrom(
      new PisPasepApiService(api as unknown as ApiClient).byEmployee('employee-1', 2026),
    );
    await firstValueFrom(
      new RetornoBancarioService(api as unknown as ApiClient).process({
        remittanceFileId: 'remit-1',
        remittanceFileHash: 'hash',
        content: 'ret',
      }),
    );
    await firstValueFrom(
      new RetornoBancarioService(api as unknown as ApiClient).reprocessRejected('return-1'),
    );
    await firstValueFrom(
      new RescisaoFolhaService(api as unknown as ApiClient).run({
        employmentLinkId: 'link-1',
        terminationDate: '2026-05-08',
        cause: 'SEM_JUSTA_CAUSA',
        priorNoticeKind: 'NONE',
        priorNoticeReductionMode: 'NONE',
      }),
    );
    await firstValueFrom(
      new SimulacaoFolhaService(api as unknown as ApiClient).run({
        tenantId: 'tenant-1',
        employmentLinkId: 'link-1',
        competence: '2026-05-01',
        overrides: {},
      }),
    );

    const consignados = createWithProviders(ConsignadosService, [
      { provide: ApiClient, useValue: api },
    ]);
    await firstValueFrom(consignados.margin('employee-1', '2026-05'));
    await firstValueFrom(consignados.loans('employee-1'));

    const portabilidade = createWithProviders(PortabilidadeService, [
      { provide: ApiClient, useValue: api },
    ]);
    await firstValueFrom(
      portabilidade.upload({
        sourceConsignmentEntityId: 'source-1',
        targetConsignmentEntityId: 'target-1',
        layout: 'CANONICAL_CSV',
        content: 'file',
      }),
    );
    await firstValueFrom(portabilidade.process('file-1'));

    expect(api.patch).toHaveBeenCalledWith('v1/folha/rubrica/rubrica-1', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/payment/consignment-portability/file-1/process',
      {},
    );
  });

  it('runs all monthly payroll component actions and error handling', () => {
    const service = {
      open: vi.fn(() => of(monthlyResult())),
      calculate: vi.fn(() => of(monthlyResult())),
      approve: vi.fn(() => of(monthlyResult())),
      generate: vi.fn(() => of(monthlyResult())),
      close: vi.fn(() => of(monthlyResult())),
      review: vi.fn(() => throwError(() => new Error('review failed'))),
    };
    const component = createWithProviders(FolhaMensal, [
      FormBuilder,
      { provide: FolhaMensalService, useValue: service },
    ]);

    for (const action of ['open', 'calculate', 'approve', 'generate', 'close'] as const) {
      component.run(action);
      expect(component.result?.payrollRunId).toBe('run-1');
      expect(component.disabled(action)).toBe(false);
    }
    component.run('review');

    expect(component.errorMessage).toBe('review failed');
  });

  it('reviews and approves thirteenth and vacation payroll runs', () => {
    const service = {
      runAdiantamento: vi.fn(() => of(runResult('DECIMO_TERCEIRO_ADIANTAMENTO'))),
      runFechamento: vi.fn(() => of(runResult('DECIMO_TERCEIRO_FECHAMENTO'))),
      runFerias: vi.fn(() => of(feriasResult())),
      getExecutionHistory: vi.fn(() => of([{ id: 'history-1', status: 'OK' }])),
    };
    const component = createWithProviders(FolhaPagamentoHome, [
      FormBuilder,
      { provide: DecimoTerceiroProcessamentosService, useValue: service },
    ]);

    component.review('adiantamento');
    component.approve();
    expect(component.result?.kind).toBe('DECIMO_TERCEIRO_ADIANTAMENTO');

    component.review('fechamento');
    component.cancelReview();
    component.form.controls.vacationRecordId.setValue('vac-1');
    component.reviewFerias();
    component.approve();

    expect(component.feriasResult?.vacationRecordId).toBe('vac-1');
    expect(component.executionHistory).toHaveLength(1);
  });

  it('routes bank remittance service calls and component states', async () => {
    api.list.mockReturnValue(
      of({ items: [remittance()], page: 1, pageSize: 25, total: 1, totalPages: 1 }),
    );
    api.post.mockReturnValue(
      of({ requestId: 'request-1', status: 'REQUESTED', requestedAt: 'now', metadata: {} }),
    );
    api.get.mockReturnValue(
      of({ documentId: 'doc-1', downloadUrl: 'https://download.test', expiresAt: 'later' }),
    );
    const service = new RemessaBancariaService(api as unknown as ApiClient);

    await firstValueFrom(service.list(2026, 5));
    await firstValueFrom(service.generate({ payrollRunId: 'run-1', bankId: '001' }));
    await firstValueFrom(service.download('doc-1'));

    const component = createWithProviders(RemessaBancaria, [
      FormBuilder,
      { provide: RemessaBancariaService, useValue: service },
    ]);
    component.form.patchValue({ year: 2026, month: 5, payrollRunId: 'run-1', bankId: '001' });
    component.load();
    component.generate();
    component.download(remittance());

    expect(component.remittances).toHaveLength(1);
    expect(component.infoMessage).toContain('request-1');
  });

  it('processes and reprocesses bank returns', () => {
    const service = {
      process: vi.fn(() =>
        of({ returnFileId: 'return-1', processedRecords: 2, rejectedRecords: 1 }),
      ),
      reprocessRejected: vi.fn(() => of({ remittanceFileId: 'remittance-2', detailCount: 1 })),
    };
    const component = createWithProviders(RetornoBancario, [
      FormBuilder,
      { provide: RetornoBancarioService, useValue: service },
    ]);

    component.process();
    expect(component.form.controls.remittanceFileId.touched).toBe(true);

    component.form.patchValue({
      remittanceFileId: 'remit-1',
      remittanceFileHash: 'hash',
      content: 'return file',
    });
    component.process();
    component.reprocessRejected();

    expect(component.infoMessage).toContain('remittance-2');
  });

  it('runs payroll simulation success and failure paths', () => {
    const service = {
      run: vi
        .fn()
        .mockReturnValueOnce(
          of({
            tenantId: 'tenant-1',
            employmentLinkId: 'link-1',
            competence: '2026-05-01',
            totals: { currentNet: '900.00', simulatedNet: '1000.00', netDelta: '100.00' },
            lines: [],
          }),
        )
        .mockReturnValueOnce(
          of({
            tenantId: 'tenant-1',
            employmentLinkId: 'link-1',
            competence: '2026-05-01',
            totals: { currentNet: '900.00', simulatedNet: '900.00', netDelta: '0.00' },
            lines: [],
          }),
        )
        .mockReturnValueOnce(throwError(() => 'raw')),
    };
    const component = createWithProviders(SimulacaoFolha, [
      FormBuilder,
      { provide: SimulacaoFolhaService, useValue: service },
    ]);

    component.run();
    expect(component.form.controls.tenantId.touched).toBe(true);

    component.form.patchValue({
      tenantId: 'tenant-1',
      employmentLinkId: 'link-1',
      baseSalary: '1000.00',
      dependentCount: '2',
      rubricId: 'rubrica-1',
      rubricAmount: '100.00',
    });
    component.run();
    expect(component.result?.totals.netDelta).toBe('100.00');

    component.form.patchValue({
      baseSalary: '',
      dependentCount: '',
      rubricId: '',
      rubricAmount: '',
      rubricQuantity: '',
    });
    component.run();
    expect(component.result?.totals.netDelta).toBe('0.00');

    component.run();

    expect(component.errorMessage).toBeTruthy();
  });

  it('covers rubrica catalog mutations, previews, links, and linting', () => {
    const rubricasService = {
      list: vi.fn(() =>
        of({ items: [rubricaRecord()], page: 1, pageSize: 100, total: 1, totalPages: 1 }),
      ),
      listJobPositionLinks: vi.fn(() => of([])),
      validateFormula: vi.fn(() => of({ ready: true, error: null })),
      recompile: vi.fn(() => of(rubricaRecord('rubrica-2'))),
      update: vi.fn(() => of(rubricaRecord('rubrica-3'))),
      create: vi.fn(() => of(rubricaRecord('rubrica-4'))),
      preview: vi.fn(() =>
        of({
          rubricaId: 'rubrica-1',
          employeeId: 'employee-1',
          competence: '2026-05',
          amount: null,
          attributes: {},
        }),
      ),
      linkJobPosition: vi.fn(() => of({ id: 'link-1' })),
    };
    const component = createWithProviders(Rubricas, [
      FormBuilder,
      { provide: RubricasService, useValue: rubricasService },
      {
        provide: MasterData,
        useValue: {
          listJobPositions: vi.fn(() =>
            of({
              items: [{ id: 'job-1', name: 'Analista' }],
              page: 1,
              pageSize: 100,
              total: 1,
              totalPages: 1,
            }),
          ),
        },
      },
    ]);

    component.ngOnInit();
    component.attributeForm.patchValue({
      name: 'BONUS',
      type: 'decimal',
      defaultValue: '10.00',
      required: true,
    });
    component.addAttribute();
    component.form.controls.formulaExpression.setValue('SALARIO_BASE + UNKNOWN_ATTR');
    expect(component.formulaLintMessages).toContain('Atributo desconhecido: UNKNOWN_ATTR');
    component.validateFormula();
    component.previewForm.patchValue({
      employeeId: 'employee-1',
      competenceYear: 2026,
      competenceMonth: 5,
    });
    component.preview();
    expect(component.previewAmount).toBe('sem valor');
    component.linkForm.patchValue({
      jobPositionId: 'job-1',
      startsOn: '2026-05-01',
      applicationCondition: 'active',
    });
    component.linkJobPosition();
    component.recompileNow();
    component.save();
    component.removeAttribute('BONUS');
    component.newRubrica();
    component.form.patchValue({
      code: '100',
      description: 'Base',
      formulaExpression: 'SALARIO_BASE',
      startsOn: '2026-05-01',
    });
    component.save();
    component.ngOnDestroy();

    expect(rubricasService.create).toHaveBeenCalled();
    expect(rubricasService.update).toHaveBeenCalled();
  });

  it('covers rubrica validation guards, fallback values, and service errors', () => {
    const rubricasService = {
      list: vi.fn(() => of({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 })),
      listJobPositionLinks: vi.fn(() => of([])),
      validateFormula: vi
        .fn()
        .mockReturnValueOnce(of({ ready: false, error: 'syntax error' }))
        .mockReturnValueOnce(of({ ready: false, error: null }))
        .mockReturnValueOnce(throwError(() => 'raw')),
      recompile: vi.fn(() => throwError(() => 'raw')),
      update: vi.fn(() => throwError(() => 'raw')),
      create: vi.fn(() => throwError(() => 'raw')),
      preview: vi.fn(() => throwError(() => 'raw')),
      linkJobPosition: vi.fn(() => throwError(() => 'raw')),
    };
    const component = createWithProviders(Rubricas, [
      FormBuilder,
      { provide: RubricasService, useValue: rubricasService },
      {
        provide: MasterData,
        useValue: {
          listJobPositions: vi.fn(() => throwError(() => 'raw')),
        },
      },
    ]);

    component.ngOnInit();
    expect(component.error).toBeTruthy();

    component.attributeForm.controls.name.setValue('');
    component.addAttribute();
    expect(component.attributeForm.controls.name.touched).toBe(true);

    component.attributeForm.patchValue({
      name: 'EMPTY_DEFAULT',
      type: 'decimal',
      defaultValue: '',
    });
    component.addAttribute();
    expect(component.attributes[0]?.defaultValue).toBeNull();

    const nullableRubrica = {
      ...rubricaRecord(),
      endsOn: '2026-12-31',
      formulaAlias: 'BASE_ALIAS',
      formulaExpression: null,
      incidences: {
        irrf: false,
        inss: false,
        fgts: true,
        rpps: true,
        employerContribution: true,
      },
      attributes: [
        { name: 'OPTIONAL', type: 'text' as const, defaultValue: null, required: false },
      ],
    };
    component.select(nullableRubrica);
    expect(component.form.controls.formulaExpression.value).toBe('');

    component.form.controls.formulaExpression.setValue('UNKNOWN_A');
    component.validateFormula();
    expect(component.message).toBe('syntax error');
    component.validateFormula();
    expect(component.message).toBeTruthy();
    component.validateFormula();
    expect(component.error).toBeTruthy();

    component.recompileNow();
    component.form.patchValue({
      code: '100',
      description: 'Base',
      formulaExpression: '',
      formulaAlias: '',
      esocialCode: '',
      officialRubricCode: '',
      startsOn: '2026-05-01',
    });
    component.save();

    component.previewForm.patchValue({
      employeeId: 'employee-1',
      competenceYear: 2026,
      competenceMonth: 5,
    });
    component.preview();
    component.linkForm.patchValue({ jobPositionId: 'job-1', startsOn: '2026-05-01' });
    component.linkJobPosition();

    component.selected = undefined;
    component.recompileNow();
    component.preview();
    component.linkJobPosition();
    component.form.controls.code.setValue('');
    component.save();
    component.ngOnDestroy();

    expect(component.error).toBeTruthy();
    expect(component.previewForm.controls.employeeId.touched).toBe(true);
    expect(component.linkForm.controls.jobPositionId.touched).toBe(true);
  });

  it('covers FGTS remittance, account, payslip, PIS, income, and rescission components', () => {
    const fgtsRemessas = createWithProviders(FgtsRemessas, [
      FormBuilder,
      {
        provide: FgtsRemessasService,
        useValue: {
          generateMonthly: vi.fn(() => of(fgtsRemittance())),
          generateTermination: vi.fn(() => of(fgtsRemittance('GRRF_TERMINATION'))),
          find: vi.fn(() => of(fgtsRemittance())),
        },
      },
    ]);
    fgtsRemessas.generateMonthly();
    fgtsRemessas.form.patchValue({
      employmentLinkId: 'link-1',
      terminationId: 'term-1',
      remittanceId: 'fgts-1',
    });
    fgtsRemessas.generateTermination();
    fgtsRemessas.load();
    fgtsRemessas.download();
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fgts');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    fgtsRemessas.download();
    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
    click.mockRestore();

    const fgts = createWithProviders(Fgts, [
      FormBuilder,
      {
        provide: FgtsApiService,
        useValue: {
          byEmployee: vi.fn(() => of([fgtsAccount()])),
          reprocess: vi.fn(() => of([{ accountId: 'acc-1' }])),
        },
      },
    ]);
    fgts.load();
    fgts.form.patchValue({ employeeId: 'employee-1', payrollRunId: 'run-1' });
    fgts.load();
    fgts.reprocess();

    const contracheques = createWithProviders(Contracheques, [
      FormBuilder,
      {
        provide: ContrachequesService,
        useValue: {
          generate: vi.fn(() =>
            of({ batchId: 'batch-1', status: 'OK', fileCount: 1, errorCount: 0 }),
          ),
        },
      },
    ]);
    contracheques.generate();
    contracheques.form.controls.payrollRunId.setValue('run-1');
    contracheques.generate();

    const pis = createWithProviders(PisPasep, [
      FormBuilder,
      {
        provide: PisPasepApiService,
        useValue: {
          byEmployee: vi.fn(() =>
            of({
              employeeId: 'employee-1',
              registration: 'MAT-1',
              employeeName: 'Servidor',
              cpf: null,
              year: 2026,
              program: 'PASEP',
              monthlyBase: {},
              totalBase: '1000.00',
              updatedAt: '2026-05-08',
            }),
          ),
        },
      },
    ]);
    pis.load();
    pis.form.controls.employeeId.setValue('employee-1');
    pis.load();

    const comprovantes = createWithProviders(ComprovantesRendimentos, [
      FormBuilder,
      {
        provide: ComprovantesRendimentosService,
        useValue: {
          generate: vi.fn(() =>
            of({ batchId: 'income-1', status: 'OK', fileCount: 1, errorCount: 0, files: [] }),
          ),
        },
      },
    ]);
    comprovantes.generate();

    const rescisao = createWithProviders(RescisaoFolha, [
      FormBuilder,
      { provide: RescisaoFolhaService, useValue: { run: vi.fn(() => of(rescisaoResult())) } },
    ]);
    rescisao.run();
    rescisao.form.patchValue({ employmentLinkId: 'link-1', terminationDate: '2026-05-08' });
    rescisao.run();

    expect(fgtsRemessas.remittance?.kind).toBe('GRF_MONTHLY');
    expect(fgts.accounts).toHaveLength(1);
    expect(contracheques.result?.batchId).toBe('batch-1');
    expect(pis.result?.program).toBe('PASEP');
    expect(comprovantes.result?.batchId).toBe('income-1');
    expect(rescisao.fgtsFine?.code).toBe('RESC_MULTA_FGTS_40');
    expect(rescisao.priorNotice?.code).toBe('RESC_AVISO_PREVIO');
  });

  it('covers consignment margin and portability flows', () => {
    const consignados = createWithProviders(Consignados, [
      FormBuilder,
      {
        provide: ConsignadosService,
        useValue: {
          margin: vi.fn(() =>
            of({
              employeeId: 'employee-1',
              competence: '2026-05',
              netBase: '1000.00',
              availableGeneral: '100.00',
              availableCard: '50.00',
              usedGeneral: '10.00',
              usedCard: '5.00',
            }),
          ),
          loans: vi.fn(() =>
            of([
              {
                loanId: 'loan-1',
                consignmentEntityName: 'Bank',
                contractNumber: 'C-1',
                kind: 'LOAN',
                monthlyAmount: '10.00',
                installmentsTotal: 12,
                installmentsPaid: 1,
                remainingInstallments: 11,
                status: 'ACTIVE',
              },
            ]),
          ),
        },
      },
    ]);
    consignados.load();
    consignados.form.controls.employeeId.setValue('employee-1');
    consignados.load();

    const portabilidade = createWithProviders(ConsignadoPortabilidade, [
      FormBuilder,
      {
        provide: PortabilidadeService,
        useValue: {
          upload: vi.fn(() =>
            of({ fileId: 'file-1', status: 'UPLOADED', detailCount: 1, fileHash: 'hash' }),
          ),
          process: vi.fn(() => of({ fileId: 'file-1', processed: 1, matched: 1, unmatched: 0 })),
        },
      },
    ]);
    portabilidade.upload();
    portabilidade.form.patchValue({
      sourceConsignmentEntityId: 'source-1',
      targetConsignmentEntityId: 'target-1',
      content: 'contract',
      fileName: 'portability.csv',
    });
    portabilidade.upload();
    portabilidade.process();

    expect(consignados.margin?.employeeId).toBe('employee-1');
    expect(consignados.loans).toHaveLength(1);
    expect(portabilidade.processResult?.matched).toBe(1);
  });

  it('handles folha validation skips and fallback error messages', () => {
    const fgtsRemessas = createWithProviders(FgtsRemessas, [
      FormBuilder,
      {
        provide: FgtsRemessasService,
        useValue: {
          generateMonthly: vi.fn(() => throwError(() => 'raw')),
          generateTermination: vi.fn(() => throwError(() => 'raw')),
          find: vi.fn(() => throwError(() => 'raw')),
        },
      },
    ]);
    fgtsRemessas.form.controls.competence.setValue('');
    fgtsRemessas.generateMonthly();
    expect(fgtsRemessas.form.controls.competence.touched).toBe(true);
    fgtsRemessas.form.patchValue({
      competence: '2026-05',
      employmentLinkId: 'link-1',
      terminationId: 'term-1',
      remittanceId: 'fgts-1',
    });
    fgtsRemessas.generateMonthly();
    fgtsRemessas.generateTermination();
    fgtsRemessas.load();
    expect(fgtsRemessas.errorMessage).toBeTruthy();

    const fgts = createWithProviders(Fgts, [
      FormBuilder,
      {
        provide: FgtsApiService,
        useValue: {
          byEmployee: vi.fn(() => throwError(() => 'raw')),
          reprocess: vi.fn(() => throwError(() => 'raw')),
        },
      },
    ]);
    fgts.form.patchValue({ employeeId: 'employee-1', payrollRunId: 'run-1' });
    fgts.load();
    fgts.reprocess();
    expect(fgts.errorMessage).toBeTruthy();

    const contracheques = createWithProviders(Contracheques, [
      FormBuilder,
      {
        provide: ContrachequesService,
        useValue: { generate: vi.fn(() => throwError(() => 'raw')) },
      },
    ]);
    contracheques.form.controls.payrollRunId.setValue('run-1');
    contracheques.generate();
    expect(contracheques.errorMessage).toBeTruthy();

    const comprovantes = createWithProviders(ComprovantesRendimentos, [
      FormBuilder,
      {
        provide: ComprovantesRendimentosService,
        useValue: { generate: vi.fn(() => throwError(() => 'raw')) },
      },
    ]);
    comprovantes.form.controls.yearBase.setValue(1999);
    comprovantes.generate();
    expect(comprovantes.form.controls.yearBase.touched).toBe(true);
    comprovantes.form.controls.yearBase.setValue(2025);
    comprovantes.generate();
    expect(comprovantes.errorMessage).toBeTruthy();

    const remessa = createWithProviders(RemessaBancaria, [
      FormBuilder,
      {
        provide: RemessaBancariaService,
        useValue: {
          list: vi.fn(() => throwError(() => 'raw')),
          generate: vi.fn(() => throwError(() => 'raw')),
          download: vi.fn(() => throwError(() => 'raw')),
        },
      },
    ]);
    remessa.form.controls.year.setValue(1999);
    remessa.load();
    expect(remessa.form.controls.year.touched).toBe(true);
    remessa.form.patchValue({ year: 2026, month: 5, payrollRunId: 'run-1', bankId: '001' });
    remessa.load();
    remessa.generate();
    remessa.download({ ...remittance(), attachmentId: null });
    remessa.download(remittance());
    expect(remessa.errorMessage).toBeTruthy();

    const retorno = createWithProviders(RetornoBancario, [
      FormBuilder,
      {
        provide: RetornoBancarioService,
        useValue: {
          process: vi.fn(() => throwError(() => 'raw')),
          reprocessRejected: vi.fn(() => throwError(() => 'raw')),
        },
      },
    ]);
    retorno.reprocessRejected();
    expect(retorno.form.controls.returnFileId.touched).toBe(true);
    retorno.form.patchValue({
      remittanceFileId: 'remit-1',
      remittanceFileHash: 'hash',
      returnFileId: 'return-1',
      content: 'return',
    });
    retorno.process();
    retorno.reprocessRejected();
    expect(retorno.errorMessage).toBeTruthy();

    const consignados = createWithProviders(Consignados, [
      FormBuilder,
      {
        provide: ConsignadosService,
        useValue: {
          margin: vi.fn(() => throwError(() => 'raw')),
          loans: vi.fn(() => throwError(() => 'raw')),
        },
      },
    ]);
    consignados.form.controls.employeeId.setValue('employee-1');
    consignados.load();
    expect(consignados.errorMessage).toBeTruthy();

    const portabilidade = createWithProviders(ConsignadoPortabilidade, [
      FormBuilder,
      {
        provide: PortabilidadeService,
        useValue: {
          upload: vi.fn(() => throwError(() => 'raw')),
          process: vi.fn(() => throwError(() => 'raw')),
        },
      },
    ]);
    portabilidade.process();
    portabilidade.form.patchValue({
      sourceConsignmentEntityId: 'source-1',
      targetConsignmentEntityId: 'target-1',
      content: 'contract',
    });
    portabilidade.upload();
    portabilidade.uploadResult = {
      fileId: 'file-1',
      status: 'UPLOADED',
      detailCount: 1,
      fileHash: 'hash',
    };
    portabilidade.process();
    expect(portabilidade.errorMessage).toBeTruthy();

    const pis = createWithProviders(PisPasep, [
      FormBuilder,
      {
        provide: PisPasepApiService,
        useValue: { byEmployee: vi.fn(() => throwError(() => 'raw')) },
      },
    ]);
    pis.form.patchValue({ employeeId: 'employee-1', year: 2026 });
    pis.load();
    expect(pis.errorMessage).toBeTruthy();

    const rescisao = createWithProviders(RescisaoFolha, [
      FormBuilder,
      { provide: RescisaoFolhaService, useValue: { run: vi.fn(() => throwError(() => 'raw')) } },
    ]);
    rescisao.form.patchValue({ employmentLinkId: 'link-1', terminationDate: '2026-05-08' });
    rescisao.run();
    expect(rescisao.errorMessage).toBeTruthy();
  });
});

function createWithProviders<T>(type: new () => T, providers: unknown[]): T {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers });
  return TestBed.runInInjectionContext(() => new type());
}

function monthlyResult() {
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
    review: [],
  };
}

function runResult(kind: 'DECIMO_TERCEIRO_ADIANTAMENTO' | 'DECIMO_TERCEIRO_FECHAMENTO') {
  return {
    payrollRunId: 'run-1',
    kind,
    year: 2026,
    month: 12,
    employeeCount: 1,
    totalEarnings: '1000.00',
    totalDeductions: '0.00',
    totalNet: '1000.00',
  };
}

function feriasResult() {
  return {
    payrollRunId: 'run-ferias',
    vacationRecordId: 'vac-1',
    employeeId: 'employee-1',
    year: 2026,
    month: 5,
    employeeCount: 1,
    totalEarnings: '1000.00',
    totalDeductions: '0.00',
    totalNet: '1000.00',
  };
}

function remittance() {
  return {
    id: 'remittance-1',
    status: 'GENERATED',
    competenceYear: 2026,
    competenceMonth: 5,
    paymentDate: null,
    fileName: 'remessa.ret',
    fileHash: 'hash',
    bankCode: 1,
    layoutVersion: 'CNAB240',
    recordCount: 1,
    totalAmount: '1000.00',
    generatedAt: '2026-05-08T00:00:00Z',
    attachmentId: 'doc-1',
    createdAt: '2026-05-08T00:00:00Z',
    updatedAt: '2026-05-08T00:00:00Z',
  };
}

function rubricaRecord(id = 'rubrica-1') {
  return {
    id,
    code: '100',
    description: 'Base salary',
    type: 'provento' as const,
    taxable: true,
    active: true,
    incidences: { irrf: true, inss: true, fgts: false, rpps: false, employerContribution: false },
    startsOn: '2026-05-01',
    endsOn: null,
    formulaAlias: null,
    formulaExpression: 'SALARIO_BASE',
    formulaReady: true,
    formulaError: null,
    attributes: [
      { name: 'SALARIO_BASE', type: 'decimal' as const, defaultValue: '1000.00', required: true },
    ],
  };
}

function rubricaMutation() {
  return {
    code: '100',
    description: 'Base salary',
    type: 'provento' as const,
    taxable: true,
    active: true,
    incidences: {},
    startsOn: '2026-05-01',
    endsOn: null,
    formulaAlias: null,
    formulaExpression: 'SALARIO_BASE',
    attributes: [],
  };
}

function fgtsRemittance(kind: 'GRF_MONTHLY' | 'GRRF_TERMINATION' = 'GRF_MONTHLY') {
  return {
    id: 'fgts-1',
    tenantId: 'tenant-1',
    competence: '2026-05',
    kind,
    status: 'GENERATED',
    generatedAt: '2026-05-08T00:00:00Z',
    paidAt: null,
    totalBase: '1000.00',
    totalAmount: '80.00',
    fileUri: null,
    daeBarcode: null,
    layoutVersion: 'SIFGE',
    adapterKey: 'sandbox',
    fileHash: 'hash',
    signed: false,
    createdAt: '2026-05-08T00:00:00Z',
    updatedAt: '2026-05-08T00:00:00Z',
    fileContentBase64: 'U0lGR0U=',
  };
}

function fgtsAccount() {
  return {
    accountId: 'acc-1',
    employeeId: 'employee-1',
    employmentLinkId: 'link-1',
    status: 'ACTIVE',
    openedAt: '2026-01-01',
    closedAt: null,
    depositBalance: '80.00',
    rescissionFineTotal: '0.00',
    movements: [],
  };
}

function rescisaoResult() {
  return {
    payrollRunId: 'run-rescisao',
    employeeId: 'employee-1',
    terminationDate: '2026-05-08',
    components: [
      { code: 'RESC_MULTA_FGTS_40', description: 'FGTS fine', amount: '40.00' },
      { code: 'RESC_AVISO_PREVIO', description: 'Notice', amount: '100.00' },
    ],
    totals: { earnings: '100.00', deductions: '0.00', net: '100.00' },
  };
}
