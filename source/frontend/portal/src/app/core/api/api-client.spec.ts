import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiClient } from './api-client';

describe('Portal ApiClient', () => {
  let service: ApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('dispatches typed PUT requests through the configured API base path', () => {
    const body = {
      senhaAtual: 'old-secret',
      novaSenha: 'new-secret',
    };

    service.put('/v1/auth/alterar-senha', body).subscribe((result) => {
      expect(result).toEqual({ ok: true });
    });

    const request = http.expectOne('/api/v1/auth/alterar-senha');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ ok: true });
  });
});
