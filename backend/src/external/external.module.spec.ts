import { MODULE_METADATA } from '@nestjs/common/constants';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { REQUIRED_PERMISSIONS } from '../iam/decorators/require-permission.decorator';
import { ExternalController } from './external.controller';
import { ExternalModule } from './external.module';
import { ExternalService } from './external.service';
import { IcpSignerService } from './signature/icp-signer.service';
import { PadesAdapter } from './signature/pades.adapter';
import { TenantFiscalCertificateService } from './signature/tenant-fiscal-certificate.service';

function metadataTarget(method: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    ExternalController.prototype,
    method,
  );
  if (!descriptor?.value) {
    throw new Error(`Missing ExternalController.${method}`);
  }
  return descriptor.value as (...args: unknown[]) => unknown;
}

describe('ExternalModule', () => {
  it('wires the external M2M API controller and signature providers', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ExternalModule),
    ).toEqual([AuthModule, DatabaseModule]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ExternalModule),
    ).toEqual([ExternalController]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ExternalModule),
    ).toEqual([
      ExternalService,
      IcpSignerService,
      PadesAdapter,
      TenantFiscalCertificateService,
    ]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, ExternalModule),
    ).toEqual([
      IcpSignerService,
      PadesAdapter,
      TenantFiscalCertificateService,
    ]);
  });

  it('keeps external M2M endpoints behind auth.read', () => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS, metadataTarget('dados')),
    ).toEqual(['auth.read']);
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS, metadataTarget('entidades')),
    ).toEqual(['auth.read']);
  });

  it('returns deterministic external API probe shapes', () => {
    const controller = new ExternalController(new ExternalService());

    expect(controller.dados()).toEqual(
      expect.objectContaining({
        service: 'sgp-external-api',
        status: 'ok',
      }),
    );
    expect(controller.entidades()).toEqual({
      entities: [
        'employees',
        'payroll-runs',
        'agreements',
        'reports',
        'audit-events',
      ],
    });
  });
});
