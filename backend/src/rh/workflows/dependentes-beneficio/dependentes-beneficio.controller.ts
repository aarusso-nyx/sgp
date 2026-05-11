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
  resourceType: 'employee_benefit_dependent',
  tableName: 'employee_benefit_dependent',
})
@Controller('v1/employees/:employeeId/rh-workflows')
export class BenefitDependentsWorkflowController extends EmployeeWorkflowControllerBase {
  protected readonly workflow = 'benefit-dependents';
  protected readonly tableName = 'employee_benefit_dependent';

  constructor(
    workflowsService: RhWorkflowsService,
    auditService: AuditService,
  ) {
    super(workflowsService, auditService);
  }

  @ApiOperation({ summary: 'GET dependentes-beneficio' })
  @Get('dependentes-beneficio')
  @RequirePermission('rh.read')
  @ApiOkResponse({
    description: 'List benefit-dependent records for an employee.',
  })
  listBenefitDependents(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(this.workflow, query, employeeId);
  }

  @ApiOperation({ summary: 'POST dependentes-beneficio' })
  @Post('dependentes-beneficio')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Create a benefit-dependent record.' })
  createBenefitDependent(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(request, employeeId, body);
  }

  @ApiOperation({ summary: 'PATCH dependentes-beneficio/:id' })
  @Patch('dependentes-beneficio/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update a benefit-dependent record.' })
  updateBenefitDependent(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE dependentes-beneficio/:id' })
  @Delete('dependentes-beneficio/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate a benefit-dependent record.' })
  deleteBenefitDependent(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteEmployeeWorkflow(request, id);
  }
}
