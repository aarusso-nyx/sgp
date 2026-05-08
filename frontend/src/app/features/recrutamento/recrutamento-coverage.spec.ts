import { describe, expect, it, vi } from 'vitest';

import { RecrutamentoAvaliacao } from './avaliacao/avaliacao';
import { RecrutamentoBanca } from './banca/banca';
import { RecrutamentoBiometria } from './biometria/biometria';
import { RecrutamentoClassificacao } from './classificacao/classificacao';
import { RecrutamentoConcursos } from './concursos/concursos';
import { RecrutamentoNomeacao } from './nomeacao/nomeacao';
import { RecrutamentoPosse } from './posse/posse';
import { RecrutamentoProvaOnlineReview } from './prova-online-review/prova-online-review';

describe('recrutamento coverage flows', () => {
  it('advances concurso setup steps and appends seat drafts', () => {
    const component = new RecrutamentoConcursos();

    component.next();
    component.next();
    component.next();
    component.next();
    component.previous();
    component.addSeat();

    expect(component.step).toBe('edital');
    expect(component.seats).toHaveLength(2);
    expect(component.seats[1]).toMatchObject({ totalSeats: 1, baseSalary: '0.00' });
  });

  it('builds evaluation answer previews and switches board views', () => {
    const avaliacao = new RecrutamentoAvaliacao();
    const banca = new RecrutamentoBanca();

    avaliacao.addQuestion();
    avaliacao.questions[2].answer = 'C';
    banca.setView('signing');
    banca.setView('publish');

    expect(avaliacao.answersPreview()).toContain('"3": "C"');
    expect(banca.view).toBe('publish');
  });

  it('runs biometric matching for accepted and rejected inputs', () => {
    const component = new RecrutamentoBiometria();

    component.runMatch();
    expect(component.result.decision).toBe('REJECT');

    component.search.candidatoId = 'candidate-1';
    component.runMatch();

    expect(component.result).toMatchObject({ score: '0.912000', decision: 'ACCEPT' });
  });

  it('generates and publishes classification versions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 4, 8, 12, 34, 0)));
    const component = new RecrutamentoClassificacao();

    component.generate();
    component.publish(component.versions[0]);

    expect(component.versions[0]).toMatchObject({ status: 'PUBLISHED', published: true });
    expect(component.versions.some((item) => item.status === 'SUPERSEDED')).toBe(true);
    vi.useRealTimers();
  });

  it('creates appointment notices and handles withdrawals', () => {
    const component = new RecrutamentoNomeacao();
    const call = component.nextCalls[0];

    component.appoint(call);
    component.withdraw(component.notices[0]);
    component.emailEnabled = false;
    component.appoint(component.nextCalls[0]);

    expect(component.nextCalls).not.toContain(call);
    expect(component.notices[0].channel).toBe('PUBLICACAO_OFICIAL');
    expect(component.notices[1].status).toBe('DESISTENTE');
  });

  it('drives possession scheduling through terminal states', () => {
    const component = new RecrutamentoPosse();

    component.schedule();
    expect(component.agenda).toHaveLength(1);

    component.nomeacaoId = '00000000-0000-4000-8000-000000000503';
    component.lotacaoId = 'lotacao-1';
    component.schedule();
    const scheduled = component.agenda[0];
    component.markPossession(scheduled);
    component.startExercise(scheduled);

    expect(scheduled.status).toBe('EXERCICIO');
    expect(scheduled.employeeRegistration).toBe('REC-00000000');

    const prorogued = component.agenda[1];
    component.prorogue(prorogued);
    component.reason = 'candidate withdrew';
    component.cancel(prorogued);

    expect(prorogued.status).toBe('CANCELADA');
  });

  it('accepts and rejects online proof sessions', () => {
    const component = new RecrutamentoProvaOnlineReview();

    component.accept();
    expect(component.events.every((event) => event.decision === 'ACCEPT')).toBe(true);

    component.voidReason = 'screen share lost';
    component.voidSession();

    expect(component.decision).toBe('REJECT');
    expect(component.events.every((event) => event.decision === 'REJECT')).toBe(true);
  });
});
