import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-sc', state_code: 'SC', organ_kind: 'TCE' })
export class TceScAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-sc',
      stateCode: 'SC',
      organKind: 'TCE',
      organName: 'TCE-SC',
    });
  }
}
