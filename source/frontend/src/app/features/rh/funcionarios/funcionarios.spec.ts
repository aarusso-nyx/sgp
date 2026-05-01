import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';

import { RhWorkflows } from '../services/rh-workflows';
import { RhFuncionarios } from './funcionarios';

describe('RhFuncionarios', () => {
  let fixture: ComponentFixture<RhFuncionarios>;

  const rhWorkflows = {
    listEmployees: () =>
      of({
        items: [
          {
            id: 'emp-1',
            registration: 'MAT-001',
            name: 'Servidor',
            cpf: '00011122233',
            email: 'servidor@example.test',
            lifecycleStatus: 'ACTIVE',
            functionalStatus: 'Em exercicio',
            branch: 'Matriz',
            active: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      }),
    createEmployee: () => of({ registration: 'MAT-002' }),
    terminateEmployee: () => of({ id: 'emp-1' }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RhFuncionarios],
      imports: [
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        RouterModule.forRoot([]),
      ],
      providers: [{ provide: RhWorkflows, useValue: rhWorkflows }],
    }).compileComponents();

    fixture = TestBed.createComponent(RhFuncionarios);
    fixture.detectChanges();
  });

  it('renders the real funcionarios page without AdminFeaturePage fallback', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Cadastro do servidor');
    expect(text).toContain('MAT-001');
    expect(text).not.toContain('AdminFeaturePage');
  });
});
