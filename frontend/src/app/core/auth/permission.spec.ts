import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { NavigationFilter } from '../navigation/navigation-filter';
import { CognitoAuth } from './cognito-auth';
import { Permission } from './permission';

describe('Permission', () => {
  let service: Permission;

  const auth = {
    currentSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [Permission, NavigationFilter, { provide: CognitoAuth, useValue: auth }],
    });

    service = TestBed.inject(Permission);
  });

  it('returns true when all required permissions are present', () => {
    auth.currentSession.mockReturnValue({
      subject: '1',
      login: 'gestor',
      displayName: 'Gestor',
      groups: ['gestao'],
      permissions: ['gestao.listar', 'gestao.editar'],
    });

    expect(service.hasAll(['gestao.listar', 'gestao.editar'])).toBe(true);
  });

  it('returns false for missing permissions', () => {
    auth.currentSession.mockReturnValue({
      subject: '1',
      login: 'gestor',
      displayName: 'Gestor',
      groups: ['gestao'],
      permissions: ['gestao.listar'],
    });

    expect(service.hasAll(['gestao.listar', 'gestao.editar'])).toBe(false);
  });

  it('checks both permission and group requirements', () => {
    auth.currentSession.mockReturnValue({
      subject: '1',
      login: 'analista-rh',
      displayName: 'RH',
      groups: ['rh'],
      permissions: ['rh.listar'],
    });

    expect(service.allows({ requiredPermissions: ['rh.listar'], requiredGroups: ['rh'] })).toBe(
      true,
    );
    expect(service.allows({ requiredPermissions: ['rh.listar'], requiredGroups: ['gestao'] })).toBe(
      false,
    );
  });
});
