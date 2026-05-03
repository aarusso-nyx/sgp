import { RegrasSimulationService } from './regras-simulation.service';

describe('RegrasSimulationService', () => {
  it('runs direct EC 103 points simulation', () => {
    const service = new RegrasSimulationService();

    expect(
      service.simulatePontos({
        sexo: 'MALE',
        dataNascimento: '1962-01-01',
        dataInicioContribuicao: '1985-01-01',
        dataReferencia: '2025-01-01',
      }),
    ).toMatchObject({
      rule: 'EC103_PONTOS',
      legalBasis: 'EC 103/2019 art. 4',
    });
  });
});
