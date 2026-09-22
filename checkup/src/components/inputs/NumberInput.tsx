import type { Answer, QuestionDefinition } from '../../domain/types';
import { SignButton } from '../SignButton';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
}

export function NumberInput({ question, answer, onChange }: Props) {
  const values = answer && answer.kind === 'numbers' ? answer.values : {};

  const update = (key: string, raw: string) => {
    const next = { ...values };
    if (raw === '') delete next[key];
    else next[key] = Number(raw);
    onChange(Object.keys(next).length === 0 ? undefined : { kind: 'numbers', values: next });
  };

  return (
    <div>
      {(question.numberFields ?? []).map((field) => {
        const id = `${question.questionId}-${field.key}`;
        return (
          <div className="field" key={field.key}>
            <label className="field__label" htmlFor={id}>
              {field.label}
              <SignButton label={`${field.label} (단위 ${field.unit})`} className="sign-btn sign-btn--inline" />
            </label>
            <div className="field__row">
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                value={values[field.key] ?? ''}
                onChange={(event) => update(field.key, event.target.value)}
                aria-describedby={`${id}-hint`}
              />
              <span className="field__unit">{field.unit}</span>
            </div>
            <span className="field__hint" id={`${id}-hint`}>
              {field.min}{field.unit}부터 {field.max}{field.unit}까지 입력할 수 있습니다.
            </span>
          </div>
        );
      })}
    </div>
  );
}
