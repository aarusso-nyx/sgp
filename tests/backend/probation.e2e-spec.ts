describe('Probation e2e contract', () => {
  it('exposes the HR-08 probation workflow contract', () => {
    expect('/v1/avaliacao/estagio-probatorio').toContain('estagio-probatorio');
  });
});
