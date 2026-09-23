import type { QuestionDefinition } from './types';

/** 공식 응답값에 들어 있는 '모름' 계열 값 */
const OFFICIAL_UNKNOWN_VALUES = ['UNKNOWN', 'DONT_KNOW', 'DONT_KNOW_ITEM'];

/**
 * 이 문항의 공식 응답에 '모름'이 있는가.
 *
 * 공식 응답에 모름이 있으면 그 선택지를 그대로 쓴다.
 * 없으면 임의로 모름을 만들지 않고, 별도의 '의료진 확인 요청' 상태로 분리한다(설계서 8).
 */
export function hasOfficialUnknown(question: QuestionDefinition): boolean {
  const inOptions = (question.options ?? []).some((option) => OFFICIAL_UNKNOWN_VALUES.includes(option.value));
  const inMatrix = (question.matrix?.exclusiveOptions ?? []).some((option) =>
    OFFICIAL_UNKNOWN_VALUES.includes(option.value),
  );
  const inMatrixRows = (question.matrix?.rows ?? []).some((row) =>
    (row.options ?? []).some((option) => OFFICIAL_UNKNOWN_VALUES.includes(option.value)),
  );
  return inOptions || inMatrix || inMatrixRows;
}

/** 모름 표시를 제공할 문항인가. 공식 모름이 없고, 자유입력이 아닌 문항에만 제공한다. */
export function supportsUnknownFlag(question: QuestionDefinition): boolean {
  if (question.type === 'text') return false;
  if (!question.required) return false;
  return !hasOfficialUnknown(question);
}

export type UnknownFlags = Record<string, boolean>;

import { visibleQuestions } from './questionnaireEngine';
import type { EvaluationContext } from './rules';

/**
 * 묶음 일괄 '해당 없음'의 대상 문항.
 * 이미 답했거나 모름으로 표시한 문항은 덮어쓰지 않는다.
 */
export function bulkNoneTargets(
  context: EvaluationContext,
  group: string,
  unknownFlags: UnknownFlags,
): QuestionDefinition[] {
  return visibleQuestions(context)
    .filter((question) => question.bulkNoneGroup === group)
    .filter((question) => !context.answers[question.questionId] && !unknownFlags[question.questionId]);
}
