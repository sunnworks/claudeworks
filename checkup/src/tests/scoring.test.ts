import { describe, expect, it } from 'vitest';
import { isSelfHarmResponse, scoreCape15, scoreKdsqC, scorePhq9 } from '../domain/scoring';
import type { Answer, AnswerMap } from '../domain/types';

const choice = (value: string): Answer => ({ kind: 'choice', value });
const capeAnswer = (frequency: string, distress?: string): Answer => ({
  kind: 'matrix',
  rows: distress ? { frequency: { choice: frequency }, distress: { choice: distress } } : { frequency: { choice: frequency } },
});

function phq9(values: string[]): AnswerMap {
  return Object.fromEntries(values.map((value, index) => [`PHQ9-${String(index + 1).padStart(2, '0')}`, choice(value)]));
}

function kdsq(values: string[]): AnswerMap {
  return Object.fromEntries(values.map((value, index) => [`KDSQ-${String(index + 1).padStart(2, '0')}`, choice(value)]));
}

function cape(rows: Array<[string, string?]>): AnswerMap {
  return Object.fromEntries(
    rows.map(([frequency, distress], index) => [`CAPE-${String(index + 1).padStart(2, '0')}`, capeAnswer(frequency, distress)]),
  );
}

describe('PHQ-9 점수와 플래그', () => {
  it('모두 전혀 아니다이면 0점이고 플래그가 없다', () => {
    const score = scorePhq9(phq9(Array(9).fill('NONE')));
    expect(score.total).toBe(0);
    expect(score.complete).toBe(true);
    expect(score.medicalReview).toBe(false);
  });

  it('모두 거의 매일이면 최고점 27점이다', () => {
    const score = scorePhq9(phq9(Array(9).fill('NEARLY_EVERY_DAY')));
    expect(score.total).toBe(27);
    expect(score.maxTotal).toBe(27);
  });

  it('총점 9점은 플래그가 없고 10점은 플래그가 생긴다', () => {
    const nine = phq9(['NEARLY_EVERY_DAY', 'NEARLY_EVERY_DAY', 'NEARLY_EVERY_DAY', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE']);
    expect(scorePhq9(nine).total).toBe(9);
    expect(scorePhq9(nine).medicalReview).toBe(false);

    const ten = phq9(['NEARLY_EVERY_DAY', 'NEARLY_EVERY_DAY', 'NEARLY_EVERY_DAY', 'SEVERAL_DAYS', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE']);
    expect(scorePhq9(ten).total).toBe(10);
    expect(scorePhq9(ten).medicalReview).toBe(true);
    expect(scorePhq9(ten).reasons).toContain('총점 10점 이상');
  });

  it('9번 문항 1점이면 총점이 낮아도 플래그와 안전안내 조건이 된다', () => {
    const answers = phq9([...Array(8).fill('NONE'), 'SEVERAL_DAYS']);
    const score = scorePhq9(answers);
    expect(score.total).toBe(1);
    expect(score.selfHarmScore).toBe(1);
    expect(score.medicalReview).toBe(true);
    expect(score.reasons).toContain('9번 문항 1점 이상');
    expect(isSelfHarmResponse(answers)).toBe(true);
  });

  it('9번 문항이 전혀 아니다이면 안전안내 조건이 아니다', () => {
    expect(isSelfHarmResponse(phq9(Array(9).fill('NONE')))).toBe(false);
  });

  it('일부만 답하면 complete 가 false 다', () => {
    expect(scorePhq9(phq9(Array(8).fill('NONE'))).complete).toBe(false);
  });
});

describe('CAPE-15 점수와 플래그', () => {
  it('모두 없음이면 0점이고 고통도 0점이다', () => {
    const score = scoreCape15(cape(Array(15).fill(['NEVER'])));
    expect(score.frequencyTotal).toBe(0);
    expect(score.distressTotal).toBe(0);
    expect(score.complete).toBe(true);
    expect(score.medicalReview).toBe(false);
  });

  it('모두 거의 항상·매우이면 각각 45점이다', () => {
    const score = scoreCape15(cape(Array(15).fill(['ALMOST_ALWAYS', 'VERY'])));
    expect(score.frequencyTotal).toBe(45);
    expect(score.distressTotal).toBe(45);
    expect(score.maxTotal).toBe(45);
  });

  it('빈도 총점 5점은 플래그가 없고 6점이면 플래그가 생긴다', () => {
    const five = cape([...Array(5).fill(['SOMETIMES', 'NONE']), ...Array(10).fill(['NEVER'])]);
    expect(scoreCape15(five).frequencyTotal).toBe(5);
    expect(scoreCape15(five).medicalReview).toBe(false);

    const six = cape([...Array(6).fill(['SOMETIMES', 'NONE']), ...Array(9).fill(['NEVER'])]);
    expect(scoreCape15(six).frequencyTotal).toBe(6);
    expect(scoreCape15(six).medicalReview).toBe(true);
    expect(scoreCape15(six).reasons).toContain('빈도 총점 6점 이상');
  });

  it('고통 총점만 6점 이상이어도 플래그가 생긴다', () => {
    const answers = cape([...Array(3).fill(['SOMETIMES', 'QUITE']), ...Array(12).fill(['NEVER'])]);
    const score = scoreCape15(answers);
    expect(score.frequencyTotal).toBe(3);
    expect(score.distressTotal).toBe(6);
    expect(score.medicalReview).toBe(true);
    expect(score.reasons).toContain('고통 총점 6점 이상');
  });

  it('빈도가 없음이면 고통을 묻지 않아도 완료로 계산한다', () => {
    const score = scoreCape15(cape(Array(15).fill(['NEVER'])));
    expect(score.complete).toBe(true);
  });

  it('빈도만 답하고 고통을 비우면 완료가 아니다', () => {
    const score = scoreCape15(cape([['SOMETIMES'], ...Array(14).fill(['NEVER'])]));
    expect(score.complete).toBe(false);
  });
});

describe('KDSQ-C 점수와 플래그', () => {
  it('모두 아니다이면 0점이다', () => {
    const score = scoreKdsqC(kdsq(Array(15).fill('NO')));
    expect(score.total).toBe(0);
    expect(score.complete).toBe(true);
    expect(score.medicalReview).toBe(false);
  });

  it('모두 자주·많이 그렇다이면 30점이다', () => {
    const score = scoreKdsqC(kdsq(Array(15).fill('OFTEN')));
    expect(score.total).toBe(30);
    expect(score.maxTotal).toBe(30);
  });

  it('총점 5점은 플래그가 없고 6점이면 플래그가 생긴다', () => {
    const five = kdsq([...Array(5).fill('SOMETIMES'), ...Array(10).fill('NO')]);
    expect(scoreKdsqC(five).total).toBe(5);
    expect(scoreKdsqC(five).medicalReview).toBe(false);

    const six = kdsq([...Array(3).fill('OFTEN'), ...Array(12).fill('NO')]);
    expect(scoreKdsqC(six).total).toBe(6);
    expect(scoreKdsqC(six).medicalReview).toBe(true);
  });
});
