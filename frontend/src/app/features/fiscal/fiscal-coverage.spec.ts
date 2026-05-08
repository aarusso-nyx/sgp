import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../core/api/api-client';
import { FiscalDctfweb } from './dctfweb/dctfweb';
import { DctfwebApiService } from './dctfweb/dctfweb.service';
import { FiscalDirf } from './dirf/dirf';
import { DirfApiService } from './dirf/dirf.service';
import { FiscalGpsResidual } from './gps-residual/gps-residual';
import { GpsResidualApiService } from './gps-residual/gps-residual.service';

describe('fiscal coverage flows', () => {
  const api = {
    get: vi.fn(),
    post: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('routes DCTFWeb service calls through the API client', async () => {
    api.get.mockReturnValue(of([dctfwebDeclaration('decl-1')]));
    api.post.mockReturnValue(of(dctfwebDeclaration('decl-2')));
    const service = new DctfwebApiService(api as unknown as ApiClient);

    await firstValueFrom(service.list(2026, 5));
    await firstValueFrom(service.generate({ year: 2026, month: 5, kind: 'ORIGINAL' }));
    await firstValueFrom(service.sign('decl-2'));
    await firstValueFrom(service.transmit('decl-2'));

    expect(api.get).toHaveBeenCalledWith('v1/admin/fiscal/dctfweb', { year: 2026, month: 5 });
    expect(api.post).toHaveBeenCalledWith('v1/admin/fiscal/dctfweb/decl-2/transmitir', {});
  });

  it('loads, generates, signs, transmits, selects, and formats DCTFWeb declarations', async () => {
    const service = {
      list: vi.fn(() => of([dctfwebDeclaration('decl-1')])),
      generate: vi.fn(() => of(dctfwebDeclaration('decl-2'))),
      sign: vi.fn(() => of(dctfwebDeclaration('decl-2', 'SIGNED'))),
      transmit: vi.fn(() => of(dctfwebDeclaration('decl-2', 'TRANSMITTED'))),
    };
    const component = createWithProviders(FiscalDctfweb, [
      FormBuilder,
      { provide: DctfwebApiService, useValue: service },
    ]);

    await component.load();
    await component.generate();
    await component.sign(component.declarations[0]);
    await component.transmit(component.declarations[0]);
    component.select(component.declarations[0]);

    component.form.patchValue({ kind: 'RETIFICADORA', originalDeclarationId: '' });
    await component.generate();

    expect(component.selected?.status).toBe('TRANSMITTED');
    expect(component.isBusy('generate')).toBe(false);
    expect(component.money('10.5')).toContain('10');
    expect(component.form.controls.originalDeclarationId.touched).toBe(true);
  });

  it('handles fiscal component service failures', async () => {
    const component = createWithProviders(FiscalDctfweb, [
      FormBuilder,
      {
        provide: DctfwebApiService,
        useValue: {
          list: vi.fn(() => throwError(() => new Error('list failed'))),
          generate: vi.fn(() => throwError(() => 'raw')),
        },
      },
    ]);

    await component.load();
    await component.generate();

    expect(component.errorMessage).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  it('routes DIRF service and component behavior', async () => {
    api.get.mockReturnValue(of([dirfArquivo('dirf-1')]));
    api.post.mockReturnValue(of(dirfArquivo('dirf-2')));
    const service = new DirfApiService(api as unknown as ApiClient);

    await firstValueFrom(service.list(2024));
    await firstValueFrom(service.generate({ yearBase: 2024, kind: 'ORIGINAL' }));

    const component = createWithProviders(FiscalDirf, [
      FormBuilder,
      {
        provide: DirfApiService,
        useValue: {
          list: vi.fn(() => of([dirfArquivo('dirf-1')])),
          generate: vi.fn(() => of(dirfArquivo('dirf-2'))),
        },
      },
    ]);
    component.form.patchValue({ yearBase: 2024 });
    await component.load();
    await component.generate();
    component.select(component.arquivos[0]);

    component.form.patchValue({ yearBase: 2026, kind: 'RETIFICADORA', originalArquivoId: '' });
    await component.generate();
    component.form.patchValue({ yearBase: 2024, kind: 'RETIFICADORA', originalArquivoId: '' });
    await component.generate();

    expect(component.selected?.id).toBe('dirf-2');
    expect(component.downloadUrl(component.arquivos[0])).toBe(
      '/api/v1/admin/fiscal/dirf/dirf-2/txt',
    );
    expect(component.canGenerateDirf(2026)).toBe(false);
    expect(api.post).toHaveBeenCalledWith('v1/admin/fiscal/dirf/gerar', {
      yearBase: 2024,
      kind: 'ORIGINAL',
    });
  });

  it('routes GPS service and component behavior', async () => {
    api.get.mockReturnValue(of([gpsRemittance('gps-1')]));
    api.post.mockReturnValue(of(gpsRemittance('gps-2')));
    const service = new GpsResidualApiService(api as unknown as ApiClient);

    await firstValueFrom(service.paymentCodes());
    await firstValueFrom(service.list('', ''));
    await firstValueFrom(
      service.generate({
        competence: '2018-06-01',
        paymentCodeId: 'code-1',
        reason: 'RETROACTIVE',
        reasonDetail: 'late charge',
      }),
    );

    const component = createWithProviders(FiscalGpsResidual, [
      FormBuilder,
      {
        provide: GpsResidualApiService,
        useValue: {
          paymentCodes: vi.fn(() =>
            of([
              {
                id: 'code-1',
                code: '2402',
                description: 'GPS',
                appliesTo: 'RPPS',
                active: true,
                validFrom: '2018-01-01',
                validTo: null,
              },
            ]),
          ),
          list: vi.fn(() => of([gpsRemittance('gps-1')])),
          generate: vi.fn(() => of(gpsRemittance('gps-2'))),
        },
      },
    ]);
    await component.loadPaymentCodes();
    await component.load();
    component.form.controls.reasonDetail.setValue('retroactive contribution');
    await component.generate();
    component.select(component.remittances[0]);

    expect(component.form.controls.paymentCodeId.value).toBe('code-1');
    expect(component.selected?.id).toBe('gps-2');
    expect(component.downloadUrl(component.remittances[0])).toBe(
      '/api/v1/admin/fiscal/gps/gps-2/txt',
    );
  });

  it('handles DIRF and GPS failure branches', async () => {
    const dirf = createWithProviders(FiscalDirf, [
      FormBuilder,
      {
        provide: DirfApiService,
        useValue: {
          list: vi.fn(() => throwError(() => 'raw')),
          generate: vi.fn(() => throwError(() => new Error('dirf failed'))),
        },
      },
    ]);
    await dirf.load();
    dirf.form.patchValue({ yearBase: 2024 });
    await dirf.generate();

    const gps = createWithProviders(FiscalGpsResidual, [
      FormBuilder,
      {
        provide: GpsResidualApiService,
        useValue: {
          paymentCodes: vi.fn(() => throwError(() => new Error('codes failed'))),
          list: vi.fn(() => throwError(() => 'raw')),
          generate: vi.fn(() => throwError(() => new Error('gps failed'))),
        },
      },
    ]);
    await gps.loadPaymentCodes();
    await gps.load();
    gps.form.controls.reasonDetail.setValue('retroactive contribution');
    await gps.generate();

    expect(dirf.errorMessage).toBeTruthy();
    expect(gps.errorMessage).toBeTruthy();
    expect(gps.busy).toBe(false);
  });
});

function createWithProviders<T>(type: new () => T, providers: unknown[]): T {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers });
  return TestBed.runInInjectionContext(() => new type());
}

function dctfwebDeclaration(id: string, status = 'DRAFT') {
  return {
    id,
    competence: '2026-05',
    kind: 'ORIGINAL',
    status,
    originalDeclarationId: null,
    payloadXmlRef: 'payload.xml',
    payloadXmlHash: 'payload-hash',
    signedXmlRef: null,
    signedXmlHash: null,
    transmittedXmlHash: null,
    receiptNumber: null,
    receiptAt: null,
    itemCount: 1,
    totalBaseAmount: '10.00',
    totalAmount: '10.00',
    createdAt: '2026-05-08T00:00:00Z',
    updatedAt: '2026-05-08T00:00:00Z',
  };
}

function dirfArquivo(id: string) {
  return {
    id,
    yearBase: 2024,
    kind: 'ORIGINAL',
    status: 'GENERATED',
    originalArquivoId: null,
    txtRef: 'dirf.txt',
    txtHash: 'hash',
    layoutVersion: '2024',
    generatedAt: '2026-05-08T00:00:00Z',
    beneficiaryCount: 1,
    paymentCount: 1,
    totalAmount: '10.00',
    totalIrrf: '1.00',
  };
}

function gpsRemittance(id: string) {
  return {
    id,
    competence: '2018-06-01',
    paymentCodeId: 'code-1',
    paymentCode: '2402',
    paymentCodeDescription: 'GPS',
    reason: 'RETROACTIVE' as const,
    reasonDetail: 'late charge',
    baseAmount: '10.00',
    amount: '10.00',
    interestAmount: '1.00',
    fineAmount: '1.00',
    totalAmount: '12.00',
    status: 'GENERATED' as const,
    fileUri: null,
    txtHash: 'hash',
    generatedAt: '2026-05-08T00:00:00Z',
    paidAt: null,
  };
}
