import { Injectable } from '@nestjs/common';

import type { FaceFrameDto } from './face.dto';

export interface LivenessDecision {
  passed: boolean;
  blinkDetected: boolean;
  headTurnDetected: boolean;
}

@Injectable()
export class FaceLivenessService {
  verify(frames: FaceFrameDto[]): LivenessDecision {
    const blinkDetected = frames.some((frame) => frame.blinkDetected === true);
    const yaws = frames
      .map((frame) => frame.yawDegrees)
      .filter((value): value is number => typeof value === 'number');
    const headTurnDetected =
      yaws.length >= 2 && Math.max(...yaws) - Math.min(...yaws) >= 12;
    return {
      passed: blinkDetected && headTurnDetected,
      blinkDetected,
      headTurnDetected,
    };
  }
}
