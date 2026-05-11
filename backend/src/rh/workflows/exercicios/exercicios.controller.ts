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
  resourceType: 'employee_exercise',
  tableName: 'employee_exercise',
})
@Controller('v1/employees/:employeeId/rh-workflows')
export class ExercisesWorkflowController extends EmployeeWorkflowControllerBase {
  protected readonly workflow = 'exercises';
  protected readonly tableName = 'employee_exercise';

  constructor(
    workflowsService: RhWorkflowsService,
    auditService: AuditService,
  ) {
    super(workflowsService, auditService);
  }

  @ApiOperation({ summary: 'GET exercicios' })
  @Get('exercicios')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List exercise assignments for an employee.' })
  listExercises(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(this.workflow, query, employeeId);
  }

  @ApiOperation({ summary: 'POST exercicios' })
  @Post('exercicios')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Create an exercise assignment.' })
  createExercise(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(request, employeeId, body);
  }

  @ApiOperation({ summary: 'PATCH exercicios/:id' })
  @Patch('exercicios/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update an exercise assignment.' })
  updateExercise(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE exercicios/:id' })
  @Delete('exercicios/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate an exercise assignment.' })
  deleteExercise(@Req() request: RequestWithContext, @Param('id') id: string) {
    return this.deleteEmployeeWorkflow(request, id);
  }
}
