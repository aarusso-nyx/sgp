import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-rs', state_code: 'RS', organ_kind: 'TCE' })
export class TceRsAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-rs',
      stateCode: 'RS',
      organKind: 'TCE',
      organName: 'TCE-RS',
    });
  }
}
