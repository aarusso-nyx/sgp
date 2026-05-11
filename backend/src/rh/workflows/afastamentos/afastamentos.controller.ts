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
export class RhWorkflowLeavesController extends EmployeeWorkflowControllerBase {
  protected readonly workflow = 'leaves';
  protected readonly tableName = 'leave_record';

  constructor(
    workflowsService: RhWorkflowsService,
    auditService: AuditService,
  ) {
    super(workflowsService, auditService);
  }

  @ApiOperation({ summary: 'GET afastamentos' })
  @Get('afastamentos')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List employee leave and absence records.' })
  listLeaves(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow(this.workflow, query);
  }

  @ApiOperation({ summary: 'POST afastamentos' })
  @Post('afastamentos')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Register an employee leave entry.' })
  async createLeave(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createWorkflow(request, body);
  }

  @ApiOperation({ summary: 'PATCH afastamentos/:id' })
  @Patch('afastamentos/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update an employee leave record.' })
  async updateLeave(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE afastamentos/:id' })
  @Delete('afastamentos/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate an employee leave record.' })
  async deleteLeave(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteWorkflow(request, id);
  }
}
