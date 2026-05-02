import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { AiFlagsService } from './ai-flags.service';
import {
  AnalyzeAudioDto,
  AnalyzeFrameDto,
  CreateProctoringEventDto,
  IngestProctoringArtifactDto,
  ReviewOnlineExamDto,
  StartOnlineExamDto,
  SubmitOnlineExamDto,
} from './online-exam.dto';
import { OnlineExamService } from './online-exam.service';
import { ProctoringIngestService } from './proctoring-ingest.service';
import { OnlineExamReviewService } from './review.service';

@ApiTags('recrutamento-prova-online')
@ApiBearerAuth()
@Controller('v1/recrutamento/prova-online')
export class OnlineExamController {
  constructor(
    private readonly onlineExamService: OnlineExamService,
    private readonly ingestService: ProctoringIngestService,
    private readonly aiFlagsService: AiFlagsService,
    private readonly reviewService: OnlineExamReviewService,
  ) {}

  @Post('sessions')
  @RequirePermission('recrutamento.exam.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.online_exam_session',
    tableName: 'recrutamento.online_exam_session',
  })
  @ApiCreatedResponse({ description: 'Start a proctored online exam session.' })
  start(@Body() body: StartOnlineExamDto) {
    return this.onlineExamService.start(body);
  }

  @Post('sessions/:id/events')
  @RequirePermission('recrutamento.exam.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.proctoring_event',
    tableName: 'recrutamento.proctoring_event',
  })
  @ApiCreatedResponse({ description: 'Record a proctoring event.' })
  recordEvent(@Param('id') id: string, @Body() body: CreateProctoringEventDto) {
    return this.onlineExamService.recordEvent(id, body);
  }

  @Post('sessions/:id/artifacts')
  @RequirePermission('recrutamento.exam.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.proctoring_artifact',
    tableName: 'recrutamento.proctoring_artifact',
  })
  @ApiCreatedResponse({
    description: 'Persist a proctoring artifact reference.',
  })
  ingestArtifact(
    @Param('id') id: string,
    @Body() body: IngestProctoringArtifactDto,
  ) {
    return this.ingestService.ingest(id, body);
  }

  @Delete('sessions/:id/artifacts')
  @RequirePermission('recrutamento.exam.write')
  @AuditMutation({
    action: 'DELETE',
    resourceType: 'recrutamento.proctoring_artifact',
    tableName: 'recrutamento.proctoring_artifact',
  })
  @ApiOkResponse({
    description: 'Process a candidate LGPD artifact exclusion request.',
  })
  requestArtifactExclusion(@Param('id') id: string) {
    return this.ingestService.requestExclusion(id);
  }

  @Post('sessions/:id/ai/audio')
  @RequirePermission('recrutamento.exam.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.proctoring_event',
    tableName: 'recrutamento.proctoring_event',
  })
  @ApiCreatedResponse({
    description: 'Analyze a local transcript for voice mismatch.',
  })
  analyzeAudio(@Param('id') id: string, @Body() body: AnalyzeAudioDto) {
    return this.aiFlagsService.analyzeAudio({ ...body, sessionId: id });
  }

  @Post('sessions/:id/ai/frame')
  @RequirePermission('recrutamento.exam.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.proctoring_event',
    tableName: 'recrutamento.proctoring_event',
  })
  @ApiCreatedResponse({
    description: 'Analyze a local frame for proctoring flags.',
  })
  analyzeFrame(@Param('id') id: string, @Body() body: AnalyzeFrameDto) {
    return this.aiFlagsService.analyzeFrame({ ...body, sessionId: id });
  }

  @Post('sessions/:id/submit')
  @RequirePermission('recrutamento.exam.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'recrutamento.online_exam_session',
    tableName: 'recrutamento.online_exam_session',
  })
  @ApiOkResponse({ description: 'Submit an online exam session.' })
  submit(@Param('id') id: string, @Body() body: SubmitOnlineExamDto) {
    return this.onlineExamService.submit(id, body);
  }

  @Get('review/sessions/:id')
  @RequirePermission('recrutamento.exam.review')
  @ApiOkResponse({ description: 'Read proctoring event timeline for review.' })
  timeline(@Param('id') id: string) {
    return this.reviewService.timeline(id);
  }

  @Post('review/sessions/:id/accept')
  @RequirePermission('recrutamento.exam.review')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'recrutamento.proctoring_event',
    tableName: 'recrutamento.proctoring_event',
  })
  @ApiOkResponse({ description: 'Accept pending proctoring flags.' })
  accept(@Param('id') id: string) {
    return this.reviewService.accept(id);
  }

  @Post('review/sessions/:id/void')
  @RequirePermission('recrutamento.exam.review')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'recrutamento.online_exam_session',
    tableName: 'recrutamento.online_exam_session',
    reasonRequired: true,
  })
  @ApiOkResponse({
    description: 'Void a suspicious session and atomically reschedule it.',
  })
  voidAndReschedule(
    @Param('id') id: string,
    @Body() body: ReviewOnlineExamDto,
  ) {
    return this.reviewService.voidAndReschedule(id, body.reason);
  }
}
