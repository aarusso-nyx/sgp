import type { DatabaseService } from '../../database/database.service';
import { Cnab240IntegrationDispatcher } from './cnab240.dispatcher';
import {
  Cnab240Emitter,
  Cnab240RelayDispatcher,
  createCnab240Emitter,
} from './cnab240.dispatcher';
import { ESocialEventIntegrationDispatcher } from './esocial-event.dispatcher';
import { EvaluationIntegrationDispatcher } from './evaluation.dispatcher';
import { GfipIntegrationDispatcher } from './gfip.dispatcher';
import type { IntegrationJobDispatcher } from './integration-job-dispatcher';
import { PrevidentiaryIntegrationDispatcher } from './previdentiary.dispatcher';

export interface CreateIntegrationJobDispatchersInput {
  databaseService: DatabaseService;
  cnab240EmitService?: Cnab240Emitter;
  cnab240RelayDispatchService?: Cnab240RelayDispatcher;
}

export function createIntegrationJobDispatchers(
  input: CreateIntegrationJobDispatchersInput,
): IntegrationJobDispatcher[] {
  return [
    new Cnab240IntegrationDispatcher(
      createCnab240Emitter(input.databaseService, input.cnab240EmitService),
      input.cnab240RelayDispatchService,
    ),
    new GfipIntegrationDispatcher(),
    new EvaluationIntegrationDispatcher(),
    new PrevidentiaryIntegrationDispatcher(),
    new ESocialEventIntegrationDispatcher(),
  ];
}
