import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { PublicTransparencyController } from './public-transparency.controller';
import { PublicTransparencyService } from './public-transparency.service';
import { TransparencyAccessLogMiddleware } from './transparency/transparency-access-log.middleware';
import { TransparencyController } from './transparency/transparency.controller';
import { TransparencyCsvService } from './transparency/transparency-csv.service';
import { TransparencyPublishService } from './transparency/transparency-publish.service';
import { TransparencyQueryService } from './transparency/transparency-query.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicTransparencyController, TransparencyController],
  providers: [
    PublicTransparencyService,
    TransparencyQueryService,
    TransparencyCsvService,
    TransparencyPublishService,
    TransparencyAccessLogMiddleware,
  ],
})
export class PublicoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TransparencyAccessLogMiddleware)
      .forRoutes('v1/public/transparency/:tenantId/*');
  }
}
