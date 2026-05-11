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
@AuditMutation({
  resourceType: 'employee_alimony',
  tableName: 'employee_alimony',
})
@Controller('v1/employees/:employeeId/rh-workflows')
export class AlimoniesWorkflowController extends EmployeeWorkflowControllerBase {
  protected readonly workflow = 'alimonies';
  protected readonly tableName = 'employee_alimony';

  constructor(
    workflowsService: RhWorkflowsService,
    auditService: AuditService,
  ) {
    super(workflowsService, auditService);
  }

  @ApiOperation({ summary: 'GET pensoes-alimenticias' })
  @Get('pensoes-alimenticias')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List alimony records for an employee.' })
  listAlimonies(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(this.workflow, query, employeeId);
  }

  @ApiOperation({ summary: 'POST pensoes-alimenticias' })
  @Post('pensoes-alimenticias')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Create an alimony record.' })
  createAlimony(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(request, employeeId, body);
  }

  @ApiOperation({ summary: 'PATCH pensoes-alimenticias/:id' })
  @Patch('pensoes-alimenticias/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update an alimony record.' })
  updateAlimony(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE pensoes-alimenticias/:id' })
  @Delete('pensoes-alimenticias/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate an alimony record.' })
  deleteAlimony(@Req() request: RequestWithContext, @Param('id') id: string) {
    return this.deleteEmployeeWorkflow(request, id);
  }
}
