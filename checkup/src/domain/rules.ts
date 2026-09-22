import type { Answer, AnswerMap, MatrixRowDef, QuestionDefinition, Rule, SessionContext } from './types';

export interface EvaluationContext {
  session: SessionContext;
  answers: AnswerMap;
}

/** 선택형 응답에서 선택된 값 목록을 뽑는다. 다른 유형이면 빈 배열이다. */
export function selectedValues(answer: Answer | undefined): string[] {
  if (!answer) return [];
  switch (answer.kind) {
    case 'choice':
      return [answer.value];
    case 'choices':
      return answer.values;
    case 'matrix':
      return answer.exclusive ? [answer.exclusive] : [];
    default:
      return [];
  }
}

/** 값이 입력되어 있는가(유효성까지 보지는 않는다). */
export function hasValue(answer: Answer | undefined): boolean {
  if (!answer) return false;
  switch (answer.kind) {
    case 'choice':
      return answer.value !== '';
    case 'choices':
      return answer.values.length > 0;
    case 'numbers':
      return Object.keys(answer.values).length > 0;
    case 'duration':
      return Number.isFinite(answer.hours) || Number.isFinite(answer.minutes);
    case 'matrix':
      return Boolean(answer.exclusive) || Object.keys(answer.rows).length > 0;
    case 'text':
      return answer.value.trim().length > 0;
    case 'scale':
      return Number.isFinite(answer.value);
  }
}

/** 순수함수 규칙 평가기. UI 상태를 참조하지 않는다. */
export function evaluateRule(rule: Rule | undefined, context: EvaluationContext): boolean {
  if (!rule) return true;
  switch (rule.type) {
    case 'always':
      return true;
    case 'flag':
      return context.session.scenario.flags[rule.flag] === true;
    case 'exam':
      return rule.exams.some((exam) => context.session.scenario.eligibleExams.includes(exam));
    case 'answerEquals':
      return selectedValues(context.answers[rule.questionId]).includes(rule.value);
    case 'answerIn':
      return selectedValues(context.answers[rule.questionId]).some((value) => rule.values.includes(value));
    case 'answerNotIn': {
      const values = selectedValues(context.answers[rule.questionId]);
      if (values.length === 0) return false;
      return values.every((value) => !rule.values.includes(value));
    }
    case 'answered':
      return hasValue(context.answers[rule.questionId]);
    case 'all':
      return rule.rules.every((child) => evaluateRule(child, context));
    case 'any':
      return rule.rules.some((child) => evaluateRule(child, context));
    case 'not':
      return !evaluateRule(rule.rule, context);
  }
}

/** 행렬형 문항에서 지금 보여야 하는 행만 남긴다. */
export function visibleMatrixRows(
  question: QuestionDefinition,
  answer: Answer | undefined,
  context: EvaluationContext,
): MatrixRowDef[] {
  const matrix = question.matrix;
  if (!matrix) return [];
  const rows = answer && answer.kind === 'matrix' ? answer.rows : {};
  return matrix.rows.filter((row) => {
    if (row.eligibility && !evaluateRule(row.eligibility, context)) return false;
    if (row.visibleWhen) {
      const source = rows[row.visibleWhen.row];
      const choice = source?.choice;
      if (!choice) return false;
      if (row.visibleWhen.notIn.includes(choice)) return false;
    }
    return true;
  });
}
