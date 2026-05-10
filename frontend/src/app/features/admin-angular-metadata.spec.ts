import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ProviderToken } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { ApiClient } from '../core/api/api-client';
import { FiscalDctfweb } from './fiscal/dctfweb/dctfweb';
import { DctfwebApiService } from './fiscal/dctfweb/dctfweb.service';
import { FiscalDirf } from './fiscal/dirf/dirf';
import { DirfApiService } from './fiscal/dirf/dirf.service';
import { FiscalGpsResidual } from './fiscal/gps-residual/gps-residual';
import { GpsResidualApiService } from './fiscal/gps-residual/gps-residual.service';
import { ComprovantesRendimentos } from './folha-pagamento/comprovantes-rendimentos/comprovantes-rendimentos';
import { ComprovantesRendimentosService } from './folha-pagamento/comprovantes-rendimentos/comprovantes-rendimentos.service';
import { Consignados } from './folha-pagamento/consignados/consignados';
import { ConsignadosService } from './folha-pagamento/consignados/consignados.service';
import { ConsignadoPortabilidade } from './folha-pagamento/consignados/portabilidade/portabilidade';
import { PortabilidadeService } from './folha-pagamento/consignados/portabilidade/portabilidade.service';
import { Contracheques } from './folha-pagamento/contracheques/contracheques';
import { ContrachequesService } from './folha-pagamento/contracheques/contracheques.service';
import { FolhaMensal } from './folha-pagamento/competencia/folha-mensal';
import { FolhaMensalService } from './folha-pagamento/competencia/folha-mensal.service';
import { FgtsRemessas } from './folha-pagamento/fgts-remessas/fgts-remessas';
import { FgtsRemessasService } from './folha-pagamento/fgts-remessas/fgts-remessas.service';
import { Fgts } from './folha-pagamento/fgts/fgts';
import { FgtsApiService } from './folha-pagamento/fgts/fgts.service';
import { FolhaPagamentoHome } from './folha-pagamento/pages/folha-pagamento-home/folha-pagamento-home';
import { PisPasep } from './folha-pagamento/pis-pasep/pis-pasep';
import { PisPasepApiService } from './folha-pagamento/pis-pasep/pis-pasep.service';
import { DecimoTerceiroProcessamentosService } from './folha-pagamento/processamentos/decimo-terceiro.service';
import { RescisaoFolha } from './folha-pagamento/processamentos/rescisao/rescisao';
import { RescisaoFolhaService } from './folha-pagamento/processamentos/rescisao/rescisao.service';
import { RemessaBancaria } from './folha-pagamento/remessa/remessa-bancaria';
import { RemessaBancariaService } from './folha-pagamento/remessa/remessa-bancaria.service';
import { RetornoBancario } from './folha-pagamento/retorno/retorno-bancario';
import { RetornoBancarioService } from './folha-pagamento/retorno/retorno-bancario.service';
import { Rubricas } from './folha-pagamento/rubricas/rubricas';
import { RubricasService } from './folha-pagamento/rubricas/rubricas.service';
import { SimulacaoFolha } from './folha-pagamento/simulacao/simulacao';
import { SimulacaoFolhaService } from './folha-pagamento/simulacao/simulacao.service';
import { MasterData } from './gestao/services/master-data';
import { PortalPublicoBiometria } from './portal-publico/concursos/inscricao/biometria/biometria';
import { PortalPublicoInscricao } from './portal-publico/concursos/inscricao/inscricao';
import { LgpdEncarregado } from './portal/lgpd-encarregado/lgpd-encarregado';
import { RecrutamentoAvaliacao } from './recrutamento/avaliacao/avaliacao';
import { RecrutamentoBanca } from './recrutamento/banca/banca';
import { RecrutamentoBiometria } from './recrutamento/biometria/biometria';
import { RecrutamentoClassificacao } from './recrutamento/classificacao/classificacao';
import { RecrutamentoConcursos } from './recrutamento/concursos/concursos';
import { RecrutamentoNomeacao } from './recrutamento/nomeacao/nomeacao';
import { RecrutamentoPosse } from './recrutamento/posse/posse';
import { RecrutamentoProvaOnlineReview } from './recrutamento/prova-online-review/prova-online-review';

describe('admin Angular metadata coverage', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('creates routed standalone admin components through Angular TestBed', () => {
    TestBed.configureTestingModule({
      imports: [
        FiscalDctfweb,
        FiscalDirf,
        FiscalGpsResidual,
        PortalPublicoBiometria,
        PortalPublicoInscricao,
        LgpdEncarregado,
        RecrutamentoAvaliacao,
        RecrutamentoBanca,
        RecrutamentoBiometria,
        RecrutamentoClassificacao,
        RecrutamentoConcursos,
        RecrutamentoNomeacao,
        RecrutamentoPosse,
        RecrutamentoProvaOnlineReview,
      ],
      providers: [
        { provide: DctfwebApiService, useValue: dctfwebService() },
        { provide: DirfApiService, useValue: dirfService() },
        { provide: GpsResidualApiService, useValue: gpsService() },
        { provide: ApiClient, useValue: apiClient() },
      ],
    });

    const fixtures = [
      TestBed.createComponent(FiscalDctfweb),
      TestBed.createComponent(FiscalDirf),
      TestBed.createComponent(FiscalGpsResidual),
      TestBed.createComponent(PortalPublicoBiometria),
      TestBed.createComponent(PortalPublicoInscricao),
      TestBed.createComponent(LgpdEncarregado),
      TestBed.createComponent(RecrutamentoAvaliacao),
      TestBed.createComponent(RecrutamentoBanca),
      TestBed.createComponent(RecrutamentoBiometria),
      TestBed.createComponent(RecrutamentoClassificacao),
      TestBed.createComponent(RecrutamentoConcursos),
      TestBed.createComponent(RecrutamentoNomeacao),
      TestBed.createComponent(RecrutamentoPosse),
      TestBed.createComponent(RecrutamentoProvaOnlineReview),
    ];

    for (const fixture of fixtures) {
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
      destroy(fixture);
    }
  });

  it('resolves payroll and fiscal services through Angular dependency injection', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: apiClient() }],
    });

    const services: ProviderToken<unknown>[] = [
      DctfwebApiService,
      DirfApiService,
      GpsResidualApiService,
      FolhaMensalService,
      ComprovantesRendimentosService,
      ConsignadosService,
      PortabilidadeService,
      ContrachequesService,
      FgtsApiService,
      FgtsRemessasService,
      PisPasepApiService,
      DecimoTerceiroProcessamentosService,
      RescisaoFolhaService,
      RemessaBancariaService,
      RetornoBancarioService,
      RubricasService,
      SimulacaoFolhaService,
    ];

    for (const service of services) {
      expect(TestBed.inject(service)).toBeTruthy();
    }
  });

  it('creates payroll module declarations through Angular TestBed', () => {
    TestBed.configureTestingModule({
      declarations: [
        Consignados,
        ConsignadoPortabilidade,
        Contracheques,
        FolhaMensal,
        Fgts,
        FgtsRemessas,
        FolhaPagamentoHome,
        PisPasep,
        RescisaoFolha,
        RemessaBancaria,
        RetornoBancario,
        Rubricas,
        SimulacaoFolha,
      ],
      imports: [CommonModule, FormsModule, ReactiveFormsModule, ComprovantesRendimentos],
      providers: [
        FormBuilder,
        { provide: ComprovantesRendimentosService, useValue: componentService() },
        { provide: ConsignadosService, useValue: componentService() },
        { provide: PortabilidadeService, useValue: componentService() },
        { provide: ContrachequesService, useValue: componentService() },
        { provide: FolhaMensalService, useValue: componentService() },
        { provide: FgtsApiService, useValue: componentService() },
        { provide: FgtsRemessasService, useValue: componentService() },
        { provide: PisPasepApiService, useValue: componentService() },
        { provide: DecimoTerceiroProcessamentosService, useValue: componentService() },
        { provide: RescisaoFolhaService, useValue: componentService() },
        { provide: RemessaBancariaService, useValue: componentService() },
        { provide: RetornoBancarioService, useValue: componentService() },
        { provide: RubricasService, useValue: componentService() },
        { provide: SimulacaoFolhaService, useValue: componentService() },
        { provide: MasterData, useValue: componentService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    const fixtures = [
      TestBed.createComponent(ComprovantesRendimentos),
      TestBed.createComponent(Consignados),
      TestBed.createComponent(ConsignadoPortabilidade),
      TestBed.createComponent(Contracheques),
      TestBed.createComponent(FolhaMensal),
      TestBed.createComponent(Fgts),
      TestBed.createComponent(FgtsRemessas),
      TestBed.createComponent(FolhaPagamentoHome),
      TestBed.createComponent(PisPasep),
      TestBed.createComponent(RescisaoFolha),
      TestBed.createComponent(RemessaBancaria),
      TestBed.createComponent(RetornoBancario),
      TestBed.createComponent(Rubricas),
      TestBed.createComponent(SimulacaoFolha),
    ];

    for (const fixture of fixtures) {
      expect(fixture.componentInstance).toBeTruthy();
      destroy(fixture);
    }
  });
});

function destroy(fixture: ComponentFixture<unknown>): void {
  fixture.destroy();
}

function apiClient() {
  return {
    get: vi.fn(() => of([])),
    list: vi.fn(() => of({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 })),
    patch: vi.fn(() => of({})),
    post: vi.fn(() => of({})),
  };
}

function dctfwebService() {
  return {
    list: vi.fn(() => of([])),
    generate: vi.fn(() => of({})),
    sign: vi.fn(() => of({})),
    transmit: vi.fn(() => of({})),
  };
}

function dirfService() {
  return {
    list: vi.fn(() => of([])),
    generate: vi.fn(() => of({})),
  };
}

function gpsService() {
  return {
    paymentCodes: vi.fn(() => of([])),
    list: vi.fn(() => of([])),
    generate: vi.fn(() => of({})),
  };
}

function componentService() {
  return {
    approve: vi.fn(() => of({})),
    byEmployee: vi.fn(() => of([])),
    calculate: vi.fn(() => of({})),
    close: vi.fn(() => of({})),
    create: vi.fn(() => of({})),
    download: vi.fn(() => of({})),
    find: vi.fn(() => of({})),
    generate: vi.fn(() => of({})),
    generateMonthly: vi.fn(() => of({})),
    generateTermination: vi.fn(() => of({})),
    getExecutionHistory: vi.fn(() => of([])),
    linkJobPosition: vi.fn(() => of({})),
    list: vi.fn(() => of({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 })),
    listJobPositionLinks: vi.fn(() => of([])),
    listJobPositions: vi.fn(() =>
      of({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
    ),
    loans: vi.fn(() => of([])),
    margin: vi.fn(() => of({})),
    open: vi.fn(() => of({})),
    patch: vi.fn(() => of({})),
    post: vi.fn(() => of({})),
    preview: vi.fn(() => of({})),
    process: vi.fn(() => of({})),
    recompile: vi.fn(() => of({})),
    reprocess: vi.fn(() => of([])),
    reprocessRejected: vi.fn(() => of({})),
    review: vi.fn(() => of({})),
    run: vi.fn(() => of({})),
    runAdiantamento: vi.fn(() => of({})),
    runFechamento: vi.fn(() => of({})),
    runFerias: vi.fn(() => of({})),
    update: vi.fn(() => of({})),
    upload: vi.fn(() => of({})),
    validateFormula: vi.fn(() => of({ ready: true, error: null })),
  };
}
