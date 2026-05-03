import { DeclaracaoService } from './declaracao.service';

describe('DeclaracaoService', () => {
  it('rejects output requests for missing declarations', async () => {
    const service = new DeclaracaoService({
      configured: true,
      query: jest.fn(async () => []),
    } as never);

    await expect(
      service.requestDeclarationOutput('missing', {}),
    ).rejects.toThrow('Previdentiary declaration not found');
  });
});
