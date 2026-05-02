import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConvenioHome } from './convenio-home';

describe('ConvenioHome', () => {
  let component: ConvenioHome;
  let fixture: ComponentFixture<ConvenioHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConvenioHome],
    }).compileComponents();

    fixture = TestBed.createComponent(ConvenioHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
