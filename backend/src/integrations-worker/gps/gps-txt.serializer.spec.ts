import { GpsTxtSerializer } from './gps-txt.serializer';

describe('GpsTxtSerializer', () => {
  const serializer = new GpsTxtSerializer();

  it('round-trips the IN 925/2009 transition TXT fields', () => {
    const txt = serializer.serialize({
      layout: 'GPS-IN925-2009',
      tenantId: '00000000-0000-0000-0000-00000000f504',
      competence: '2018-06-01',
      paymentCode: '2402',
      reason: 'RETROACTIVE',
      baseAmount: '1000.00',
      amount: '110.00',
      interestAmount: '12.34',
      fineAmount: '22.00',
      totalAmount: '144.34',
      generatedAt: '2026-05-02T12:00:00.000Z',
    });

    expect(txt).toContain('GPS|GPS-IN925-2009|');
    expect(txt).toContain('FIMGPS|');
    expect(serializer.parse(txt)).toEqual({
      layout: 'GPS-IN925-2009',
      tenantId: '00000000-0000-0000-0000-00000000f504',
      competence: '2018-06-01',
      paymentCode: '2402',
      reason: 'RETROACTIVE',
      baseAmount: '1000.00',
      amount: '110.00',
      interestAmount: '12.34',
      fineAmount: '22.00',
      totalAmount: '144.34',
      generatedAt: '2026-05-02T12:00:00.000Z',
    });
  });
});
