import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';

import { RhWorkflows } from '../../services/rh-workflows';
import { RhFuncionariosVinculos } from './vinculos';

describe('RhFuncionariosVinculos', () => {
  let fixture: ComponentFixture<RhFuncionariosVinculos>;
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
    getEmployeeDossier: () =>
      of({
        funcionarioId: 'emp-1',
        statusHistory: [
          {
            id: 'hist-1',
            functionalStatus: 'Em exercicio',
            startsOn: '2026-01-01T00:00:00.000Z',
            endsOn: null,
            notes: 'Admissao',
          },
        ],
      }),
    changeContractRegime: () => of({ employmentLinkId: 'link-1' }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RhFuncionariosVinculos],
      imports: [CommonModule, ReactiveFormsModule, MatButtonModule],
      providers: [{ provide: RhWorkflows, useValue: rhWorkflows }],
    }).compileComponents();

    fixture = TestBed.createComponent(RhFuncionariosVinculos);
    fixture.detectChanges();
  });

  it('renders timeline and statutory fields by default', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Vinculos e regime juridico');
    expect(text).toContain('Linha do tempo');
    expect(text).toContain('Fundamento do regime estatutario');
  });

  it('shows temporary and commissioned required fields by contract type', () => {
    fixture.componentInstance.regimeForm.patchValue({ contractType: 'temporary' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Fim do contrato temporario');

    fixture.componentInstance.regimeForm.patchValue({ contractType: 'commissioned' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargo em comissao');
  });
});
