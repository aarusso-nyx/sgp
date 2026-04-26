import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatorioHome } from './relatorio-home';

describe('RelatorioHome', () => {
  let component: RelatorioHome;
  let fixture: ComponentFixture<RelatorioHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RelatorioHome],
    }).compileComponents();

    fixture = TestBed.createComponent(RelatorioHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
