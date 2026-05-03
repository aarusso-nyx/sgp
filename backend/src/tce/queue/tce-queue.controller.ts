import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { TceCircuitBreakerService } from './circuit-breaker.service';
import { TceWorkerService } from './tce-worker.service';

@ApiTags('tce-queue')
@Controller('v1/tce')
export class TceQueueController {
  constructor(
    private readonly workerService: TceWorkerService,
    private readonly circuitBreaker: TceCircuitBreakerService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET queue' })
  @Get('queue')
  @RequirePermission('tce.submission.read')
  list(
    @Query('adapter') adapter?: string,
    @Query('state_code') stateCode?: string,
    @Query('status') status?: string,
    @Query('competence') competence?: string,
  ) {
    return this.workerService.listJobs({
      adapter,
      stateCode,
      status,
      competence,
    });
  }

  @ApiOperation({ summary: 'GET queue/:id' })
  @Get('queue/:id')
  @RequirePermission('tce.submission.read')
  get(@Param('id') id: string) {
    return this.workerService.getJob(id);
  }

  @ApiOperation({ summary: 'POST queue/:id/replay' })
  @Post('queue/:id/replay')
  @RequirePermission('tce.submission.manage')
  async replay(@Param('id') id: string, @Req() request: RequestWithContext) {
    const job = await this.workerService.replay(id);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'tce.submission_queue',
      {
        tableName: 'tce.submission_queue',
        resourceId: job.id,
        metadata: { event: 'tce.queue.replay' },
      },
    );
    return job;
  }

  @ApiOperation({ summary: 'GET circuits' })
  @Get('circuits')
  @RequirePermission('tce.submission.read')
  circuits() {
    return this.circuitBreaker.list();
  }

  @ApiOperation({ summary: 'POST circuits/:adapter_id/:endpoint/reset' })
  @Post('circuits/:adapter_id/:endpoint/reset')
  @RequirePermission('tce.submission.manage')
  async resetCircuit(
    @Param('adapter_id') adapterId: string,
    @Param('endpoint') endpoint: string,
    @Req() request: RequestWithContext,
  ) {
    const circuit = await this.circuitBreaker.reset(
      adapterId,
      decodeURIComponent(endpoint),
    );
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'tce.adapter_circuit_state',
      {
        tableName: 'tce.adapter_circuit_state',
        resourceId: `${adapterId}:${circuit.endpointUrl}`,
        metadata: { event: 'tce.circuit.reset' },
      },
    );
    return circuit;
  }
}
