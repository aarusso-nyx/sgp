import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface QuestionDraft {
  number: number;
  statement: string;
  answer: string;
}

@Component({
  selector: 'app-recrutamento-avaliacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avaliacao.html',
  styleUrl: './avaliacao.scss',
})
export class RecrutamentoAvaliacao {
  mode: 'provas' | 'gabarito' | 'recursos' = 'provas';
  prova = {
    concursoId: '',
    kind: 'OBJETIVA',
    appliedAt: '',
    weight: '1.000000',
  };
  questions: QuestionDraft[] = [
    { number: 1, statement: '', answer: 'A' },
    { number: 2, statement: '', answer: 'B' },
  ];
  recurso = {
    id: '',
    status: 'UPHELD',
    parecer: '',
  };

  addQuestion(): void {
    this.questions.push({
      number: this.questions.length + 1,
      statement: '',
      answer: '',
    });
  }

  answersPreview(): string {
    return JSON.stringify(
      Object.fromEntries(this.questions.map((item) => [item.number, item.answer])),
      null,
      2,
    );
  }
}
