import {
  Controller,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import type { UploadedXlsxFile } from './servidor-import.service';
import { PensionistaImportService } from './pensionista-import.service';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@Controller('v1/folhas')
export class PensionistaImportController {
  constructor(
    private readonly pensionistaImportService: PensionistaImportService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'POST :folha_id/importar/pensionista' })
  @Post(':folha_id/importar/pensionista')
  @RequirePermission('folha.write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'XLSX file with pensionista payroll items.',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Imports pensionista payroll items from XLSX.',
  })
  async importPensionista(
    @Req() request: RequestWithContext,
    @Param('folha_id') payrollRunId: string,
    @UploadedFile() file: UploadedXlsxFile,
  ) {
    const result = await this.pensionistaImportService.importFile(
      payrollRunId,
      file,
    );

    await this.auditService.auditMutation(
      request,
      'IMPORT',
      'payroll.pensionista_import',
      {
        resourceId: payrollRunId,
        tableName: 'payroll.employee_payroll_item',
        metadata: {
          event: 'folha.pensionista_import.completed',
          fileName: result.fileName,
          fileHash: result.fileHash,
          acceptedRows: result.acceptedRows,
          rejectedRows: result.rejectedRows,
        },
      },
    );

    for (const accepted of result.accepted) {
      await this.auditService.auditMutation(
        request,
        'IMPORT',
        'payroll.employee_payroll_item',
        {
          resourceId: accepted.payrollItemId,
          tableName: 'payroll.employee_payroll_item',
          metadata: {
            event: 'folha.pensionista_import.row_accepted',
            payrollRunId,
            rowNumber: accepted.rowNumber,
            pensionId: accepted.pensionId,
            pensionBeneficiaryId: accepted.pensionBeneficiaryId,
            pensionistaEmployeeId: accepted.pensionistaEmployeeId,
            pensionistaRegistration: accepted.pensionistaRegistration,
            earningDeductionId: accepted.earningDeductionId,
            earningDeductionCode: accepted.earningDeductionCode,
            amount: accepted.amount,
            payrollItemIdempotencyKey: accepted.payrollItemIdempotencyKey,
            pensionIdempotencyKey: accepted.pensionIdempotencyKey,
            operation: accepted.operation,
          },
        },
      );
    }

    return result;
  }
}
