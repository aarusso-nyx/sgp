import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ConfirmationDialog } from './confirmation-dialog';

describe('ConfirmationDialog', () => {
  let component: ConfirmationDialog;
  let fixture: ComponentFixture<ConfirmationDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConfirmationDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits confirmation and cancellation events', () => {
    const confirmSpy = vi.spyOn(component.confirmed, 'emit');
    const cancelSpy = vi.spyOn(component.cancelled, 'emit');

    component.confirm();
    component.cancel();

    expect(confirmSpy).toHaveBeenCalled();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
