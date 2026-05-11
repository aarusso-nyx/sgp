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
export class RhWorkflowProcessFunctionsController extends EmployeeWorkflowControllerBase {
  protected readonly workflow = 'process-functions';
  protected readonly tableName = 'administrative_process_function';

  constructor(
    workflowsService: RhWorkflowsService,
    auditService: AuditService,
  ) {
    super(workflowsService, auditService);
  }

  @ApiOperation({ summary: 'GET processos-funcao' })
  @Get('processos-funcao')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List process to function assignments.' })
  listProcessFunctions(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow(this.workflow, query);
  }

  @ApiOperation({ summary: 'POST processos-funcao' })
  @Post('processos-funcao')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({
    description: 'Create a process to function assignment.',
  })
  async createProcessFunction(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createWorkflow(request, body);
  }

  @ApiOperation({ summary: 'PATCH processos-funcao/:id' })
  @Patch('processos-funcao/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update a process to function assignment.' })
  async updateProcessFunction(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE processos-funcao/:id' })
  @Delete('processos-funcao/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({
    description: 'Deactivate a process to function assignment.',
  })
  async deleteProcessFunction(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteWorkflow(request, id);
  }
}
