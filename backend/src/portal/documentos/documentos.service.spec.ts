import { BadRequestException } from '@nestjs/common';

import { TEST_INSTANT_2026_05_02T10_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';
import { DocumentosService } from './documentos.service';

describe('DocumentosService', () => {
  const actor = {
    sub: 'sub-1',
    username: 'portal.user',
    tenantId: '00000000-0000-0000-0000-000000000100',
    groups: [],
    permissions: [],
    claims: { cpf: '00011122233', email: 'portal@example.test' },
  };
  const employee = { id: 'employee-1' };
  const meusDadosService = {
    loadEmployee: jest.fn(),
    toDate: (value: Date | string) =>
      (value instanceof Date
        ? value.toISOString()
        : new Date(value).toISOString()
      ).slice(0, 10),
    toIso: (value: Date | string) =>
      value instanceof Date
        ? value.toISOString()
        : new Date(value).toISOString(),
  };

  beforeEach(() => {
    meusDadosService.loadEmployee.mockReset();
  });

  it('maps employee documents', async () => {
    meusDadosService.loadEmployee.mockResolvedValue(employee);
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'doc-1',
        file_name: 'rg.pdf',
        content_type: null,
        size_bytes: null,
        checksum: null,
        created_at: new Date(TEST_INSTANT_2026_05_02T10_00_00_000Z),
      },
    ]);
    const service = new DocumentosService(
      { query } as never,
      meusDadosService as never,
    );

    await expect(service.getDocuments(actor)).resolves.toMatchObject([
      {
        id: 'doc-1',
        fileName: 'rg.pdf',
        createdAt: '2026-05-02T10:00:00.000Z',
      },
    ]);
    expect(query).toHaveBeenCalledWith(expect.any(String), ['employee-1']);
  });

  it('creates and lists portal document requests', async () => {
    const requestRow = {
      id: 'request-1',
      employee_id: 'employee-1',
      document_kind: 'ficha-funcional',
      purpose: 'posse',
      status: 'REQUESTED',
      due_at: null,
      fulfilled_attachment_id: null,
      notes: '',
      created_at: '2026-05-08T12:00:00.000Z',
      updated_at: '2026-05-08T12:00:00.000Z',
    };
    meusDadosService.loadEmployee.mockResolvedValue(employee);
    const query = jest
      .fn()
      .mockResolvedValueOnce([requestRow])
      .mockResolvedValueOnce([requestRow]);
    const service = new DocumentosService(
      { query } as never,
      meusDadosService as never,
    );

    await expect(
      service.createDocumentRequest(actor, {
        documentKind: ' ficha-funcional ',
        purpose: 'posse',
      }),
    ).resolves.toMatchObject({
      id: 'request-1',
      documentKind: 'ficha-funcional',
      status: 'REQUESTED',
    });
    await expect(service.listDocumentRequests(actor)).resolves.toMatchObject([
      { id: 'request-1', purpose: 'posse' },
    ]);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT'),
      ['employee-1', 'ficha-funcional', 'posse', '', 'sub-1', 'portal.user'],
    );
  });

  it('rejects blank document request kinds', async () => {
    meusDadosService.loadEmployee.mockResolvedValue(employee);
    const service = new DocumentosService(
      { query: jest.fn() } as never,
      meusDadosService as never,
    );

    await expect(
      service.createDocumentRequest(actor, { documentKind: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
