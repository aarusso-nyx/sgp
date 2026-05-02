import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { FilterBar } from './filter-bar';

describe('FilterBar', () => {
  let component: FilterBar;
  let fixture: ComponentFixture<FilterBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterBar],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterBar);
    component = fixture.componentInstance;
    component.fields = [
      { key: 'nome', label: 'Nome' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Ativo', value: 'ATIVO' },
          { label: 'Inativo', value: 'INATIVO' },
        ],
      },
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits filter payload on apply', () => {
    const emitSpy = vi.spyOn(component.applyFilters, 'emit');

    component.form.patchValue({ nome: 'Maria' });
    component.onApply();

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Maria',
      }),
    );
  });

  it('emits clear event after resetting controls', () => {
    const emitSpy = vi.spyOn(component.clearFilters, 'emit');

    component.form.patchValue({ nome: 'Maria' });
    component.onClear();

    expect(component.form.getRawValue()).toEqual({ nome: '', status: '' });
    expect(emitSpy).toHaveBeenCalled();
  });
});
