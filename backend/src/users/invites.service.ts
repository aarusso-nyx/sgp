import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class InvitesService {
  createInvite(input: {
    email?: string;
    login?: string;
    perfis?: string[];
    expiresAt?: string;
  }) {
    return {
      id: randomUUID(),
      token: randomUUID(),
      status: 'PENDING',
      email: input.email ?? null,
      login: input.login ?? null,
      perfis: input.perfis ?? [],
      expiresAt:
        input.expiresAt ??
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  cancelInvite(id: string) {
    return {
      id,
      status: 'CANCELED',
      canceledAt: new Date().toISOString(),
    };
  }

  acceptInvite(token: string, input: { senha?: string; nome?: string }) {
    return {
      token,
      status: 'ACCEPTED',
      acceptedAt: new Date().toISOString(),
      nome: input.nome ?? null,
      senhaDefinida: Boolean(input.senha),
    };
  }
}
