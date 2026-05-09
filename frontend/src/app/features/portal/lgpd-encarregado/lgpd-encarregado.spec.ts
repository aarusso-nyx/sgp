import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../core/api/api-client';
import { LgpdEncarregado } from './lgpd-encarregado';

describe('LgpdEncarregado', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('loads public DPO contact information', async () => {
    const component = createComponent(dpoResponse(null), transferResponse([]));

    await component.load();

    expect(component.info?.contact.email).toBe('dpo@example.test');
    expect(component.loading).toBe(false);
  });

  it('starts loading DPO contact information from ngOnInit', async () => {
    const component = createComponent(dpoResponse('2026-05-08T00:00:00Z'), transferResponse([]));

    component.ngOnInit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.info?.updatedAt).toBe('2026-05-08T00:00:00Z');
  });

  it('loads active international transfer summaries', async () => {
    const component = createComponent(
      dpoResponse(null),
      transferResponse([
        {
          flowKey: 'payroll.payslip_pdf',
          processorName: 'EU Cloud Processor',
          destinationCountry: 'EU',
          destinationCountryName: 'European Union',
          mechanism: 'ADEQUACY_DECISION',
          mechanismReference: 'Resolução CD/ANPD 32/2026',
          adequacyDecisionRef: 'Resolução CD/ANPD 32/2026',
          startsAt: '2026-05-08',
          reviewDueAt: '2027-05-08',
        },
      ]),
    );

    await component.load();

    expect(component.transfers[0]?.processorName).toBe('EU Cloud Processor');
  });

  it('sets an error message when DPO contact loading fails', async () => {
    const component = createComponent(
      throwError(() => new Error('offline')),
      transferResponse([]),
    );

    await component.load();

    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
  });
});

function createComponent(dpoResult: unknown, transfersResult: unknown): LgpdEncarregado {
  const get = vi.fn((path: string) =>
    path.includes('transferencias-internacionais') ? transfersResult : dpoResult,
  );
  TestBed.configureTestingModule({
    providers: [{ provide: ApiClient, useValue: { get } }],
  });
  return TestBed.runInInjectionContext(() => new LgpdEncarregado());
}

function dpoResponse(updatedAt: string | null) {
  return of({
    name: 'DPO',
    contact: {
      email: 'dpo@example.test',
      phone: '5555-0000',
      channelUrl: 'https://example.test/lgpd',
      officeHours: '09:00-18:00',
      postalAddress: 'Rua Um',
    },
    updatedAt,
  });
}

function transferResponse(items: unknown[]) {
  return of({ items });
}
