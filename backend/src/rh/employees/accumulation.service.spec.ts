import {
  AccumulationService,
  IllegalAccumulationError,
} from './accumulation.service';

describe('AccumulationService', () => {
  let service: AccumulationService;

  beforeEach(() => {
    service = new AccumulationService();
  });

  it('accepts professor plus technical-scientific accumulation with compatible schedules', () => {
    expect(() =>
      service.validateAssignments('employee-1', [
        {
          assignmentId: 'assignment-teacher',
          roleKind: 'TEACHER',
          scheduleCompatible: true,
        },
        {
          assignmentId: 'assignment-technical',
          roleKind: 'TECHNICAL_SCIENTIFIC',
          scheduleCompatible: true,
        },
      ]),
    ).not.toThrow();
  });

  it('rejects two commissioned positions as illegal accumulation', () => {
    expect(() =>
      service.validateAssignments('employee-1', [
        {
          assignmentId: 'assignment-commissioned-a',
          roleKind: 'COMMISSIONED',
          scheduleCompatible: true,
        },
        {
          assignmentId: 'assignment-commissioned-b',
          roleKind: 'COMMISSIONED',
          scheduleCompatible: true,
        },
      ]),
    ).toThrow(IllegalAccumulationError);
  });

  it('rejects otherwise legal role pairs when schedules are incompatible', () => {
    expect(() =>
      service.validateAssignments('employee-1', [
        {
          assignmentId: 'assignment-health-a',
          roleKind: 'HEALTH_PROFESSIONAL',
          scheduleCompatible: true,
        },
        {
          assignmentId: 'assignment-health-b',
          roleKind: 'HEALTH_PROFESSIONAL',
          scheduleCompatible: false,
        },
      ]),
    ).toThrow(IllegalAccumulationError);
  });
});
