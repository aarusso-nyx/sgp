import { PontoService } from './ponto.service';

describe('PontoService', () => {
  it('is available for the portal ponto collaborator boundary', () => {
    expect(new PontoService()).toBeInstanceOf(PontoService);
  });
});
