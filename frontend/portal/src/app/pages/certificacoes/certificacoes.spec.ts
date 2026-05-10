import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../core/api/api-client';
import { Certificacoes } from './certificacoes';

describe('Certificacoes', () => {
  let fixture: ComponentFixture<Certificacoes>;
  const api = {
    get: vi.fn(),
    post: vi.fn(),
  };

  beforeEach(async () => {
    api.get.mockReset();
    api.post.mockReset();
    api.get.mockImplementation((path: string) => {
      if (path === 'v1/portal/meus-dados/cadastro') {
        return of({ id: 'employee-1' });
      }
      return of([
        {
          id: 'cert-1',
          employeeId: 'employee-1',
          courseName: 'NR-10',
          issuer: 'Senai',
          issuedAt: '2026-01-15',
          expiresAt: '2028-01-15',
          hoursWorkload: 40,
          notes: '',
          createdAt: '2026-01-16T10:00:00.000Z',
        },
      ]);
    });
    api.post.mockImplementation((_path: string, body: Record<string, unknown>) =>
      of({
        id: 'cert-2',
        employeeId: body['employeeId'],
        courseName: body['courseName'],
        issuer: body['issuer'],
        issuedAt: body['issuedAt'],
        expiresAt: null,
        hoursWorkload: null,
        notes: '',
        createdAt: '2026-05-10T08:00:00.000Z',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [Certificacoes],
      providers: [{ provide: ApiClient, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(Certificacoes);
    fixture.detectChanges();
  });

  it('loads current employee certifications and submits a new one', () => {
    const component = fixture.componentInstance;
    expect(api.get).toHaveBeenCalledWith('v1/portal/meus-dados/cadastro');
    expect(api.get).toHaveBeenCalledWith('v1/rh/certificacoes?employeeId=employee-1');
    expect(component.certificates).toHaveLength(1);
    expect(component.certificates[0]?.courseName).toBe('NR-10');

    component.form.patchValue({
      courseName: 'NR-35',
      issuer: 'Sebrae',
      issuedAt: '2026-05-10',
    });
    component.submit();

    expect(api.post).toHaveBeenCalledWith(
      'v1/rh/certificacoes',
      expect.objectContaining({
        employeeId: 'employee-1',
        courseName: 'NR-35',
        issuer: 'Sebrae',
        issuedAt: '2026-05-10',
      }),
    );
    expect(component.certificates[0]?.id).toBe('cert-2');
  });

  it('does not submit when the form is invalid', () => {
    const component = fixture.componentInstance;
    component.form.patchValue({ courseName: '', issuer: '', issuedAt: '' });
    component.submit();
    expect(api.post).not.toHaveBeenCalled();
  });
});
