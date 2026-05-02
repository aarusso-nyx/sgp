import { NomeacaoService } from './nomeacao.service';

describe('NomeacaoService', () => {
  it('selects the next uncalled position preserving published call order', () => {
    expect(
      NomeacaoService.nextCall([
        {
          inscricaoId: 'general-1',
          callOrder: 1,
          allocationBucket: 'GENERAL',
          alreadyCalled: true,
        },
        {
          inscricaoId: 'racial-1',
          callOrder: 3,
          allocationBucket: 'RACIAL',
        },
        {
          inscricaoId: 'general-2',
          callOrder: 2,
          allocationBucket: 'GENERAL',
        },
      ]),
    ).toBe('general-2');
  });

  it('returns null when every classified candidate was already called', () => {
    expect(
      NomeacaoService.nextCall([
        {
          inscricaoId: 'general-1',
          callOrder: 1,
          allocationBucket: 'GENERAL',
          alreadyCalled: true,
        },
      ]),
    ).toBeNull();
  });
});
