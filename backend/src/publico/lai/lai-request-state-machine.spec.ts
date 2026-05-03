import { BadRequestException } from '@nestjs/common';

import { LaiRequestStateMachine } from './lai-request-state-machine';

describe('LaiRequestStateMachine', () => {
  it('allows the canonical LAI request lifecycle', () => {
    expect(LaiRequestStateMachine.nextStatuses('RECEIVED')).toContain(
      'IN_REVIEW',
    );
    expect(() =>
      LaiRequestStateMachine.assertTransition('RECEIVED', 'IN_REVIEW'),
    ).not.toThrow();
    expect(() =>
      LaiRequestStateMachine.assertTransition('IN_REVIEW', 'EXTENDED'),
    ).not.toThrow();
    expect(() =>
      LaiRequestStateMachine.assertTransition('EXTENDED', 'ANSWERED'),
    ).not.toThrow();
    expect(() =>
      LaiRequestStateMachine.assertTransition('ANSWERED', 'CLOSED'),
    ).not.toThrow();
  });

  it('rejects terminal or backwards transitions', () => {
    expect(() =>
      LaiRequestStateMachine.assertTransition('CLOSED', 'IN_REVIEW'),
    ).toThrow(BadRequestException);
    expect(() =>
      LaiRequestStateMachine.assertTransition('ANSWERED', 'EXTENDED'),
    ).toThrow(BadRequestException);
  });
});
