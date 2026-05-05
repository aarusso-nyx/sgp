import { ClassificacaoService } from './classificacao.service';
import type {
  ClassificationCandidateInput,
  ClassificationVagaInput,
} from './classificacao.service';
import { TEST_INSTANT_2026_05_02T00_00_00Z } from '../../../../tests/backend/helpers/date-fixtures';

const referenceDate = new Date(TEST_INSTANT_2026_05_02T00_00_00Z);
const vaga: ClassificationVagaInput = {
  vagaId: 'vaga-analista',
  totalSeats: 10,
  pcdSeats: 1,
  racialSeats: 2,
};

function classify(candidates: ClassificationCandidateInput[]) {
  return ClassificacaoService.buildGoldenClassification(
    candidates,
    [vaga],
    referenceDate,
  );
}

describe('ClassificacaoService golden ranking', () => {
  it('orders a fully tied score by age', () => {
    const result = classify([
      candidate('c3', '1985-01-01', { objetiva: 80 }),
      candidate('c1', '1970-01-01', { objetiva: 80 }),
      candidate('c2', '1980-01-01', { objetiva: 80 }),
    ]);

    expect(approvedIds(result)).toEqual(['c1', 'c2', 'c3']);
  });

  it('prioritizes elderly candidates only within score ties', () => {
    const result = classify([
      candidate('adult-high', '1980-01-01', { objetiva: 95 }),
      candidate('elder-tie', '1960-01-01', { objetiva: 90 }),
      candidate('adult-tie', '1985-01-01', { objetiva: 90 }),
    ]);

    expect(approvedIds(result)).toEqual([
      'adult-high',
      'elder-tie',
      'adult-tie',
    ]);
  });

  it('interleaves racial quota at the 3rd and 8th call positions and keeps PCD rank', () => {
    const result = classify([
      candidate('g1', '1990-01-01', { objetiva: 100 }),
      candidate('g2', '1990-01-01', { objetiva: 99 }),
      candidate('g3', '1990-01-01', { objetiva: 98 }),
      candidate('r1', '1990-01-01', { objetiva: 60 }, { racial: true }),
      candidate('g4', '1990-01-01', { objetiva: 97 }),
      candidate('g5', '1990-01-01', { objetiva: 96 }),
      candidate('pcd1', '1990-01-01', { objetiva: 40 }, { pcd: true }),
      candidate('g6', '1990-01-01', { objetiva: 95 }),
      candidate('r2', '1990-01-01', { objetiva: 50 }, { racial: true }),
      candidate('g7', '1990-01-01', { objetiva: 94 }),
    ]);

    const called = result
      .filter((item) => item.callOrder !== null)
      .sort((left, right) => (left.callOrder ?? 0) - (right.callOrder ?? 0));
    expect(called.map((item) => item.inscricaoId)).toEqual([
      'g1',
      'g2',
      'r1',
      'g3',
      'pcd1',
      'g4',
      'g5',
      'r2',
      'g6',
      'g7',
    ]);
    expect(
      called
        .filter((item) => item.allocationBucket === 'RACIAL')
        .map((item) => item.callOrder),
    ).toEqual([3, 8]);
    expect(result.find((item) => item.inscricaoId === 'pcd1')?.rankPcd).toBe(1);
  });

  it('keeps candidates below minimum score out of the general ranking', () => {
    const result = classify([
      candidate(
        'approved',
        '1990-01-01',
        { objetiva: 70 },
        {},
        { objetiva: 60 },
      ),
      candidate(
        'eliminated',
        '1990-01-01',
        { objetiva: 50 },
        {},
        { objetiva: 60 },
      ),
    ]);

    expect(approvedIds(result)).toEqual(['approved']);
    expect(
      result.find((item) => item.inscricaoId === 'eliminated'),
    ).toMatchObject({
      rankGeneral: null,
      eliminatedReason: 'BELOW_MINIMUM_PROVA_SCORE',
    });
  });

  it('eliminates candidates absent from a required prova', () => {
    const result = ClassificacaoService.buildGoldenClassification(
      [
        {
          ...candidate('approved', '1990-01-01', { objetiva: 80 }),
          requiredProvas: ['objetiva', 'titulos'],
          scores: { objetiva: 80, titulos: 10 },
        },
        {
          ...candidate('absent', '1990-01-01', { objetiva: 80 }),
          requiredProvas: ['objetiva', 'titulos'],
        },
      ],
      [vaga],
      referenceDate,
    );

    expect(approvedIds(result)).toEqual(['approved']);
    expect(result.find((item) => item.inscricaoId === 'absent')).toMatchObject({
      rankGeneral: null,
      eliminatedReason: 'MISSING_REQUIRED_PROVA',
    });
  });
});

function candidate(
  inscricaoId: string,
  birthDate: string,
  scores: Record<string, number>,
  quotas: ClassificationCandidateInput['quotas'] = {},
  minimumScores: Record<string, number> = {},
): ClassificationCandidateInput {
  return {
    inscricaoId,
    vagaId: vaga.vagaId,
    birthDate,
    scores,
    requiredProvas: Object.keys(scores),
    minimumScores,
    quotas,
  };
}

function approvedIds(result: ReturnType<typeof classify>): string[] {
  return result
    .filter((item) => item.eliminatedReason === null)
    .sort((left, right) => (left.rankGeneral ?? 0) - (right.rankGeneral ?? 0))
    .map((item) => item.inscricaoId);
}
