import { describe, expect, it } from 'vitest';
import { ALL_QUESTIONS, MODULES, QUESTIONNAIRE, SCENARIOS } from '../data/questionnaire.v2026';

/** AC-14 공식 문항과 선택지 데이터가 부록의 개수와 일치하는지 감시한다. */
const EXPECTED_COUNTS: Record<string, number> = {
  SUPPORT: 9,
  GENERAL: 35,
  CANCER: 15,
  ORAL: 15,
  OLDER: 10,
  KDSQ: 15,
  PHQ9: 9,
  CAPE15: 15,
  LIFESTYLE: 8,
};

describe('문항 데이터 스냅샷', () => {
  it('모듈별 문항 수가 부록과 일치한다', () => {
    const actual = Object.fromEntries(MODULES.map((module) => [module.moduleId, module.questions.length]));
    expect(actual).toEqual(EXPECTED_COUNTS);
  });

  it('전체 문항 수는 131개다', () => {
    expect(ALL_QUESTIONS.length).toBe(131);
  });

  it('문항 ID 는 중복되지 않는다', () => {
    const ids = ALL_QUESTIONS.map((question) => question.questionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 문항에 공식문구가 있다', () => {
    expect(ALL_QUESTIONS.filter((question) => question.officialText.trim() === '')).toEqual([]);
  });

  it('검증형 척도는 쉬운 설명을 노출하지 않는다', () => {
    const instruments = ALL_QUESTIONS.filter((question) =>
      ['KDSQ', 'PHQ9', 'CAPE15'].includes(question.moduleId),
    );
    expect(instruments.filter((question) => question.easyText !== undefined)).toEqual([]);
    expect(instruments.length).toBe(39);
  });

  it('선택형 문항에는 선택지가 있다', () => {
    const broken = ALL_QUESTIONS.filter(
      (question) =>
        (question.type === 'single_choice' || question.type === 'multi_choice') &&
        (question.options?.length ?? 0) === 0,
    );
    expect(broken).toEqual([]);
  });

  it('PHQ-9 과 KDSQ-C 선택지에는 공식 점수가 매겨져 있다', () => {
    const scored = ALL_QUESTIONS.filter((question) => ['PHQ9', 'KDSQ'].includes(question.moduleId));
    for (const question of scored) {
      expect(question.options?.every((option) => typeof option.score === 'number')).toBe(true);
    }
  });

  it('서식 버전과 시나리오 4종이 정의되어 있다', () => {
    expect(QUESTIONNAIRE.officialVersion).toBe('2026 성인 국가건강검진 사전문진 데모 v1.0');
    expect(SCENARIOS.map((scenario) => scenario.scenarioId)).toEqual(['A', 'B', 'C', 'D']);
  });
});
