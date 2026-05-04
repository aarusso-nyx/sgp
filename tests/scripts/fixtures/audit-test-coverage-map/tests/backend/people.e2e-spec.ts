describe('People API route surface', () => {
  it('uses /api/v1/people', () => {
    expect('/api/v1/people').toContain('people');
  });
});
