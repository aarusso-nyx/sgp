import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-pr', state_code: 'PR', organ_kind: 'TCE' })
export class TcePrAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-pr',
      stateCode: 'PR',
      organKind: 'TCE',
      organName: 'TCE-PR',
    });
  }
}
