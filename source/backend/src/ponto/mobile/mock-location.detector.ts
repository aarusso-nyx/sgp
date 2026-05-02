import { Injectable } from '@nestjs/common';

import type { MobileClockInDto, MobileClockInResult } from './mobile-clock.dto';

export interface MockLocationDecision {
  blocked: boolean;
  result?: MobileClockInResult;
}

@Injectable()
export class MockLocationDetector {
  detect(input: MobileClockInDto): MockLocationDecision {
    if (input.mockLocation) {
      return { blocked: true, result: 'MOCK_DETECTED' };
    }
    return { blocked: false };
  }
}
