import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-go', state_code: 'GO', organ_kind: 'TCE' })
export class TceGoAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-go',
      stateCode: 'GO',
      organKind: 'TCE',
      organName: 'TCE-GO',
    });
  }
}
