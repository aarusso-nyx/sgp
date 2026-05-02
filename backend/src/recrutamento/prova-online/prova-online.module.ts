import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { BiometriaModule } from '../biometria/biometria.module';
import { AiFlagsService } from './ai-flags.service';
import { OnlineExamController } from './online-exam.controller';
import { OnlineExamService } from './online-exam.service';
import { ProctoringIngestService } from './proctoring-ingest.service';
import { OnlineExamReviewService } from './review.service';

@Module({
  imports: [DatabaseModule, BiometriaModule],
  controllers: [OnlineExamController],
  providers: [
    OnlineExamService,
    ProctoringIngestService,
    AiFlagsService,
    OnlineExamReviewService,
  ],
  exports: [
    OnlineExamService,
    ProctoringIngestService,
    AiFlagsService,
    OnlineExamReviewService,
  ],
})
export class ProvaOnlineModule {}
