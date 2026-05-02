import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ConcursoDraftSeat {
  positionId: string;
  totalSeats: number;
  pcdSeats: number;
  racialSeats: number;
  indigenousSeats: number;
  baseSalary: string;
}

@Component({
  selector: 'app-recrutamento-concursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './concursos.html',
  styleUrl: './concursos.scss',
})
export class RecrutamentoConcursos {
  step: 'general' | 'seats' | 'edital' | 'publish' = 'general';
  draft = {
    code: '',
    name: '',
    validUntil: '',
    editalRef: '',
    administrativeAct: '',
    administrativeActDate: '',
    publicUrl: '',
  };
  seats: ConcursoDraftSeat[] = [
    {
      positionId: '',
      totalSeats: 10,
      pcdSeats: 1,
      racialSeats: 2,
      indigenousSeats: 0,
      baseSalary: '0.00',
    },
  ];

  next(): void {
    const order = ['general', 'seats', 'edital', 'publish'] as const;
    this.step = order[Math.min(order.indexOf(this.step) + 1, order.length - 1)];
  }

  previous(): void {
    const order = ['general', 'seats', 'edital', 'publish'] as const;
    this.step = order[Math.max(order.indexOf(this.step) - 1, 0)];
  }

  addSeat(): void {
    this.seats.push({
      positionId: '',
      totalSeats: 1,
      pcdSeats: 0,
      racialSeats: 0,
      indigenousSeats: 0,
      baseSalary: '0.00',
    });
  }
}
