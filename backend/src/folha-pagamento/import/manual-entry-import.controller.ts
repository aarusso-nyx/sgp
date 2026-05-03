import {
  Controller,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { ManualEntryImportService } from './manual-entry-import.service';
import type { UploadedManualEntryXlsxFile } from './manual-entry-import.service';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@Controller('v1/folhas')
export class ManualEntryImportController {
  constructor(
    private readonly manualEntryImportService: ManualEntryImportService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'POST :folha_id/importar/lancamento-manual' })
  @Post(':folha_id/importar/lancamento-manual')
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
          description: 'XLSX file with manual payroll entries.',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Imports manual payroll entries from XLSX.' })
  async importManualEntries(
    @Req() request: RequestWithContext,
    @Param('folha_id') payrollRunId: string,
    @UploadedFile() file: UploadedManualEntryXlsxFile,
  ) {
    const result = await this.manualEntryImportService.importFile(
      payrollRunId,
      file,
    );

    await this.auditService.auditMutation(
      request,
      'IMPORT',
      'payroll.manual_entry_import',
      {
        resourceId: payrollRunId,
        tableName: 'payroll.employee_payroll_item',
        metadata: {
          event: 'folha.manual_entry_import.completed',
          folhaPagamentoId: result.folhaPagamentoId,
          payrollRunId,
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
            event: 'folha.manual_entry_import.row_accepted',
            folhaPagamentoId: result.folhaPagamentoId,
            payrollRunId,
            rowNumber: accepted.rowNumber,
            employeeId: accepted.employeeId,
            employeeRegistration: accepted.employeeRegistration,
            earningDeductionId: accepted.earningDeductionId,
            earningDeductionCode: accepted.earningDeductionCode,
            amount: accepted.amount,
            idempotencyKey: accepted.idempotencyKey,
            operation: accepted.operation,
          },
        },
      );
    }

    return result;
  }
}
