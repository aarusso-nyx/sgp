import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuditModule } from './audit/audit.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AvaliacaoModule } from './avaliacao/avaliacao.module';
import { AuthModule } from './auth/auth.module';
import { createAppCoreProviders } from './common/bootstrap/app-providers';
import { createLoggingModule } from './common/logging/logging.config';
import { RequestIdMiddleware } from './common/request-id/request-id.middleware';
import { createRateLimitOptions } from './common/rate-limit/rate-limit.config';
import { validateEnvironment } from './config/environment';
import { ConvenioModule } from './convenio/convenio.module';
import { ConsultasModule } from './consultas/consultas.module';
import { DatabaseModule } from './database/database.module';
import { DetModule } from './det';
import { DocumentsModule } from './documents/documents.module';
import { ExternalModule } from './external/external.module';
import { FolhaPagamentoModule } from './folha-pagamento/folha-pagamento.module';
import { GestaoModule } from './gestao/gestao.module';
import { HealthModule } from './health/health.module';
import { IamModule } from './iam/iam.module';
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
import { SgpStynxRuntimeModule } from './stynx/stynx-runtime.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    SgpStynxRuntimeModule.forRoot({ serviceName: 'sgp-core-api' }),
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
    DetModule,
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
  providers: [AppService, ...createAppCoreProviders()],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
