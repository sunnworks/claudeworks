import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/questionnaire.v2026';
import {
  buildContext,
  computeProgress,
  findIncompleteQuestions,
  neighbourQuestionId,
  pruneOrphanAnswers,
  selectModules,
  visibleQuestions,
} from '../domain/questionnaireEngine';
import type { AnswerMap, Answer, ScenarioDefinition, SessionContext } from '../domain/types';

const scenario = (id: 'A' | 'B' | 'C' | 'D'): ScenarioDefinition =>
  SCENARIOS.find((item) => item.scenarioId === id)!;

const session = (id: 'A' | 'B' | 'C' | 'D'): SessionContext => ({
  scenario: scenario(id),
  proxyWriting: scenario(id).defaultProxyWriting,
  preferredCommunication: [],
});

const choice = (value: string): Answer => ({ kind: 'choice', value });
const ids = (answers: AnswerMap, id: 'A' | 'B' | 'C' | 'D') =>
  visibleQuestions(buildContext(session(id), answers)).map((question) => question.questionId);

describe('AC-01 시나리오별 모듈 조립', () => {
  it('A 45세 남성은 지원·일반·암검진 모듈을 받는다', () => {
    expect(selectModules(session('A')).map((module) => module.moduleId)).toEqual(['SUPPORT', 'GENERAL', 'CANCER']);
  });

  it('B 50세 여성은 구강검진이 추가된다', () => {
    expect(selectModules(session('B')).map((module) => module.moduleId)).toEqual([
      'SUPPORT',
      'GENERAL',
      'CANCER',
      'ORAL',
    ]);
  });

  it('C 28세 성인은 PHQ-9 와 CAPE-15 를 받고 암검진은 받지 않는다', () => {
    expect(selectModules(session('C')).map((module) => module.moduleId)).toEqual([
      'SUPPORT',
      'GENERAL',
      'PHQ9',
      'CAPE15',
    ]);
  });

  it('D 70세 성인은 노인기능과 KDSQ-C 를 받는다', () => {
    expect(selectModules(session('D')).map((module) => module.moduleId)).toEqual([
      'SUPPORT',
      'GENERAL',
      'OLDER',
      'KDSQ',
    ]);
  });

  it('생활습관 후속평가는 기본으로 포함되지 않는다', () => {
    for (const id of ['A', 'B', 'C', 'D'] as const) {
      expect(selectModules(session(id)).map((module) => module.moduleId)).not.toContain('LIFESTYLE');
    }
  });
});

describe('AC-03 분기 규칙', () => {
  it('조력인 동행이 아니요이면 SUP-02·SUP-03 이 나오지 않는다', () => {
    expect(ids({ 'SUP-01': choice('N') }, 'A')).not.toContain('SUP-02');
    expect(ids({ 'SUP-01': choice('Y') }, 'A')).toContain('SUP-03');
  });

  it('평생 5갑 미만이면 흡연 하위문항이 나오지 않는다', () => {
    const list = ids({ 'GEN-SMK-01': choice('N') }, 'A');
    expect(list).not.toContain('GEN-SMK-02');
    expect(list).not.toContain('GEN-SMK-03');
    expect(list).toContain('GEN-HTP-01');
  });

  it('현재 흡연이면 기간·개비 문항이 나오고 금연기간 문항은 나오지 않는다', () => {
    const list = ids({ 'GEN-SMK-01': choice('Y'), 'GEN-SMK-02': choice('CURRENT') }, 'A');
    expect(list).toContain('GEN-SMK-03');
    expect(list).not.toContain('GEN-SMK-04');
  });

  it('과거 흡연이면 금연기간 문항이 나온다', () => {
    const list = ids({ 'GEN-SMK-01': choice('Y'), 'GEN-SMK-02': choice('FORMER') }, 'A');
    expect(list).toContain('GEN-SMK-04');
  });

  it('술을 마시지 않으면 음주량 문항이 나오지 않는다', () => {
    expect(ids({ 'GEN-ALC-01': choice('NONE') }, 'A')).not.toContain('GEN-ALC-02');
    expect(ids({ 'GEN-ALC-01': choice('WEEK') }, 'A')).toContain('GEN-ALC-02');
  });

  it('고강도 신체활동이 없음이면 시간 문항이 나오지 않는다', () => {
    expect(ids({ 'GEN-PA-01': choice('NONE') }, 'A')).not.toContain('GEN-PA-02');
    expect(ids({ 'GEN-PA-01': choice('D3') }, 'A')).toContain('GEN-PA-02');
  });

  it('암검진은 지정된 암종 문항만 나온다', () => {
    const listA = ids({}, 'A');
    expect(listA).toContain('CA-GAS-05');
    expect(listA).toContain('CA-LIV-07');
    expect(listA).not.toContain('CA-COL-06');
    expect(listA).not.toContain('CA-FEM-09');

    const listB = ids({}, 'B');
    expect(listB).toContain('CA-COL-06');
    expect(listB).toContain('CA-FEM-09');
    expect(listB).toContain('CA-FEM-11');
    expect(listB).not.toContain('CA-LIV-07');
  });
});

describe('AC-04 비대상 하위답변 폐기', () => {
  it('선행 답변을 바꾸면 하위 답변이 삭제되고 목록으로 알려 준다', () => {
    const answers: AnswerMap = {
      'GEN-SMK-01': choice('Y'),
      'GEN-SMK-02': choice('FORMER'),
      'GEN-SMK-03': { kind: 'numbers', values: { years: 10, perDay: 10 } },
      'GEN-SMK-04': { kind: 'numbers', values: { years: 3 } },
    };
    const changed: AnswerMap = { ...answers, 'GEN-SMK-01': choice('N') };
    const result = pruneOrphanAnswers(session('A'), changed);
    expect(result.removedQuestionIds.sort()).toEqual(['GEN-SMK-02', 'GEN-SMK-03', 'GEN-SMK-04']);
    expect(result.answers['GEN-SMK-01']).toEqual(choice('N'));
  });

  it('CAPE-15 빈도를 없음으로 바꾸면 고통 응답이 지워진다', () => {
    const answers: AnswerMap = {
      'CAPE-01': { kind: 'matrix', rows: { frequency: { choice: 'NEVER' }, distress: { choice: 'VERY' } } },
    };
    const result = pruneOrphanAnswers(session('C'), answers);
    const answer = result.answers['CAPE-01'];
    expect(answer?.kind).toBe('matrix');
    if (answer?.kind === 'matrix') {
      expect(answer.rows.distress).toBeUndefined();
      expect(answer.rows.frequency?.choice).toBe('NEVER');
    }
  });
});

describe('AC-02 · AC-05 진행률과 완료 조건', () => {
  it('진행률은 현재 분기의 필수문항 수로 계산한다', () => {
    const noSmoking = buildContext(session('A'), { 'GEN-SMK-01': choice('N') });
    const smoking = buildContext(session('A'), { 'GEN-SMK-01': choice('Y') });
    expect(computeProgress(smoking).requiredTotal).toBeGreaterThan(computeProgress(noSmoking).requiredTotal);
    expect(computeProgress(noSmoking).requiredAnswered).toBe(1);
  });

  it('필수문항이 남아 있으면 완료할 수 없다', () => {
    const context = buildContext(session('A'), {});
    expect(findIncompleteQuestions(context).length).toBeGreaterThan(0);
  });

  it('필수가 아닌 문항은 비워도 완료를 막지 않는다', () => {
    const context = buildContext(session('B'), {});
    const incomplete = findIncompleteQuestions(context).map((question) => question.questionId);
    expect(incomplete).not.toContain('ORAL-15');
  });
});

describe('문항 이동', () => {
  it('다음·이전 문항은 현재 분기 순서를 따른다', () => {
    const context = buildContext(session('A'), { 'SUP-01': choice('N') });
    expect(neighbourQuestionId('SUP-01', 1, context)).toBe('SUP-04');
    expect(neighbourQuestionId('SUP-04', -1, context)).toBe('SUP-01');
  });

  it('마지막 문항의 다음은 없다', () => {
    const context = buildContext(session('A'), {});
    const list = visibleQuestions(context);
    expect(neighbourQuestionId(list[list.length - 1].questionId, 1, context)).toBeUndefined();
  });
});
