import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolhaPagamentoHome } from './folha-pagamento-home';

describe('FolhaPagamentoHome', () => {
  let component: FolhaPagamentoHome;
  let fixture: ComponentFixture<FolhaPagamentoHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FolhaPagamentoHome],
    }).compileComponents();

    fixture = TestBed.createComponent(FolhaPagamentoHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
