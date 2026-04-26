import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ConfirmationDialogTone = 'default' | 'warning' | 'danger';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: false,
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss',
})
export class ConfirmationDialog {
  @Input() title = 'Confirmar ação';
  @Input() message = 'Revise as informações antes de continuar.';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Input() tone: ConfirmationDialogTone = 'default';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  confirm(): void {
    this.confirmed.emit();
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
