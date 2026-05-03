import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { AsoAttachmentService } from './aso-attachment.service';
import {
  AttachAsoDto,
  CreateMedicalExamDto,
  PerformAsoDto,
  ScheduleAsoDto,
} from './aso.dto';
import { AsoService } from './aso.service';

@ApiTags('saude-aso')
@ApiBearerAuth()
@Controller('v1/saude')
export class AsoController {
  constructor(
    private readonly asoService: AsoService,
    private readonly attachmentService: AsoAttachmentService,
  ) {}

  @ApiOperation({ summary: 'GET exames' })
  @Get('exames')
  @RequirePermission('saude.aso.read')
  @ApiOkResponse({ description: 'Occupational medical exam catalog.' })
  listMedicalExams() {
    return this.asoService.listMedicalExams();
  }

  @ApiOperation({ summary: 'POST exames' })
  @Post('exames')
  @RequirePermission('saude.aso.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.medical_exam',
    tableName: 'saude.medical_exam',
  })
  @ApiCreatedResponse({ description: 'Create an occupational medical exam.' })
  createMedicalExam(@Body() body: CreateMedicalExamDto) {
    return this.asoService.createMedicalExam(body);
  }

  @ApiOperation({ summary: 'GET aso' })
  @Get('aso')
  @RequirePermission('saude.aso.read')
  @ApiOkResponse({ description: 'ASO records.' })
  listAsoRecords() {
    return this.asoService.listAsoRecords();
  }

  @ApiOperation({ summary: 'GET aso/painel/vencimentos' })
  @Get('aso/painel/vencimentos')
  @RequirePermission('saude.aso.read')
  @ApiOkResponse({ description: 'Periodic ASO due in up to 30 days.' })
  listDueSoon() {
    return this.asoService.listDueSoon();
  }

  @ApiOperation({ summary: 'POST aso' })
  @Post('aso')
  @RequirePermission('saude.aso.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.aso_record',
    tableName: 'saude.aso_record',
  })
  @ApiCreatedResponse({ description: 'Schedule an ASO record.' })
  schedule(@Body() body: ScheduleAsoDto) {
    return this.asoService.schedule(body);
  }

  @ApiOperation({ summary: 'PATCH aso/:id/realizacao' })
  @Patch('aso/:id/realizacao')
  @RequirePermission('saude.aso.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.aso_record',
    tableName: 'saude.aso_record',
  })
  @ApiOkResponse({ description: 'Register ASO performance and conclusion.' })
  perform(@Param('id') id: string, @Body() body: PerformAsoDto) {
    return this.asoService.perform(id, body);
  }

  @ApiOperation({ summary: 'POST aso/:id/anexos' })
  @Post('aso/:id/anexos')
  @RequirePermission('saude.aso.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.aso_attachment',
    tableName: 'saude.aso_attachment',
  })
  @ApiCreatedResponse({ description: 'Attach encrypted PDF report metadata.' })
  attach(@Param('id') id: string, @Body() body: AttachAsoDto) {
    return this.attachmentService.attach(id, body);
  }

  @ApiOperation({ summary: 'PATCH aso/:id/arquivar' })
  @Patch('aso/:id/arquivar')
  @RequirePermission('saude.aso.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.aso_record',
    tableName: 'saude.aso_record',
  })
  @ApiOkResponse({ description: 'Archive a performed ASO record.' })
  archive(@Param('id') id: string) {
    return this.asoService.archive(id);
  }
}
