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
  resourceType: 'employee_transit_benefit',
  tableName: 'employee_transit_benefit',
})
@Controller('v1/employees/:employeeId/rh-workflows')
export class TransitBenefitsWorkflowController extends EmployeeWorkflowControllerBase {
  protected readonly workflow = 'transit-benefits';
  protected readonly tableName = 'employee_transit_benefit';

  constructor(
    workflowsService: RhWorkflowsService,
    auditService: AuditService,
  ) {
    super(workflowsService, auditService);
  }

  @ApiOperation({ summary: 'GET vales-transporte' })
  @Get('vales-transporte')
  @RequirePermission('rh.read')
  @ApiOkResponse({
    description: 'List transit benefit grants for an employee.',
  })
  listTransitBenefits(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(this.workflow, query, employeeId);
  }

  @ApiOperation({ summary: 'POST vales-transporte' })
  @Post('vales-transporte')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Create a transit benefit grant.' })
  createTransitBenefit(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(request, employeeId, body);
  }

  @ApiOperation({ summary: 'PATCH vales-transporte/:id' })
  @Patch('vales-transporte/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update a transit benefit grant.' })
  updateTransitBenefit(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE vales-transporte/:id' })
  @Delete('vales-transporte/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate a transit benefit grant.' })
  deleteTransitBenefit(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteEmployeeWorkflow(request, id);
  }
}
