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
  resourceType: 'employee_union_contribution',
  tableName: 'employee_union_contribution',
})
@Controller('v1/employees/:employeeId/rh-workflows')
export class UnionContributionsWorkflowController extends EmployeeWorkflowControllerBase {
  protected readonly workflow = 'union-contributions';
  protected readonly tableName = 'employee_union_contribution';

  constructor(
    workflowsService: RhWorkflowsService,
    auditService: AuditService,
  ) {
    super(workflowsService, auditService);
  }

  @ApiOperation({ summary: 'GET contribuicoes-sindicais' })
  @Get('contribuicoes-sindicais')
  @RequirePermission('rh.read')
  @ApiOkResponse({
    description: 'List union contribution records for an employee.',
  })
  listUnionContributions(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(this.workflow, query, employeeId);
  }

  @ApiOperation({ summary: 'POST contribuicoes-sindicais' })
  @Post('contribuicoes-sindicais')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Create a union contribution record.' })
  createUnionContribution(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(request, employeeId, body);
  }

  @ApiOperation({ summary: 'PATCH contribuicoes-sindicais/:id' })
  @Patch('contribuicoes-sindicais/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update a union contribution record.' })
  updateUnionContribution(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE contribuicoes-sindicais/:id' })
  @Delete('contribuicoes-sindicais/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate a union contribution record.' })
  deleteUnionContribution(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteEmployeeWorkflow(request, id);
  }
}
