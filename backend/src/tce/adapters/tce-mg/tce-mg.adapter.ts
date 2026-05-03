import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-mg', state_code: 'MG', organ_kind: 'TCE' })
export class TceMgAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-mg',
      stateCode: 'MG',
      organKind: 'TCE',
      organName: 'TCE-MG',
    });
  }
}
