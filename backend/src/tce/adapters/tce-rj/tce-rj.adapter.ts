import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-rj', state_code: 'RJ', organ_kind: 'TCE' })
export class TceRjAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-rj',
      stateCode: 'RJ',
      organKind: 'TCE',
      organName: 'TCE-RJ',
    });
  }
}
