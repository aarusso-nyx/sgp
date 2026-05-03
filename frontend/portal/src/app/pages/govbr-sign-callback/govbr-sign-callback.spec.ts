import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { GovBrSignCallback } from './govbr-sign-callback';

describe('GovBrSignCallback', () => {
  let fixture: ComponentFixture<GovBrSignCallback>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GovBrSignCallback],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                status: 'signed',
                signatureRequestId: 'sign-1',
              }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GovBrSignCallback);
  });

  it('shows the signed callback state returned by the backend', () => {
    const component = fixture.componentInstance;

    expect(component.signed).toBe(true);
    expect(component.signatureRequestId).toBe('sign-1');
  });
});
