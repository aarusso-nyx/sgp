import { AudespValidatorService } from './audesp-validator.service';
import {
  audespFixturePayload,
  audespLayoutFields,
} from '../testing/audesp-fixtures';

describe('AudespValidatorService', () => {
  it('detects missing required fields', () => {
    const validator = new AudespValidatorService();
    const payload = audespFixturePayload();
    payload.servers[0].registration = '';

    const errors = validator.validate(payload, '0.0.1', audespLayoutFields());

    expect(errors).toContainEqual(
      expect.objectContaining({
        fieldPath: 'AudespFolha.Servidores.Servidor.Matricula',
        code: 'REQUIRED',
      }),
    );
  });

  it('detects max length violations', () => {
    const validator = new AudespValidatorService();
    const payload = audespFixturePayload();
    payload.servers[0].registration = 'M'.repeat(31);

    const errors = validator.validate(payload, '0.0.1', audespLayoutFields());

    expect(errors).toContainEqual(
      expect.objectContaining({
        fieldPath: 'AudespFolha.Servidores.Servidor.Matricula',
        code: 'MAX_LENGTH',
      }),
    );
  });
});
