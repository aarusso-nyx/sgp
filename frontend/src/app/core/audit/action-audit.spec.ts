import { TestBed } from '@angular/core/testing';

import { ActionAudit } from './action-audit';

describe('ActionAudit', () => {
  let service: ActionAudit;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActionAudit);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
