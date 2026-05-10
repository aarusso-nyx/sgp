import { Injectable } from '@nestjs/common';

import { AuthenticatedActor } from '../actor.types';

@Injectable()
export class SessionService {
  currentSession(actor: AuthenticatedActor | undefined) {
    return {
      actor,
      authenticated: Boolean(actor),
    };
  }

  currentMenus(actor: AuthenticatedActor | undefined) {
    return {
      actor: actor?.username ?? null,
      items: [
        { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
        { id: 'rh', label: 'RH', path: '/rh' },
        { id: 'folha', label: 'Folha', path: '/folha' },
      ],
    };
  }

  logout(actor: AuthenticatedActor | undefined) {
    return {
      actor: actor?.username ?? null,
      loggedOut: true,
      at: new Date().toISOString(),
    };
  }

  recoverPassword(input: {
    login?: string | undefined;
    email?: string | undefined;
  }) {
    return {
      accepted: true,
      identifier: input.login ?? input.email ?? null,
      message: 'Recovery flow started.',
    };
  }

  confirmNewPassword(input: { token: string; novaSenha: string }) {
    return {
      accepted: Boolean(input.token && input.novaSenha),
      changedAt: new Date().toISOString(),
    };
  }

  changePassword(
    actor: AuthenticatedActor | undefined,
    input: { senhaAtual: string; novaSenha: string },
  ) {
    return {
      actor: actor?.username ?? null,
      changed: Boolean(input.senhaAtual && input.novaSenha),
      changedAt: new Date().toISOString(),
    };
  }
}
