import { PATH_METADATA } from '@nestjs/common/constants';

import { IS_PUBLIC_ROUTE } from '../iam/decorators/require-permission.decorator';
import { LgpdDpoController } from './lgpd-dpo.controller';

describe('LgpdDpoController', () => {
  it('exposes the public encarregado route contract', () => {
    const controllerPath = Reflect.getMetadata(
      PATH_METADATA,
      LgpdDpoController,
    );
    const handler = Object.getOwnPropertyDescriptor(
      LgpdDpoController.prototype,
      'encarregado',
    )?.value as object;
    const handlerPath = Reflect.getMetadata(PATH_METADATA, handler);
    const isPublic = Reflect.getMetadata(IS_PUBLIC_ROUTE, handler);

    expect(controllerPath).toBe('v1/public/lgpd');
    expect(handlerPath).toBe('encarregado');
    expect(isPublic).toBe(true);
  });

  it('delegates x-tenant-id to the service', async () => {
    const service = {
      getPublicContact: jest.fn().mockResolvedValue({ name: 'DPO' }),
    };
    const controller = new LgpdDpoController(service as never);

    await expect(controller.encarregado('tenant-1')).resolves.toEqual({
      name: 'DPO',
    });
    expect(service.getPublicContact).toHaveBeenCalledWith('tenant-1');
  });
});
