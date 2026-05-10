import { BusinessDaysService } from '../../consultas/business-days.service';
import { DatabaseService } from '../../database/database.service';
import { RhWorkflowMutationDto } from './rh-workflows.dto';

export interface WorkflowMutationContext {
  databaseService: DatabaseService;
  businessDaysService?: BusinessDaysService | undefined;
  require(value: unknown, field: string): void;
  resolveWorkedDays(input: RhWorkflowMutationDto): Promise<string>;
  findEmployeeIdByRecord(table: string, id: string): Promise<string>;
  syncEmployeeUnion(
    employeeId: string | undefined,
    unionId: string | null,
  ): Promise<void>;
  syncEmployeeExercise(
    employeeId: string | undefined,
    branchId: string | null,
    workLocationId: string | null,
    jobFunctionId: string | null,
  ): Promise<void>;
  ensureFunctionalStatus(
    code: string,
    description: string,
    modality: string,
    kind: string,
    lifecycleStatus: string,
  ): Promise<string>;
}
