import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-pe', state_code: 'PE', organ_kind: 'TCE' })
export class TcePeAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-pe',
      stateCode: 'PE',
      organKind: 'TCE',
      organName: 'TCE-PE',
    });
  }
}
