import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/questionnaire.v2026';
import {
  buildContext,
  computeProgress,
  findIncompleteQuestions,
  findQuestion,
  findUnknownQuestions,
} from '../domain/questionnaireEngine';
import { hasOfficialUnknown, supportsUnknownFlag } from '../domain/unknown';
import type { SessionContext } from '../domain/types';

const scenarioB = SCENARIOS.find((item) => item.scenarioId === 'B')!;
const session: SessionContext = { scenario: scenarioB, proxyWriting: false, preferredCommunication: [] };

describe('공식 모름이 있는 문항 구분', () => {
  it('가족력·B형간염·구강 문항은 공식 응답에 모름이 있다', () => {
    for (const id of ['GEN-FH-01', 'GEN-HBV-01', 'ORAL-02', 'CA-FEM-14']) {
      expect(hasOfficialUnknown(findQuestion(id)!)).toBe(true);
      expect(supportsUnknownFlag(findQuestion(id)!)).toBe(false);
    }
  });

  it('암 가족력 행렬은 배타 선택지에 모름이 있다', () => {
    expect(hasOfficialUnknown(findQuestion('CA-COM-03')!)).toBe(true);
  });

  it('예·아니요만 있는 문항에는 모름 표시 버튼을 제공한다', () => {
    for (const id of ['SUP-01', 'GEN-SMK-01', 'ORAL-04', 'OLD-09']) {
      expect(hasOfficialUnknown(findQuestion(id)!)).toBe(false);
      expect(supportsUnknownFlag(findQuestion(id)!)).toBe(true);
    }
  });

  it('선택 문항인 자유입력에는 모름 표시를 제공하지 않는다', () => {
    expect(supportsUnknownFlag(findQuestion('ORAL-15')!)).toBe(false);
  });
});

describe('모름 표시의 효과', () => {
  it('모름으로 표시하면 미응답 목록에서 빠지고 완료를 막지 않는다', () => {
    const context = buildContext(session, {});
    const before = findIncompleteQuestions(context).map((q) => q.questionId);
    expect(before).toContain('SUP-01');

    const after = findIncompleteQuestions(context, { 'SUP-01': true }).map((q) => q.questionId);
    expect(after).not.toContain('SUP-01');
  });

  it('모름으로 표시한 문항은 의료진 확인 목록에 남는다', () => {
    const context = buildContext(session, {});
    const unknown = findUnknownQuestions(context, { 'SUP-01': true, 'GEN-SMK-01': true });
    expect(unknown.map((q) => q.questionId).sort()).toEqual(['GEN-SMK-01', 'SUP-01']);
  });

  it('모름 표시는 값을 만들지 않으므로 답변 맵은 비어 있다', () => {
    const context = buildContext(session, {});
    expect(context.answers['SUP-01']).toBeUndefined();
    expect(findUnknownQuestions(context, { 'SUP-01': true })).toHaveLength(1);
  });

  it('진행률은 모름 표시도 처리된 문항으로 센다', () => {
    const context = buildContext(session, {});
    expect(computeProgress(context).requiredAnswered).toBe(0);
    expect(computeProgress(context, { 'SUP-01': true, 'SUP-04': true }).requiredAnswered).toBe(2);
  });
});
