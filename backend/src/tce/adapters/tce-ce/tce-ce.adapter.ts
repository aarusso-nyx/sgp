import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-ce', state_code: 'CE', organ_kind: 'TCE' })
export class TceCeAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-ce',
      stateCode: 'CE',
      organKind: 'TCE',
      organName: 'TCE-CE',
    });
  }
}
