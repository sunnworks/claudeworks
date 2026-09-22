import { evaluateRule, hasValue, visibleMatrixRows, type EvaluationContext } from './rules';
import type { Answer, QuestionDefinition } from './types';

export interface ValidationResult {
  /** 필수 조건과 범위를 모두 만족하는가 */
  complete: boolean;
  errors: string[];
}

const OK: ValidationResult = { complete: true, errors: [] };

function fail(...errors: string[]): ValidationResult {
  return { complete: false, errors };
}

function checkNumber(value: number | undefined, label: string, unit: string, min: number, max: number): string[] {
  if (value === undefined || Number.isNaN(value)) return [`${label}을(를) 입력해 주세요.`];
  if (!Number.isInteger(value)) return [`${label}은(는) 정수로 입력해 주세요.`];
  if (value < min || value > max) return [`${label}은(는) ${min}${unit}부터 ${max}${unit} 사이로 입력해 주세요.`];
  return [];
}

/**
 * 문항 하나의 응답을 검증한다. 순수함수이며 화면 상태를 참조하지 않는다.
 * 선택형 문항의 부속 입력(숫자·자유입력)까지 함께 본다.
 */
export function validateAnswer(
  question: QuestionDefinition,
  answer: Answer | undefined,
  context: EvaluationContext,
): ValidationResult {
  if (!hasValue(answer)) {
    return question.required ? fail('답변이 필요한 문항입니다.') : OK;
  }
  const value = answer as Answer;

  switch (question.type) {
    case 'single_choice': {
      if (value.kind !== 'choice') return fail('응답 형식이 올바르지 않습니다.');
      const option = question.options?.find((item) => item.value === value.value);
      if (!option) return fail('선택지를 다시 선택해 주세요.');
      const errors: string[] = [];
      if (option.numberField) {
        const field = option.numberField;
        errors.push(...checkNumber(value.numbers?.[field.key], field.label, field.unit, field.min, field.max));
      }
      if (option.textField) {
        const text = value.text?.trim() ?? '';
        if (text.length === 0) errors.push(`${option.textField.label}을(를) 입력해 주세요.`);
        if (text.length > option.textField.maxLength) {
          errors.push(`${option.textField.label}은(는) ${option.textField.maxLength}자까지 입력할 수 있습니다.`);
        }
      }
      return errors.length ? { complete: false, errors } : OK;
    }

    case 'multi_choice': {
      if (value.kind !== 'choices') return fail('응답 형식이 올바르지 않습니다.');
      const exclusive = question.options?.filter((item) => item.exclusive).map((item) => item.value) ?? [];
      const hasExclusive = value.values.some((item) => exclusive.includes(item));
      const hasNormal = value.values.some((item) => !exclusive.includes(item));
      if (hasExclusive && hasNormal) {
        return fail('해당 없음과 다른 항목을 함께 선택할 수 없습니다.');
      }
      return OK;
    }

    case 'number': {
      if (value.kind !== 'numbers') return fail('응답 형식이 올바르지 않습니다.');
      const errors = (question.numberFields ?? []).flatMap((field) =>
        checkNumber(value.values[field.key], field.label, field.unit, field.min, field.max),
      );
      return errors.length ? { complete: false, errors } : OK;
    }

    case 'duration': {
      if (value.kind !== 'duration') return fail('응답 형식이 올바르지 않습니다.');
      const errors = [
        ...checkNumber(value.hours, '시간', '시간', 0, 24),
        ...checkNumber(value.minutes, '분', '분', 0, 59),
      ];
      if (errors.length === 0 && value.hours === 0 && value.minutes === 0) {
        errors.push('활동을 하는 날의 시간이므로 0시간 0분은 저장할 수 없습니다.');
      }
      return errors.length ? { complete: false, errors } : OK;
    }

    case 'text': {
      if (value.kind !== 'text') return fail('응답 형식이 올바르지 않습니다.');
      const max = question.textField?.maxLength ?? 500;
      if (value.value.length > max) return fail(`${max}자까지 입력할 수 있습니다.`);
      return OK;
    }

    case 'scale': {
      if (value.kind !== 'scale') return fail('응답 형식이 올바르지 않습니다.');
      const scale = question.scale;
      if (!scale) return OK;
      if (value.value < scale.min || value.value > scale.max) {
        return fail(`${scale.min}부터 ${scale.max} 사이에서 선택해 주세요.`);
      }
      return OK;
    }

    case 'matrix': {
      if (value.kind !== 'matrix') return fail('응답 형식이 올바르지 않습니다.');
      const matrix = question.matrix;
      if (!matrix) return OK;
      if (value.exclusive) return OK;
      const rows = visibleMatrixRows(question, value, context);
      const errors: string[] = [];

      if (matrix.mode === 'choice') {
        const unanswered = rows.filter((row) => !value.rows[row.key]?.choice);
        if (unanswered.length > 0) {
          errors.push(`${unanswered.map((row) => row.label).join(', ')} 항목을 선택해 주세요.`);
        }
      }

      if (matrix.mode === 'checks') {
        const checked = rows.some((row) => (value.rows[row.key]?.checks?.length ?? 0) > 0);
        if (!checked) errors.push('해당하는 항목을 선택하거나 없음·모름을 선택해 주세요.');
      }

      if (matrix.mode === 'amount') {
        const range = matrix.amount ?? { min: 0, max: 100 };
        let filled = 0;
        rows.forEach((row) => {
          const cell = value.rows[row.key];
          if (!cell || cell.amount === undefined) return;
          if (!Number.isInteger(cell.amount) || cell.amount < range.min || cell.amount > range.max) {
            errors.push(`${row.label} 수량은 ${range.min}부터 ${range.max} 사이의 정수로 입력해 주세요.`);
            return;
          }
          if (cell.amount > 0) {
            filled += 1;
            if (!cell.unit) errors.push(`${row.label}의 단위를 선택해 주세요.`);
          }
        });
        if (filled === 0) errors.push('한 가지 이상 마신 양을 입력해 주세요.');
      }

      return errors.length ? { complete: false, errors } : OK;
    }
  }
}

/** 문항이 현재 대상자에게 보여야 하는가 */
export function isQuestionVisible(question: QuestionDefinition, context: EvaluationContext): boolean {
  return evaluateRule(question.eligibility, context);
}
