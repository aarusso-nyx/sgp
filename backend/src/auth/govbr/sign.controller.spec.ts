import { GovBrSignController } from './sign.controller';

describe('GovBrSignController', () => {
  it('delegates initiation to the local gov.br sign service', () => {
    const signService = {
      initiate: jest.fn().mockReturnValue({
        request: { id: 'sign-1', status: 'PENDING' },
        redirectUrl: '/api/portal/v1/auth/govbr/sign/callback?state=s',
      }),
      complete: jest.fn(),
    };
    const controller = new GovBrSignController(signService as never);
    const actor = { username: 'portal' };
    const body = {
      resourceType: 'hr.cadastral_change_request',
      payload: { section: 'contato' },
    };

    expect(controller.initiate(actor as never, body)).toMatchObject({
      request: { id: 'sign-1' },
    });
    expect(signService.initiate).toHaveBeenCalledWith(actor, body);
  });

  it('returns a redirect descriptor after applying a callback decision', () => {
    const signService = {
      initiate: jest.fn(),
      complete: jest.fn().mockReturnValue({
        request: { id: 'sign-1', status: 'DENIED' },
        redirectUrl:
          '/govbr-sign/callback?status=denied&signatureRequestId=sign-1',
      }),
    };
    const controller = new GovBrSignController(signService as never);

    expect(
      controller.callback({ state: 'state-1', decision: 'denied' }),
    ).toEqual({
      url: '/govbr-sign/callback?status=denied&signatureRequestId=sign-1',
      statusCode: 302,
    });
    expect(signService.complete).toHaveBeenCalledWith({
      state: 'state-1',
      decision: 'denied',
    });
  });
});
