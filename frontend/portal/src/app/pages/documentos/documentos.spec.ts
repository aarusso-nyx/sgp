import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../core/api/api-client';
import { Documentos } from './documentos';

describe('Documentos', () => {
  let fixture: ComponentFixture<Documentos>;
  const api = {
    get: vi.fn(() => of([])),
    post: vi.fn(() =>
      of({
        id: 'request-1',
        documentKind: 'ficha-funcional',
        purpose: 'posse',
        status: 'REQUESTED',
        dueAt: null,
        createdAt: '2026-05-08T12:00:00.000Z',
      }),
    ),
  };

  beforeEach(async () => {
    api.get.mockClear();
    api.post.mockClear();
    await TestBed.configureTestingModule({
      imports: [Documentos],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { url: of([{ path: 'documentos' }, { path: 'solicitar' }]) },
        },
        {
          provide: ApiClient,
          useValue: api,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Documentos);
    fixture.detectChanges();
  });

  it('loads and submits document requests through the portal endpoint', () => {
    const component = fixture.componentInstance;

    component.form.patchValue({
      documentKind: 'ficha-funcional',
      purpose: 'posse',
      notes: '',
    });
    component.submit();

    expect(api.get).toHaveBeenCalledWith('v1/portal/documentos/solicitacoes');
    expect(api.post).toHaveBeenCalledWith('v1/portal/documentos/solicitacoes', {
      documentKind: 'ficha-funcional',
      purpose: 'posse',
      notes: '',
    });
    expect(component.requests[0]?.id).toBe('request-1');
  });
});
