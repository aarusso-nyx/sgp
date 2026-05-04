import { ConflictException, Injectable } from '@nestjs/common';

export type AccumulationRoleKind =
  | 'TEACHER'
  | 'TECHNICAL_SCIENTIFIC'
  | 'HEALTH_PROFESSIONAL'
  | 'COMMISSIONED'
  | 'OTHER';

export interface AccumulationAssignment {
  assignmentId: string;
  roleKind: AccumulationRoleKind;
  scheduleCompatible: boolean;
}

interface IncompatibleAccumulationPair {
  firstAssignmentId: string;
  firstRoleKind: AccumulationRoleKind;
  secondAssignmentId: string;
  secondRoleKind: AccumulationRoleKind;
  reason: 'ROLE_MATRIX' | 'SCHEDULE';
}

interface IllegalAccumulationResponse {
  code: 'CF37_XVI_ACCUMULATION_NOT_ALLOWED';
  message: string;
  employeeId: string;
  pairs: IncompatibleAccumulationPair[];
}

export class IllegalAccumulationError extends ConflictException {
  constructor(employeeId: string, pairs: IncompatibleAccumulationPair[]) {
    super({
      code: 'CF37_XVI_ACCUMULATION_NOT_ALLOWED',
      message:
        'Employee assignments violate CF art. 37 XVI accumulation compatibility rules.',
      employeeId,
      pairs,
    } satisfies IllegalAccumulationResponse);
  }
}

@Injectable()
export class AccumulationService {
  validateAssignments(
    employeeId: string,
    assignments: AccumulationAssignment[],
  ): void {
    const incompatiblePairs: IncompatibleAccumulationPair[] = [];

    for (let firstIndex = 0; firstIndex < assignments.length; firstIndex += 1) {
      const first = assignments[firstIndex];
      if (!first) continue;
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < assignments.length;
        secondIndex += 1
      ) {
        const second = assignments[secondIndex];
        if (!second) continue;
        const reason = this.incompatibilityReason(first, second);
        if (!reason) continue;

        incompatiblePairs.push({
          firstAssignmentId: first.assignmentId,
          firstRoleKind: first.roleKind,
          secondAssignmentId: second.assignmentId,
          secondRoleKind: second.roleKind,
          reason,
        });
      }
    }

    if (incompatiblePairs.length > 0) {
      throw new IllegalAccumulationError(employeeId, incompatiblePairs);
    }
  }

  isCompatiblePair(
    first: AccumulationAssignment,
    second: AccumulationAssignment,
  ): boolean {
    return !this.incompatibilityReason(first, second);
  }

  private incompatibilityReason(
    first: AccumulationAssignment,
    second: AccumulationAssignment,
  ): IncompatibleAccumulationPair['reason'] | null {
    if (!first.scheduleCompatible || !second.scheduleCompatible) {
      return 'SCHEDULE';
    }

    return isAllowedRolePair(first.roleKind, second.roleKind)
      ? null
      : 'ROLE_MATRIX';
  }
}

function isAllowedRolePair(
  first: AccumulationRoleKind,
  second: AccumulationRoleKind,
): boolean {
  const pair = [first, second].sort().join(':');
  return ALLOWED_ROLE_PAIRS.has(pair);
}

const ALLOWED_ROLE_PAIRS = new Set<string>([
  ['TEACHER', 'TEACHER'].sort().join(':'),
  ['TEACHER', 'TECHNICAL_SCIENTIFIC'].sort().join(':'),
  ['HEALTH_PROFESSIONAL', 'HEALTH_PROFESSIONAL'].sort().join(':'),
]);
