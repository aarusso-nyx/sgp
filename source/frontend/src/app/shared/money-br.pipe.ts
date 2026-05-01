import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'moneyBr',
  standalone: false,
})
export class MoneyBrPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return String(value);
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  }
}
