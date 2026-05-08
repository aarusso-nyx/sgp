import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../core/api/api-client';
import { LgpdEncarregado } from './lgpd-encarregado';

describe('LgpdEncarregado', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('loads public DPO contact information', async () => {
    const component = createComponent(
      of({
        name: 'DPO',
        contact: {
          email: 'dpo@example.test',
          phone: '5555-0000',
          channelUrl: 'https://example.test/lgpd',
          officeHours: '09:00-18:00',
          postalAddress: 'Rua Um',
        },
        updatedAt: null,
      }),
    );

    await component.load();

    expect(component.info?.contact.email).toBe('dpo@example.test');
    expect(component.loading).toBe(false);
  });

  it('starts loading DPO contact information from ngOnInit', async () => {
    const result = of({
      name: 'DPO',
      contact: {
        email: 'dpo@example.test',
        phone: '5555-0000',
        channelUrl: 'https://example.test/lgpd',
        officeHours: '09:00-18:00',
        postalAddress: 'Rua Um',
      },
      updatedAt: '2026-05-08T00:00:00Z',
    });
    const component = createComponent(result);

    component.ngOnInit();
    await Promise.resolve();

    expect(component.info?.updatedAt).toBe('2026-05-08T00:00:00Z');
  });

  it('sets an error message when DPO contact loading fails', async () => {
    const component = createComponent(throwError(() => new Error('offline')));

    await component.load();

    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
  });
});

function createComponent(result: unknown): LgpdEncarregado {
  TestBed.configureTestingModule({
    providers: [{ provide: ApiClient, useValue: { get: vi.fn(() => result) } }],
  });
  return TestBed.runInInjectionContext(() => new LgpdEncarregado());
}
