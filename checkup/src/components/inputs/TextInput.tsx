import type { Answer, QuestionDefinition } from '../../domain/types';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
}

export function TextInput({ question, answer, onChange }: Props) {
  const field = question.textField;
  const value = answer && answer.kind === 'text' ? answer.value : '';
  const id = `${question.questionId}-text`;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {field?.label ?? '자유 입력'}
      </label>
      <textarea
        id={id}
        maxLength={field?.maxLength ?? 500}
        placeholder={field?.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value === '' ? undefined : { kind: 'text', value: event.target.value })}
        aria-describedby={`${id}-hint`}
      />
      <span className="field__hint" id={`${id}-hint`}>
        {value.length} / {field?.maxLength ?? 500}자
      </span>
    </div>
  );
}
