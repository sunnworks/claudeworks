import type { Answer, QuestionDefinition } from '../../domain/types';
import { SignButton } from '../SignButton';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
}

export function MultiChoiceInput({ question, answer, onChange }: Props) {
  const values = answer && answer.kind === 'choices' ? answer.values : [];

  const toggle = (value: string, exclusive: boolean) => {
    if (exclusive) {
      onChange(values.includes(value) ? undefined : { kind: 'choices', values: [value] });
      return;
    }
    const exclusiveValues = (question.options ?? []).filter((o) => o.exclusive).map((o) => o.value);
    const base = values.filter((item) => !exclusiveValues.includes(item));
    const next = base.includes(value) ? base.filter((item) => item !== value) : [...base, value];
    onChange(next.length === 0 ? undefined : { kind: 'choices', values: next });
  };

  return (
    <div className="options" role="group" aria-labelledby={`${question.questionId}-label`}>
      {(question.options ?? []).map((option) => {
        const selected = values.includes(option.value);
        const inputId = `${question.questionId}-${option.value}`;
        return (
          <div key={option.value} className="option-row">
          <label className={`option${selected ? ' option--selected' : ''}`} htmlFor={inputId}>
            <input
              id={inputId}
              type="checkbox"
              checked={selected}
              onChange={() => toggle(option.value, Boolean(option.exclusive))}
            />
            <span className="option__body">
              {option.label}
              {selected && (
                <span className="option__mark" aria-hidden="true">
                  ✔ 선택함
                </span>
              )}
              {option.hint && <span className="option__hint">{option.hint}</span>}
            </span>
          </label>
          <SignButton label={option.label} className="sign-btn" />
          </div>
        );
      })}
    </div>
  );
}
