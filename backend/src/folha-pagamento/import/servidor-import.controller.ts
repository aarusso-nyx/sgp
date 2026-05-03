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
import { ServidorImportService } from './servidor-import.service';
import type { UploadedXlsxFile } from './servidor-import.service';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@Controller('v1/folhas')
export class ServidorImportController {
  constructor(
    private readonly servidorImportService: ServidorImportService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'POST :folha_id/importar/servidor' })
  @Post(':folha_id/importar/servidor')
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
          description: 'XLSX file with servidor payroll items.',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Imports servidor payroll items from XLSX.' })
  async importServidor(
    @Req() request: RequestWithContext,
    @Param('folha_id') payrollRunId: string,
    @UploadedFile() file: UploadedXlsxFile,
  ) {
    const result = await this.servidorImportService.importFile(
      payrollRunId,
      file,
    );

    await this.auditService.auditMutation(
      request,
      'IMPORT',
      'payroll.servidor_import',
      {
        resourceId: payrollRunId,
        tableName: 'payroll.employee_payroll_item',
        metadata: {
          event: 'folha.servidor_import.completed',
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
            event: 'folha.servidor_import.row_accepted',
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
