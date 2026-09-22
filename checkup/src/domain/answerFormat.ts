import type { Answer, QuestionDefinition } from './types';

function labelOf(question: QuestionDefinition, value: string): string {
  return question.options?.find((option) => option.value === value)?.label ?? value;
}

/** 검토·확인표 화면에 보여줄 사람이 읽는 답변 문장을 만든다. */
export function formatAnswer(question: QuestionDefinition, answer: Answer | undefined): string {
  if (!answer) return '아직 답하지 않음';

  switch (answer.kind) {
    case 'choice': {
      const option = question.options?.find((item) => item.value === answer.value);
      const parts: string[] = [option?.label ?? answer.value];
      if (option?.numberField) {
        const value = answer.numbers?.[option.numberField.key];
        if (value !== undefined) parts.push(`${value}${option.numberField.unit}`);
      }
      if (option?.textField && answer.text) parts.push(`(${answer.text})`);
      return parts.join(' ');
    }

    case 'choices':
      return answer.values.map((value) => labelOf(question, value)).join(', ');

    case 'numbers':
      return (question.numberFields ?? [])
        .map((field) => {
          const value = answer.values[field.key];
          return value === undefined ? `${field.label} 미입력` : `${field.label} ${value}${field.unit}`;
        })
        .join(' · ');

    case 'duration':
      return `${answer.hours}시간 ${answer.minutes}분`;

    case 'text':
      return answer.value.trim() === '' ? '작성하지 않음' : answer.value;

    case 'scale':
      return `${answer.value}점`;

    case 'matrix': {
      const matrix = question.matrix;
      if (answer.exclusive) {
        const option = matrix?.exclusiveOptions?.find((item) => item.value === answer.exclusive);
        return option?.label ?? answer.exclusive;
      }
      const parts = (matrix?.rows ?? [])
        .map((row) => {
          const cell = answer.rows[row.key];
          if (!cell) return undefined;
          if (matrix?.mode === 'choice') {
            const options = row.options ?? question.options ?? [];
            const label = options.find((option) => option.value === cell.choice)?.label;
            return label ? `${row.label}: ${label}` : undefined;
          }
          if (matrix?.mode === 'checks') {
            const labels = (cell.checks ?? [])
              .map((value) => matrix.columns?.find((column) => column.value === value)?.label ?? value)
              .join(', ');
            return labels ? `${row.label}: ${labels}` : undefined;
          }
          if (matrix?.mode === 'amount') {
            if (cell.amount === undefined) return undefined;
            const unit = matrix.units?.find((item) => item.value === cell.unit)?.label ?? '';
            return `${row.label}: ${cell.amount}${unit}`;
          }
          return undefined;
        })
        .filter((item): item is string => Boolean(item));
      return parts.length === 0 ? '아직 답하지 않음' : parts.join(' · ');
    }
  }
}
