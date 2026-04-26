import { ValidationPipe } from '@nestjs/common';

import { UpsertGlobalParameterDto } from './system-parameters.dto';

describe('UpsertGlobalParameterDto', () => {
  const metadata = {
    type: 'body' as const,
    metatype: UpsertGlobalParameterDto,
  };

  it('accepts value as the canonical global parameter payload field', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform({ value: '1518.00' }, metadata),
    ).resolves.toEqual({
      value: '1518.00',
    });
  });

  it('rejects valor as a compatibility-only alias', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform({ valor: '1518.00' }, metadata),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.arrayContaining(['property valor should not exist']),
      }),
    });
  });
});
