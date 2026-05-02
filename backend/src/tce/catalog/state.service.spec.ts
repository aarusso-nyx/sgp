import { StateService } from './state.service';

describe('StateService', () => {
  it('lists 26 states, DF, TCU, and four municipal courts from the seed catalog', async () => {
    const service = new StateService(new FakeCatalogDatabase() as never);

    const states = await service.list();

    expect(states).toHaveLength(32);
    expect(states.filter((state) => state.organKind === 'TCM')).toHaveLength(4);
    expect(states).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DF',
          sphere: 'FEDERAL_DISTRICT',
          organKind: 'TCE',
        }),
        expect.objectContaining({ code: 'BR', organKind: 'TCU' }),
        expect.objectContaining({
          organName: 'Tribunal de Contas do Municipio de Sao Paulo',
        }),
      ]),
    );
  });
});

class FakeCatalogDatabase {
  readonly configured = true;

  async query<T>(): Promise<T[]> {
    return [
      ...[
        'AC',
        'AL',
        'AP',
        'AM',
        'BA',
        'CE',
        'DF',
        'ES',
        'GO',
        'MA',
        'MT',
        'MS',
        'MG',
        'PA',
        'PB',
        'PR',
        'PE',
        'PI',
        'RJ',
        'RN',
        'RS',
        'RO',
        'RR',
        'SC',
        'SP',
        'SE',
        'TO',
      ].map((code) => ({
        id: `state-${code}`,
        code,
        name: code === 'DF' ? 'Distrito Federal' : code,
        sphere: code === 'DF' ? 'FEDERAL_DISTRICT' : 'STATE',
        parent_state_code: null,
        organ_kind: 'TCE',
        organ_name: `Tribunal de Contas ${code}`,
        organ_official_url: 'https://example.test/',
      })),
      {
        id: 'state-BR',
        code: 'BR',
        name: 'Brasil',
        sphere: 'FEDERAL_DISTRICT',
        parent_state_code: null,
        organ_kind: 'TCU',
        organ_name: 'Tribunal de Contas da Uniao',
        organ_official_url: 'https://portal.tcu.gov.br/',
      },
      ...[
        ['RM', 'RJ', 'Tribunal de Contas do Municipio do Rio de Janeiro'],
        ['SM', 'SP', 'Tribunal de Contas do Municipio de Sao Paulo'],
        ['PM', 'PA', 'Tribunal de Contas dos Municipios do Estado do Para'],
        ['GM', 'GO', 'Tribunal de Contas dos Municipios do Estado de Goias'],
      ].map(([code, parent, name]) => ({
        id: `state-${code}`,
        code,
        name,
        sphere: 'MUNICIPAL',
        parent_state_code: parent,
        organ_kind: 'TCM',
        organ_name: name,
        organ_official_url: 'https://example.test/',
      })),
    ] as T[];
  }
}
