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
export class RhWorkflowProfessionalExperiencesController extends EmployeeWorkflowControllerBase {
  protected readonly workflow = 'professional-experiences';
  protected readonly tableName = 'professional_experience';

  constructor(
    workflowsService: RhWorkflowsService,
    auditService: AuditService,
  ) {
    super(workflowsService, auditService);
  }

  @ApiOperation({ summary: 'GET professional-experiences' })
  @Get('professional-experiences')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List prior professional experience records.' })
  listProfessionalExperiences(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow(this.workflow, query);
  }

  @ApiOperation({ summary: 'POST professional-experiences' })
  @Post('professional-experiences')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({
    description: 'Create a prior professional experience record.',
  })
  async createProfessionalExperience(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createWorkflow(request, body);
  }

  @ApiOperation({ summary: 'PATCH professional-experiences/:id' })
  @Patch('professional-experiences/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({
    description: 'Update a prior professional experience record.',
  })
  async updateProfessionalExperience(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE professional-experiences/:id' })
  @Delete('professional-experiences/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({
    description: 'Deactivate a prior professional experience record.',
  })
  async deleteProfessionalExperience(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteWorkflow(request, id);
  }
}
