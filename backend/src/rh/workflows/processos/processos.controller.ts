import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  AuditMutation,
  AuditService,
  Body,
  Controller,
  Delete,
  DomainListQueryDto,
  EmployeeWorkflowControllerBase,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  RequirePermission,
  RhWorkflowMutationDto,
  RhWorkflowsService,
  type RequestWithContext,
} from '../workflow-controller-deps';

@ApiTags('rh')
@ApiBearerAuth()
@AuditMutation({ resourceType: 'rh_workflow' })
@Controller('v1/rh')
export class RhWorkflowProcessesController extends EmployeeWorkflowControllerBase {
  protected readonly workflow = 'processes';
  protected readonly tableName = 'administrative_process';

  constructor(
    workflowsService: RhWorkflowsService,
    auditService: AuditService,
  ) {
    super(workflowsService, auditService);
  }

  @ApiOperation({ summary: 'GET processos' })
  @Get('processos')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List administrative processes.' })
  listProcesses(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow(this.workflow, query);
  }

  @ApiOperation({ summary: 'POST processos' })
  @Post('processos')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Create an administrative process.' })
  async createProcess(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createWorkflow(request, body);
  }

  @ApiOperation({ summary: 'PATCH processos/:id' })
  @Patch('processos/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update an administrative process.' })
  async updateProcess(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE processos/:id' })
  @Delete('processos/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate an administrative process.' })
  async deleteProcess(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteWorkflow(request, id);
  }
}
