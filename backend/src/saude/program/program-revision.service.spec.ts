import { ProgramRevisionService } from './program-revision.service';

describe('ProgramRevisionService', () => {
  it('uses INSERT only for immutable program revisions', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rev-1',
              parent_program_id: 'pcmso-1',
              parent_program_kind: 'PCMSO',
              revision_number: 1,
              revision_reason: 'ANNUAL',
              snapshot_json: { program: { id: 'pcmso-1' } },
              signed_pdf_uri: null,
              sha256: null,
              created_at: '2026-05-02T00:00:00.000Z',
            },
          ],
        }),
    };
    const service = new ProgramRevisionService();

    await service.createWithClient(client as never, {
      parentProgramId: 'pcmso-1',
      parentProgramKind: 'PCMSO',
      revisionReason: 'ANNUAL',
      snapshotJson: { program: { id: 'pcmso-1' } },
    });

    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringMatching(/\bUPDATE\b|\bDELETE\b/),
      expect.anything(),
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO saude.program_revision'),
      expect.any(Array),
    );
  });

  it('accepts PCMAT as a health-program revision parent', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rev-2',
              parent_program_id: 'pcmat-1',
              parent_program_kind: 'PCMAT',
              revision_number: 1,
              revision_reason: 'ANNUAL',
              snapshot_json: { program: { id: 'pcmat-1' } },
              signed_pdf_uri: null,
              sha256: null,
              created_at: '2026-05-02T00:00:00.000Z',
            },
          ],
        }),
    };
    const service = new ProgramRevisionService();

    await expect(
      service.createWithClient(client as never, {
        parentProgramId: 'pcmat-1',
        parentProgramKind: 'PCMAT',
        revisionReason: 'ANNUAL',
        snapshotJson: { program: { id: 'pcmat-1' } },
      }),
    ).resolves.toMatchObject({
      parentProgramKind: 'PCMAT',
      revisionNumber: 1,
    });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('kind = $2::saude.health_program_kind'),
      ['pcmat-1', 'PCMAT'],
    );
  });
});
