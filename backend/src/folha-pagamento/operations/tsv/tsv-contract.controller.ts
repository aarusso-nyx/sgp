import { Body, Controller, Param, Patch } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { UpdateTsvContractDto } from './tsv-contract.dto';
import { TsvContractService } from './tsv-contract.service';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1/admin/hr/tsv-contracts')
export class TsvContractController {
  constructor(private readonly service: TsvContractService) {}

  @ApiOperation({ summary: 'PATCH :id' })
  @Patch(':id')
  @RequirePermission('hr.employment.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.tsv_contract',
    tableName: 'hr.tsv_contract_change',
  })
  @ApiOkResponse({
    description: 'Update a TS-V contract and record real diffs.',
  })
  update(@Param('id') id: string, @Body() body: UpdateTsvContractDto) {
    return this.service.update(id, body);
  }
}
