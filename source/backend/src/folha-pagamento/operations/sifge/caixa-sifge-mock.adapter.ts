import { Injectable } from '@nestjs/common';

import { CaixaSifgeV4Adapter } from './caixa-sifge-v4.adapter';

@Injectable()
export class CaixaSifgeMockAdapter extends CaixaSifgeV4Adapter {
  override readonly adapterKey = 'caixa-sifge-mock';
  override readonly layoutVersion = 'SIFGE-MOCK-4.0';
  override readonly requiresSignature = false;
}
