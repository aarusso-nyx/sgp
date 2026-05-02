import { AdapterRegistryService } from './adapter-registry.service';
import { LifecycleEmitterService } from '../lifecycle/lifecycle-emitter.service';
import { NoopStubAdapter } from '../examples/noop-stub.adapter';

describe('AdapterRegistryService', () => {
  it('registers, enables, disables, and keeps re-registration idempotent', async () => {
    const database = new FakeTceDatabase();
    const lifecycle = new LifecycleEmitterService(database as never);
    const service = new AdapterRegistryService(database as never, lifecycle);
    const adapter = new NoopStubAdapter();

    await service.register(adapter);
    await service.register(adapter);
    expect(database.registryRows).toHaveLength(1);

    const enabled = await service.enable('noop');
    expect(enabled.status).toBe('ENABLED');

    const disabled = await service.disable('noop');
    expect(disabled.status).toBe('DISABLED');
    expect(disabled.lifecycleEvents.map((event) => event.event)).toEqual(
      expect.arrayContaining([
        'REGISTERED',
        'ENABLED',
        'DISABLED',
        'HEALTH_OK',
      ]),
    );
  });
});

export class FakeTceDatabase {
  readonly configured = true;
  readonly registryRows: RegistryRecord[] = [];
  readonly eventRows: EventRecord[] = [];

  async query<T>(sql: string, values: readonly unknown[] = []): Promise<T[]> {
    if (sql.includes('INSERT INTO tce.adapter_registry')) {
      const adapterId = String(values[0]);
      let row = this.registryRows.find(
        (entry) => entry.adapter_id === adapterId,
      );
      if (!row) {
        row = {
          id: 'registry-1',
          adapter_id: adapterId,
          state_code: String(values[1]),
          municipal_code: null,
          organ_kind: String(values[2]),
          version: String(values[3]),
          status: 'REGISTERED',
          capabilities: JSON.parse(String(values[4])) as Record<
            string,
            unknown
          >,
          registered_at: '2026-05-02T00:00:00.000Z',
          last_health_check_at: String(values[5]),
          last_health_status: String(values[6]),
        };
        this.registryRows.push(row);
      } else {
        row.state_code = String(values[1]);
        row.organ_kind = String(values[2]);
        row.version = String(values[3]);
        row.capabilities = JSON.parse(String(values[4])) as Record<
          string,
          unknown
        >;
        row.last_health_check_at = String(values[5]);
        row.last_health_status = String(values[6]);
      }
      return [row] as T[];
    }

    if (sql.includes('INSERT INTO tce.adapter_lifecycle_event')) {
      this.eventRows.unshift({
        id: `event-${this.eventRows.length + 1}`,
        adapter_id: String(values[0]),
        event: String(values[1]),
        payload: JSON.parse(String(values[2])) as Record<string, unknown>,
        occurred_at: '2026-05-02T00:00:00.000Z',
      });
      return [] as T[];
    }

    if (sql.includes('UPDATE tce.adapter_registry')) {
      const row = this.registryRows.find(
        (entry) => entry.adapter_id === values[0],
      );
      if (!row) return [] as T[];
      row.status = String(values[1]);
      return [row] as T[];
    }

    if (sql.includes('FROM tce.adapter_lifecycle_event')) {
      return this.eventRows.filter(
        (event) => event.adapter_id === values[0],
      ) as T[];
    }

    if (sql.includes('FROM tce.adapter_registry')) {
      const rows = values.length
        ? this.registryRows.filter((row) => row.adapter_id === values[0])
        : this.registryRows;
      return rows as T[];
    }

    return [] as T[];
  }
}

interface RegistryRecord {
  id: string;
  adapter_id: string;
  state_code: string;
  municipal_code: string | null;
  organ_kind: string;
  version: string;
  status: string;
  capabilities: Record<string, unknown>;
  registered_at: string;
  last_health_check_at: string | null;
  last_health_status: string | null;
}

interface EventRecord {
  id: string;
  adapter_id: string;
  event: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}
