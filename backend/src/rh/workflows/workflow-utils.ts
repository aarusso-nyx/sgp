import { RhWorkflowMutationDto } from './rh-workflows.dto';
import { WorkflowDefinition } from './workflow-types';

export function workflow(input: WorkflowDefinition): WorkflowDefinition {
  return input;
}

export function clean(value: string | undefined): string | null {
  return value?.trim() || null;
}

export function stringMeta(
  input: RhWorkflowMutationDto,
  key: string,
): string | null {
  const value = input.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function daysBetweenInclusive(startsOn: string, endsOn: string): number {
  const start = new Date(startsOn);
  const end = new Date(endsOn);
  const diff = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

export function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
