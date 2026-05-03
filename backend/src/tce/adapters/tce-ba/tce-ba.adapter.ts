import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import { StatePayrollSourcePendingAdapter } from '../state-payroll/state-payroll-adapter.base';

@Injectable()
@TceAdapterMetadata({ id: 'tce-ba', state_code: 'BA', organ_kind: 'TCE' })
export class TceBaAdapter extends StatePayrollSourcePendingAdapter {
  constructor() {
    super({
      id: 'tce-ba',
      stateCode: 'BA',
      organKind: 'TCE',
      organName: 'TCE-BA',
    });
  }
}
