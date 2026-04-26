import { TestBed } from '@angular/core/testing';

import { CognitoAuth } from './cognito-auth';

describe('CognitoAuth', () => {
  let service: CognitoAuth;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CognitoAuth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
