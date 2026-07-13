import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { STYNX_AUDIT_SINK, StynxAuditModule } from '@stynx-nyx/backend';

import { AuditWriterService } from '../audit/audit-writer.service';
import { DatabaseModule } from '../database/database.module';

const PLACEHOLDER_AUDIT_SINK = {
  write: () => Promise.resolve(),
};

@Module({})
export class SgpStynxAuditModule {
  static forRoot(): DynamicModule {
    const stynxModule = StynxAuditModule.forRoot({
      sink: PLACEHOLDER_AUDIT_SINK,
    });

    return {
      ...stynxModule,
      imports: [...(stynxModule.imports ?? []), DatabaseModule],
      providers: [
        AuditWriterService,
        ...(stynxModule.providers ?? []).map(rebindAuditSink),
      ],
      exports: [AuditWriterService, ...(stynxModule.exports ?? [])],
    };
  }
}

function rebindAuditSink(provider: Provider): Provider {
  if (
    provider &&
    typeof provider === 'object' &&
    'provide' in provider &&
    provider.provide === STYNX_AUDIT_SINK
  ) {
    return {
      provide: STYNX_AUDIT_SINK,
      useExisting: AuditWriterService,
    };
  }
  return provider;
}
