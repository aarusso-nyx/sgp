import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { CrudTable } from './crud-table';

describe('CrudTable', () => {
  let component: CrudTable;
  let fixture: ComponentFixture<CrudTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrudTable],
    }).compileComponents();

    fixture = TestBed.createComponent(CrudTable);
    component = fixture.componentInstance;
    component.columns = [
      { key: 'nome', header: 'Nome' },
      { key: 'cpf', header: 'CPF' },
    ];
    component.rows = [{ nome: 'Maria', cpf: '000.000.000-00' }];
    component.actions = [{ id: 'edit', label: 'Editar', icon: 'edit' }];
    component.rowLabelKey = 'nome';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits action event with row payload', () => {
    const emitSpy = vi.spyOn(component.actionTriggered, 'emit');

    component.trigger('edit', component.rows[0]!);

    expect(emitSpy).toHaveBeenCalledWith({
      actionId: 'edit',
      row: component.rows[0]!,
    });
  });

  it('builds accessible action labels with the row label', () => {
    expect(component.actionAriaLabel(component.actions[0]!, component.rows[0]!)).toBe(
      'Editar: Maria',
    );
  });
});
