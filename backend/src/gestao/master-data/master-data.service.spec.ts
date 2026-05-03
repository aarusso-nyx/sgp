import { MasterDataService } from './master-data.service';

describe('MasterDataService', () => {
  const uuid = '11111111-1111-4111-8111-111111111111';
  const row = {
    id: uuid,
    code: 'CODE',
    name: 'Name',
    description: 'Description',
    active: true,
    metadata: { source: 'spec' },
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: '2026-01-02T00:00:00.000Z',
  };

  const mutation = {
    code: ' CODE ',
    name: ' Name ',
    description: ' Description ',
    active: false,
    metadata: {
      agencyDigit: '1',
      amount: 123.45,
      amountOverride: 456.78,
      bankCode: '001',
      blocked: true,
      branchId: uuid,
      businessDate: '2026-04-25',
      classCode: 'A',
      contractRef: 'CNTR-1',
      dailyHours: 8,
      discountKind: 'FIXED',
      earningDeductionId: uuid,
      employmentLinkId: uuid,
      entersPayroll: true,
      eventKey: 'EVENT',
      examEntryId: uuid,
      examProviderEntryId: uuid,
      federatedEntity: 'BR',
      format: 'CSV',
      groupCode: 'G',
      groupName: 'Group',
      isBusinessDay: false,
      jobFunctionId: uuid,
      kind: 'EARNING',
      lifecycleStatus: 'ACTIVE',
      levelNumber: 2,
      metadata: { nested: true },
      modality: 'MODALITY',
      moduleKey: 'gestao',
      normNumber: '123',
      normType: 'LEI',
      normYear: 2026,
      ownerId: uuid,
      providerEntryId: uuid,
      ratePercent: 9.5,
      referenceEntryId: uuid,
      referenceYear: 2026,
      salaryRangeId: uuid,
      salaryReferenceId: uuid,
      schedule: '08:00-17:00',
      scope: 'GENERAL',
      sourceFileName: 'source.csv',
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      taxable: true,
      targetRoute: 'gestao/export',
      unitAmount: 5.25,
      value: { enabled: true },
      workLocationId: uuid,
    },
  };

  const createQuery = () =>
    jest.fn(async (sql: string) => {
      if (sql.includes('count(*)::text AS total')) {
        return [{ total: '1' }];
      }
      return [row];
    });

  it('lists the new estrutura and catalog resources', () => {
    const service = new MasterDataService({} as never);

    const result = service.listResources({ page: 1, pageSize: 200 });
    const keys = result.items.map((item) => item.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        'categoriaEconomica',
        'classificacaoAto',
        'categoriaDoenca',
        'subCategoriaDoenca',
        'classificacaoAgenteNocivo',
        'classificacaoInternacionalDoenca',
        'crmCrea',
        'crmCreaConvenio',
        'entidadeExame',
        'entidadeExameExame',
        'equipamentoProtecaoColetiva',
        'equipamentoProtecaoIndividual',
        'exame',
        'habilidade',
        'unidadeFederativa',
        'cargoAtividade',
        'cargoCurso',
        'cargoHabilidade',
        'cargoVinculo',
        'funcaoAtividade',
        'funcaoCurso',
        'funcaoHabilidade',
        'funcaoRequisito',
        'funcaoVerba',
        'funcaoVinculo',
        'faixaSalarialNivel',
        'lotacaoCargo',
        'lotacaoFuncao',
        'consignado',
        'aliquota',
      ]),
    );
  });

  it('lists every mapped resource through the PostgreSQL mapping layer', async () => {
    const query = createQuery();
    const service = new MasterDataService({
      configured: true,
      query,
    } as never);
    const resources = service.listResources({ page: 1, pageSize: 500 }).items;

    for (const resource of resources) {
      const result = await service.listRecords(resource.key, {
        page: 1,
        pageSize: 2,
        search: 'Name',
      });

      expect(result.items[0]).toMatchObject({
        id: uuid,
        code: 'CODE',
        name: 'Name',
        metadata: { source: 'spec' },
      });
    }

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $'),
      expect.arrayContaining(['%name%']),
    );
  });

  it('creates, updates, and deactivates writable mapped resources', async () => {
    const query = createQuery();
    const service = new MasterDataService({
      configured: true,
      query,
    } as never);
    const resources = service.listResources({ page: 1, pageSize: 500 }).items;
    let writable = 0;
    let dedicatedWorkflowOnly = 0;
    let alwaysActive = 0;

    for (const resource of resources) {
      try {
        const created = await service.createRecord(resource.key, mutation);
        const updated = await service.updateRecord(
          resource.key,
          uuid,
          mutation,
        );

        writable += 1;
        expect(created.code).toBe('CODE');
        expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');

        try {
          await service.deactivateRecord(resource.key, uuid);
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !error.message.includes('no inactive status')
          ) {
            throw error;
          }
          alwaysActive += 1;
        }
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes('dedicated PostgreSQL workflow endpoint')
        ) {
          throw error;
        }
        dedicatedWorkflowOnly += 1;
      }
    }

    expect(writable).toBeGreaterThan(50);
    expect(dedicatedWorkflowOnly).toBeGreaterThan(0);
    expect(alwaysActive).toBeGreaterThan(0);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payroll.payroll_earning_deduction'),
      expect.any(Array),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE public.system_parameter'),
      expect.any(Array),
    );
  });

  it('applies default metadata values for sparse master-data mutations', async () => {
    const query = createQuery();
    const service = new MasterDataService({
      configured: true,
      query,
    } as never);
    const sparseMutation = {
      code: 'SPARSE',
      name: 'Sparse',
      metadata: {
        ownerId: 'not-a-uuid',
        referenceEntryId: 'not-a-uuid',
        metadata: ['not-object'],
      },
    };

    for (const resource of [
      'banco',
      'diaUtil',
      'exportacaoArquivo',
      'cargoAtividade',
      'referenciaSalarial',
      'situacaoFuncional',
      'turno',
      'verba',
      'aliquota',
      'parametroSistema',
    ]) {
      await expect(
        service.createRecord(resource, sparseMutation),
      ).resolves.toHaveProperty('code', 'CODE');
      await expect(
        service.updateRecord(resource, uuid, sparseMutation),
      ).resolves.toHaveProperty('id', uuid);
    }
  });

  it('covers vacation-type and legislation parity resources explicitly', async () => {
    const query = createQuery();
    const service = new MasterDataService({
      configured: true,
      query,
    } as never);
    const resourceKeys = service
      .listResources({ page: 1, pageSize: 500 })
      .items.map((item) => item.key);

    expect(resourceKeys).toEqual(
      expect.arrayContaining(['tipoFerias', 'legislacao']),
    );

    await expect(
      service.listRecords('tipoFerias', { page: 1, pageSize: 5 }),
    ).resolves.toHaveProperty('items');
    await expect(
      service.createRecord('tipoFerias', mutation),
    ).resolves.toHaveProperty('code', 'CODE');
    await expect(
      service.createRecord('legislacao', mutation),
    ).resolves.toHaveProperty('code', 'CODE');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM hr.vacation_type'),
      expect.any(Array),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.vacation_type'),
      expect.any(Array),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.legislation'),
      expect.arrayContaining([
        'CODE',
        'Description',
        'INACTIVE',
        '123',
        2026,
        'LEI',
        'BR',
      ]),
    );
  });

  it('reports unavailable schemas, duplicate codes, and missing records', async () => {
    await expect(
      new MasterDataService({ configured: false } as never).listRecords(
        'banco',
        {},
      ),
    ).rejects.toThrow('DATABASE_URL is required');

    await expect(
      new MasterDataService({
        configured: true,
        query: createQuery(),
      } as never).listRecords('unknown', {}),
    ).rejects.toThrow('Master data resource not found');

    await expect(
      new MasterDataService({
        configured: true,
        query: jest.fn(async () => {
          throw { code: '42P01' };
        }),
      } as never).listRecords('banco', {}),
    ).rejects.toThrow('PostgreSQL schema is not migrated');

    await expect(
      new MasterDataService({
        configured: true,
        query: jest.fn(async () => {
          throw { cause: { code: '23505' } };
        }),
      } as never).createRecord('banco', mutation),
    ).rejects.toThrow('Master data code already exists');

    await expect(
      new MasterDataService({
        configured: true,
        query: jest.fn(async () => []),
      } as never).updateRecord('banco', uuid, mutation),
    ).rejects.toThrow('Master data record not found');
  });
});
