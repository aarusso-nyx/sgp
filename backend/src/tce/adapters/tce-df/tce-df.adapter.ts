import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-df', state_code: 'DF', organ_kind: 'TCE' })
export class TceDfAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-df',
      stateCode: 'DF',
      organKind: 'TCE',
      organName: 'TCDF',
    });
  }
}
