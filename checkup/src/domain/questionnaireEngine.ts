import { QUESTIONNAIRE } from '../data/questionnaire.v2026';
import { evaluateRule, visibleMatrixRows, type EvaluationContext } from './rules';
import { validateAnswer } from './validation';
import type { UnknownFlags } from './unknown';
import type {
  AnswerMap,
  ModuleDefinition,
  QuestionDefinition,
  QuestionnaireDefinition,
  SessionContext,
} from './types';

export interface ProgressInfo {
  /** 현재 분기에서 답해야 하는 필수문항 수 */
  requiredTotal: number;
  /** 그중 유효하게 답한 수 */
  requiredAnswered: number;
  percent: number;
}

export function buildContext(session: SessionContext, answers: AnswerMap): EvaluationContext {
  return { session, answers };
}

/** 시나리오 자격정보로 적용 모듈을 고른다. */
export function selectModules(
  session: SessionContext,
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): ModuleDefinition[] {
  const context = buildContext(session, {});
  return definition.modules.filter((module) => evaluateRule(module.eligibility, context));
}

/** 현재 답변 기준으로 보여야 하는 문항을 모듈 순서대로 나열한다. */
export function visibleQuestions(
  context: EvaluationContext,
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): QuestionDefinition[] {
  return selectModules(context.session, definition)
    .flatMap((module) => module.questions)
    .filter((question) => evaluateRule(question.eligibility, context));
}

export function visibleQuestionsOfModule(
  moduleId: string,
  context: EvaluationContext,
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): QuestionDefinition[] {
  return visibleQuestions(context, definition).filter((question) => question.moduleId === moduleId);
}

/**
 * 선행 답변이 바뀌어 더 이상 대상이 아닌 하위문항의 답변을 폐기한다.
 * 보이지 않게 된 행렬 행의 칸도 함께 비운다.
 * 규칙 변경이 연쇄될 수 있으므로 변화가 없을 때까지 반복한다.
 */
export function pruneOrphanAnswers(
  session: SessionContext,
  answers: AnswerMap,
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): { answers: AnswerMap; removedQuestionIds: string[] } {
  let current: AnswerMap = { ...answers };
  const removed = new Set<string>();

  for (let pass = 0; pass < 10; pass += 1) {
    const context = buildContext(session, current);
    const visibleIds = new Set(visibleQuestions(context, definition).map((question) => question.questionId));
    const next: AnswerMap = {};
    let changed = false;

    for (const [questionId, answer] of Object.entries(current)) {
      if (answer === undefined) continue;
      if (!visibleIds.has(questionId)) {
        removed.add(questionId);
        changed = true;
        continue;
      }
      next[questionId] = answer;
    }

    // 행렬 문항: 보이지 않는 행의 값 제거
    for (const question of definition.modules.flatMap((module) => module.questions)) {
      const answer = next[question.questionId];
      if (!answer || answer.kind !== 'matrix' || !question.matrix) continue;
      const allowed = new Set(visibleMatrixRows(question, answer, buildContext(session, next)).map((row) => row.key));
      const rows = Object.fromEntries(Object.entries(answer.rows).filter(([key]) => allowed.has(key)));
      if (Object.keys(rows).length !== Object.keys(answer.rows).length) {
        next[question.questionId] = { ...answer, rows };
        changed = true;
      }
    }

    current = next;
    if (!changed) break;
  }

  return { answers: current, removedQuestionIds: [...removed] };
}

/**
 * 진행률은 고정 문항수가 아니라 현재 분기의 필수문항 수로 계산한다.
 * '모름'으로 표시한 문항은 사용자가 판단을 끝낸 문항이므로 처리된 것으로 센다.
 */
export function computeProgress(
  context: EvaluationContext,
  unknownFlags: UnknownFlags = {},
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): ProgressInfo {
  const questions = visibleQuestions(context, definition).filter((question) => question.required);
  const answered = questions.filter(
    (question) =>
      unknownFlags[question.questionId] === true ||
      validateAnswer(question, context.answers[question.questionId], context).complete,
  ).length;
  const total = questions.length;
  return {
    requiredTotal: total,
    requiredAnswered: answered,
    percent: total === 0 ? 0 : Math.round((answered / total) * 100),
  };
}

/**
 * 완료 전 재검증. 답도 없고 모름 표시도 없는 문항을 돌려준다.
 * 모름으로 표시한 문항은 값 없이 '의료진 확인 요청'으로 남고 완료를 막지 않는다.
 */
export function findIncompleteQuestions(
  context: EvaluationContext,
  unknownFlags: UnknownFlags = {},
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): QuestionDefinition[] {
  return visibleQuestions(context, definition).filter(
    (question) =>
      unknownFlags[question.questionId] !== true &&
      !validateAnswer(question, context.answers[question.questionId], context).complete,
  );
}

/** 모름으로 표시해 의료진 확인이 필요한 문항 */
export function findUnknownQuestions(
  context: EvaluationContext,
  unknownFlags: UnknownFlags,
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): QuestionDefinition[] {
  return visibleQuestions(context, definition).filter((question) => unknownFlags[question.questionId] === true);
}

export function findQuestion(
  questionId: string,
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): QuestionDefinition | undefined {
  return definition.modules.flatMap((module) => module.questions).find((q) => q.questionId === questionId);
}

export function findModule(
  moduleId: string,
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): ModuleDefinition | undefined {
  return definition.modules.find((module) => module.moduleId === moduleId);
}

/** 현재 문항 다음/이전으로 이동할 문항 ID. 없으면 undefined. */
export function neighbourQuestionId(
  questionId: string,
  direction: 1 | -1,
  context: EvaluationContext,
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): string | undefined {
  const questions = visibleQuestions(context, definition);
  const index = questions.findIndex((question) => question.questionId === questionId);
  if (index === -1) return questions[0]?.questionId;
  return questions[index + direction]?.questionId;
}

export function questionPosition(
  questionId: string,
  context: EvaluationContext,
  definition: QuestionnaireDefinition = QUESTIONNAIRE,
): { index: number; total: number } {
  const questions = visibleQuestions(context, definition);
  return {
    index: questions.findIndex((question) => question.questionId === questionId),
    total: questions.length,
  };
}
