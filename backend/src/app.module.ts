import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuditModule } from './audit/audit.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AvaliacaoModule } from './avaliacao/avaliacao.module';
import { AuthModule } from './auth/auth.module';
import { StandardExceptionFilter } from './common/errors/standard-exception.filter';
import { AuditRequiredInterceptor } from './common/audit/audit-required.interceptor';
import { createLoggingModule } from './common/logging/logging.config';
import { RequestIdMiddleware } from './common/request-id/request-id.middleware';
import { createRateLimitOptions } from './common/rate-limit/rate-limit.config';
import { validateEnvironment } from './config/environment';
import { ConvenioModule } from './convenio/convenio.module';
import { ConsultasModule } from './consultas/consultas.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { ExternalModule } from './external/external.module';
import { FolhaPagamentoModule } from './folha-pagamento/folha-pagamento.module';
import { GestaoModule } from './gestao/gestao.module';
import { HealthModule } from './health/health.module';
import { IamModule } from './iam/iam.module';
import { PermissionGuard } from './iam/guards/permission.guard';
import { StynxEsocialModule } from './integrations/stynx-esocial';
import { IntegrationsWorkerModule } from './integrations-worker/integrations-worker.module';
import { LgpdAdminModule } from './lgpd/lgpd-admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PortalModule } from './portal/portal.module';
import { PontoModule } from './ponto/ponto.module';
import { PrevidenciarioModule } from './previdenciario/previdenciario.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PublicoModule } from './publico/publico.module';
import { RecruitmentModule } from './recrutamento/recruitment.module';
import { RelatorioModule } from './relatorio/relatorio.module';
import { ReportsModule } from './reports/reports.module';
import { RhModule } from './rh/rh.module';
import { SaudeModule } from './saude/saude.module';
import { SystemParametersModule } from './system-parameters/system-parameters.module';
import { TceModule } from './tce/tce.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    createLoggingModule('sgp-core-api'),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      useFactory: createRateLimitOptions,
    }),
    AuthModule,
    IamModule,
    AuditModule,
    UsersModule,
    ProfilesModule,
    SystemParametersModule,
    NotificationsModule,
    DocumentsModule,
    PortalModule,
    PontoModule,
    ExternalModule,
    StynxEsocialModule,
    IntegrationsWorkerModule,
    LgpdAdminModule,
    PublicoModule,
    ReportsModule,
    GestaoModule,
    RhModule,
    AvaliacaoModule,
    ConsultasModule,
    PrevidenciarioModule,
    SaudeModule,
    FolhaPagamentoModule,
    ConvenioModule,
    RecruitmentModule,
    RelatorioModule,
    AuditoriaModule,
    TceModule.register(),
    DatabaseModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
    },
    {
      provide: APP_FILTER,
      useClass: StandardExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditRequiredInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
