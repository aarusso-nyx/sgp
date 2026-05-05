import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import type { EsocialClass } from './contracts';
import {
  StynxEsocialClient,
  type StynxEsocialEnqueueResult,
} from './stynx-esocial.client';

class StynxEsocialActionDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  competence?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

@ApiTags('stynx-esocial')
@ApiBearerAuth()
@Controller('v1/esocial')
export class StynxEsocialGatewayController {
  constructor(private readonly client: StynxEsocialClient) {}

  @ApiOperation({ summary: 'GET tabelas-iniciais' })
  @Get('tabelas-iniciais')
  @RequirePermission('esocial.event.read')
  @ApiOkResponse({ description: 'List Stynx eSocial table spool entries.' })
  listTabelas() {
    return this.list('tabelas');
  }

  @ApiOperation({ summary: 'POST tabelas-iniciais/emitir' })
  @Post('tabelas-iniciais/emitir')
  @RequirePermission('esocial.event.write')
  @ApiOkResponse({ description: 'Queue all Stynx eSocial table events.' })
  async emitTabelas(@Body() body: StynxEsocialActionDto) {
    const eventKinds = [
      'S-1000',
      'S-1005',
      'S-1010',
      'S-1020',
      'S-1030',
      'S-1040',
      'S-1050',
      'S-1060',
      'S-1070',
    ];
    return Promise.all(
      eventKinds.map((eventClass) =>
        this.enqueue('tabelas', eventClass, { action: 'emit', body }),
      ),
    );
  }

  @ApiOperation({ summary: 'POST tabelas-iniciais/:eventKind/emitir' })
  @Post('tabelas-iniciais/:eventKind/emitir')
  @RequirePermission('esocial.event.write')
  @ApiOkResponse({ description: 'Queue one Stynx eSocial table event.' })
  emitTabela(
    @Param('eventKind') eventKind: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('tabelas', eventKind, { action: 'emit', body });
  }

  @ApiOperation({ summary: 'GET trabalhadores' })
  @Get('trabalhadores')
  @RequirePermission('esocial.event.read')
  @ApiOkResponse({ description: 'List Stynx eSocial worker spool entries.' })
  listTrabalhadores() {
    return this.list('trabalhador');
  }

  @ApiOperation({ summary: 'POST trabalhadores/:employeeId/s2200/emitir' })
  @Post('trabalhadores/:employeeId/s2200/emitir')
  @RequirePermission('esocial.event.write')
  emitS2200(
    @Param('employeeId') employeeId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('trabalhador', 'S-2200', {
      action: 'emit',
      employeeId,
      body,
    });
  }

  @ApiOperation({ summary: 'POST trabalhadores/:employeeId/s2205/emitir' })
  @Post('trabalhadores/:employeeId/s2205/emitir')
  @RequirePermission('esocial.event.write')
  emitS2205(
    @Param('employeeId') employeeId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('trabalhador', 'S-2205', {
      action: 'emit',
      employeeId,
      body,
    });
  }

  @ApiOperation({ summary: 'GET eventos-trabalhador' })
  @Get('eventos-trabalhador')
  @RequirePermission('esocial.event.read')
  listEventosTrabalhador() {
    return this.list('trabalhador');
  }

  @ApiOperation({
    summary: 'POST eventos-trabalhador/s2210/:catEmissionId/emitir',
  })
  @Post('eventos-trabalhador/s2210/:catEmissionId/emitir')
  @RequirePermission('esocial.event.write')
  emitS2210(
    @Param('catEmissionId') catEmissionId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('trabalhador', 'S-2210', {
      action: 'emit',
      catEmissionId,
      body,
    });
  }

  @ApiOperation({
    summary: 'POST eventos-trabalhador/s2220/:asoRecordId/retry',
  })
  @Post('eventos-trabalhador/s2220/:asoRecordId/retry')
  @RequirePermission('esocial.event.write')
  retryS2220(
    @Param('asoRecordId') asoRecordId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('trabalhador', 'S-2220', {
      action: 'retry',
      asoRecordId,
      body,
    });
  }

  @ApiOperation({
    summary: 'POST eventos-trabalhador/s2240/:environmentalExposureId/emitir',
  })
  @Post('eventos-trabalhador/s2240/:environmentalExposureId/emitir')
  @RequirePermission('esocial.event.write')
  emitS2240(
    @Param('environmentalExposureId') environmentalExposureId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('trabalhador', 'S-2240', {
      action: 'emit',
      environmentalExposureId,
      body,
    });
  }

  @ApiOperation({
    summary: 'POST eventos-trabalhador/s2230/:pendingId/emitir',
  })
  @Post('eventos-trabalhador/s2230/:pendingId/emitir')
  @RequirePermission('esocial.event.write')
  emitS2230(
    @Param('pendingId') pendingId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('trabalhador', 'S-2230', {
      action: 'emit',
      pendingId,
      body,
    });
  }

  @ApiOperation({
    summary: 'POST eventos-trabalhador/s2299/:pendingId/emitir',
  })
  @Post('eventos-trabalhador/s2299/:pendingId/emitir')
  @RequirePermission('esocial.event.write')
  emitS2299(
    @Param('pendingId') pendingId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('trabalhador', 'S-2299', {
      action: 'emit',
      pendingId,
      body,
    });
  }

  @ApiOperation({ summary: 'GET folha-periodica' })
  @Get('folha-periodica')
  @RequirePermission('esocial.event.read')
  listFolha(@Query('year') year?: string, @Query('month') month?: string) {
    void year;
    void month;
    return this.list('folha');
  }

  @ApiOperation({
    summary: 'POST folha-periodica/runs/:payrollRunId/s1200/emitir',
  })
  @Post('folha-periodica/runs/:payrollRunId/s1200/emitir')
  @RequirePermission('esocial.event.write')
  emitS1200(
    @Param('payrollRunId') payrollRunId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('folha', 'S-1200', {
      action: 'emit',
      payrollRunId,
      body,
    });
  }

  @ApiOperation({
    summary: 'POST folha-periodica/runs/:payrollRunId/s1202/emitir',
  })
  @Post('folha-periodica/runs/:payrollRunId/s1202/emitir')
  @RequirePermission('esocial.event.write')
  emitS1202(
    @Param('payrollRunId') payrollRunId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('folha', 'S-1202', {
      action: 'emit',
      payrollRunId,
      body,
    });
  }

  @ApiOperation({
    summary: 'POST folha-periodica/payments/:paymentBatchId/s1210/emitir',
  })
  @Post('folha-periodica/payments/:paymentBatchId/s1210/emitir')
  @RequirePermission('esocial.event.write')
  emitS1210(
    @Param('paymentBatchId') paymentBatchId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('folha', 'S-1210', {
      action: 'emit',
      paymentBatchId,
      body,
    });
  }

  @ApiOperation({ summary: 'GET fechamento' })
  @Get('fechamento')
  @RequirePermission('esocial.event.read')
  listFechamento(@Query('year') year?: string, @Query('month') month?: string) {
    void year;
    void month;
    return this.list('fechamento');
  }

  @ApiOperation({ summary: 'POST fechamento/fechar' })
  @Post('fechamento/fechar')
  @RequirePermission('esocial.event.write')
  fechar(@Body() body: StynxEsocialActionDto) {
    return this.enqueue('fechamento', 'S-1299', { action: 'close', body });
  }

  @ApiOperation({ summary: 'POST fechamento/totalizadores' })
  @Post('fechamento/totalizadores')
  @RequirePermission('esocial.event.write')
  totalizadores(@Body() body: StynxEsocialActionDto) {
    return this.enqueue('fechamento', 'S-5001', { action: 'totalize', body });
  }

  @ApiOperation({ summary: 'POST fechamento/reabrir' })
  @Post('fechamento/reabrir')
  @RequirePermission('esocial.event.write')
  reabrir(@Body() body: StynxEsocialActionDto) {
    return this.enqueue('fechamento', 'S-1298', { action: 'reopen', body });
  }

  @ApiOperation({ summary: 'GET submissoes' })
  @Get('submissoes')
  @RequirePermission('esocial.submission.read')
  listSubmissoes() {
    return this.list('submit');
  }

  @ApiOperation({ summary: 'GET submissoes/circuitos' })
  @Get('submissoes/circuitos')
  @RequirePermission('esocial.submission.read')
  listCircuitos() {
    return [];
  }

  @ApiOperation({ summary: 'POST submissoes/:batchId/retry' })
  @Post('submissoes/:batchId/retry')
  @RequirePermission('esocial.submission.retry')
  retryBatch(@Param('batchId') batchId: string) {
    return this.enqueue('submit', 'BATCH', { action: 'retry', batchId });
  }

  @ApiOperation({ summary: 'GET retornos/falhas' })
  @Get('retornos/falhas')
  @RequirePermission('esocial.event.read')
  listRetornoFalhas() {
    return this.list('retorno');
  }

  @ApiOperation({ summary: 'GET retornos/eventos/:eventId' })
  @Get('retornos/eventos/:eventId')
  @RequirePermission('esocial.event.read')
  retornoEvento(@Param('eventId') eventId: string) {
    return this.enqueue('retorno', 'RETURN', { action: 'inspect', eventId });
  }

  @ApiOperation({ summary: 'POST retornos/eventos/:eventId/retry' })
  @Post('retornos/eventos/:eventId/retry')
  @RequirePermission('esocial.event.write')
  retryRetorno(@Param('eventId') eventId: string) {
    return this.enqueue('retorno', 'RETURN', { action: 'retry', eventId });
  }

  @ApiOperation({ summary: 'POST retornos/eventos/:eventId/tratado' })
  @Post('retornos/eventos/:eventId/tratado')
  @RequirePermission('esocial.event.write')
  marcarRetornoTratado(@Param('eventId') eventId: string) {
    return this.enqueue('retorno', 'RETURN', {
      action: 'mark-handled',
      eventId,
    });
  }

  @ApiOperation({ summary: 'GET events/excludable' })
  @Get('events/excludable')
  @RequirePermission('esocial.event.read')
  listExcludable() {
    return this.list('exclusao');
  }

  @ApiOperation({ summary: 'GET exclusions' })
  @Get('exclusions')
  @RequirePermission('esocial.event.read')
  listExclusions() {
    return this.list('exclusao');
  }

  @ApiOperation({ summary: 'POST events/:eventId/exclude' })
  @Post('events/:eventId/exclude')
  @RequirePermission('esocial.event.write')
  excludeEvent(
    @Param('eventId') eventId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('exclusao', 'S-3000', {
      action: 'exclude',
      eventId,
      body,
    });
  }

  @ApiOperation({ summary: 'POST exclusions/:requestId/accept' })
  @Post('exclusions/:requestId/accept')
  @RequirePermission('esocial.event.write')
  acceptExclusion(@Param('requestId') requestId: string) {
    return this.enqueue('exclusao', 'S-3000', {
      action: 'accept',
      requestId,
    });
  }

  @ApiOperation({ summary: 'GET certificados' })
  @Get('certificados')
  @RequirePermission('esocial.certificate.read')
  listCertificates() {
    return this.list('certificado');
  }

  @ApiOperation({ summary: 'POST certificados' })
  @Post('certificados')
  @RequirePermission('esocial.certificate.write')
  @ApiCreatedResponse({
    description: 'Queue a Stynx eSocial certificate upload.',
  })
  uploadCertificate(@Body() body: StynxEsocialActionDto) {
    return this.enqueue('certificado', 'CERTIFICATE', {
      action: 'upload',
      body,
    });
  }

  @ApiOperation({ summary: 'PUT certificados/:certificateId/rotacao' })
  @Put('certificados/:certificateId/rotacao')
  @RequirePermission('esocial.certificate.write')
  rotateCertificate(
    @Param('certificateId') certificateId: string,
    @Body() body: StynxEsocialActionDto,
  ) {
    return this.enqueue('certificado', 'CERTIFICATE', {
      action: 'rotate',
      certificateId,
      body,
    });
  }

  @ApiOperation({ summary: 'DELETE certificados/:certificateId' })
  @Delete('certificados/:certificateId')
  @RequirePermission('esocial.certificate.write')
  revokeCertificate(@Param('certificateId') certificateId: string) {
    return this.enqueue('certificado', 'CERTIFICATE', {
      action: 'revoke',
      certificateId,
    });
  }

  private async list(kind: EsocialClass) {
    const rows = await this.client.listCurrentTenant({ kind, limit: 100 });
    return rows.map((row) => ({
      messageId: row.messageId,
      kind: row.kind,
      eventClass: row.eventClass,
      sourceRef: row.sourceRef,
      status: row.status,
      attempt: row.attempt,
      createdAt: row.createdAt,
      sentAt: row.sentAt,
      receivedAt: row.receivedAt,
      error: row.error,
    }));
  }

  private enqueue(
    kind: EsocialClass,
    eventClass: string,
    payload: Record<string, unknown>,
  ): Promise<StynxEsocialEnqueueResult> {
    return this.client.enqueue({
      kind,
      eventClass,
      sourceRef: payload,
      payload,
    });
  }
}

@ApiTags('stynx-esocial-admin')
@ApiBearerAuth()
@Controller('v1/admin/esocial')
export class StynxEsocialAdminGatewayController {
  constructor(private readonly client: StynxEsocialClient) {}

  @ApiOperation({ summary: 'POST admin/esocial/s2298/:orderId' })
  @Post('s2298/:orderId')
  @RequirePermission('esocial.event.write')
  emitS2298(@Param('orderId') orderId: string) {
    return this.client.enqueue({
      kind: 'trabalhador',
      eventClass: 'S-2298',
      sourceRef: { action: 'emit', orderId },
      payload: { action: 'emit', orderId },
    });
  }

  @ApiOperation({ summary: 'POST admin/esocial/s2306/:changeId' })
  @Post('s2306/:changeId')
  @RequirePermission('esocial.event.write')
  emitS2306(@Param('changeId') changeId: string) {
    return this.client.enqueue({
      kind: 'trabalhador',
      eventClass: 'S-2306',
      sourceRef: { action: 'emit', changeId },
      payload: { action: 'emit', changeId },
    });
  }
}
