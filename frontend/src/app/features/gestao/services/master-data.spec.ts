import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MasterData } from './master-data';

describe('MasterData', () => {
  let service: MasterData;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MasterData);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists records for canonical master-data resource', () => {
    service.listRecords('adminMenus', { search: 'analista' }).subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.method === 'GET' &&
        candidate.url === '/api/v1/master-data/adminMenus' &&
        candidate.params.get('search') === 'analista',
    );

    request.flush({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  it('creates, updates, and deactivates records', () => {
    service.createRecord('adminMenus', { code: 'A', name: 'Analista' }).subscribe((record) => {
      expect(record.id).toBe('1');
    });

    const createRequest = http.expectOne('/api/v1/master-data/adminMenus');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({ code: 'A', name: 'Analista' });
    createRequest.flush({ id: '1' });

    service.updateRecord('adminMenus', '1', { code: 'B', name: 'Tecnico' }).subscribe((record) => {
      expect(record.id).toBe('1');
    });

    const updateRequest = http.expectOne('/api/v1/master-data/adminMenus/1');
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body).toEqual({ code: 'B', name: 'Tecnico' });
    updateRequest.flush({ id: '1' });

    service.deactivateRecord('adminMenus', '1').subscribe();

    const deleteRequest = http.expectOne('/api/v1/master-data/adminMenus/1');
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ id: '1', active: false });
  });
});
