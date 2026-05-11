import { AuditService } from '../../audit/audit.service';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RhWorkflowMutationDto } from './rh-workflows.dto';
import { RhWorkflowsService } from './rh-workflows.service';

export abstract class EmployeeWorkflowControllerBase {
  protected abstract readonly workflow: string;
  protected abstract readonly tableName: string;

  protected constructor(
    protected readonly workflowsService: RhWorkflowsService,
    protected readonly auditService: AuditService,
  ) {}

  protected async createEmployeeWorkflow(
    request: RequestWithContext,
    employeeId: string,
    body: RhWorkflowMutationDto,
  ) {
    return this.createWorkflow(request, body, employeeId);
  }

  protected async createWorkflow(
    request: RequestWithContext,
    body: RhWorkflowMutationDto,
    employeeId = body.employeeId,
  ) {
    const created = await this.workflowsService.createWorkflowRecord(
      this.workflow,
      body,
      employeeId,
    );
    await this.auditMutation(request, 'CREATE', String(created.id));
    return created;
  }

  protected async updateEmployeeWorkflow(
    request: RequestWithContext,
    id: string,
    body: RhWorkflowMutationDto,
  ) {
    return this.updateWorkflow(request, id, body);
  }

  protected async updateWorkflow(
    request: RequestWithContext,
    id: string,
    body: RhWorkflowMutationDto,
  ) {
    const updated = await this.workflowsService.updateWorkflowRecord(
      this.workflow,
      id,
      body,
    );
    await this.auditMutation(request, 'UPDATE', String(updated.id));
    return updated;
  }

  protected async deleteEmployeeWorkflow(
    request: RequestWithContext,
    id: string,
  ) {
    return this.deleteWorkflow(request, id);
  }

  protected async deleteWorkflow(request: RequestWithContext, id: string) {
    const deleted = await this.workflowsService.deleteWorkflowRecord(
      this.workflow,
      id,
    );
    await this.auditMutation(request, 'DELETE', id);
    return deleted;
  }

  protected auditMutation(
    request: RequestWithContext,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceId: string,
  ) {
    return this.auditService.auditMutation(request, action, this.tableName, {
      resourceId,
      tableName: this.tableName,
    });
  }
}
