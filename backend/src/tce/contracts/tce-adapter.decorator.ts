import { SetMetadata } from '@nestjs/common';

import { TceOrganKind } from './tce-adapter.interface';

export const TCE_ADAPTER_METADATA = 'sgp:tce-adapter';

export interface TceAdapterMetadata {
  id: string;
  state_code: string;
  organ_kind: TceOrganKind;
}

export const TceAdapter = (metadata: TceAdapterMetadata) =>
  SetMetadata(TCE_ADAPTER_METADATA, metadata);
