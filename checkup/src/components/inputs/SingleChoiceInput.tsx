import type { Answer, QuestionDefinition } from '../../domain/types';
import { SignButton } from '../SignButton';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
}

export function SingleChoiceInput({ question, answer, onChange }: Props) {
  const current = answer && answer.kind === 'choice' ? answer : undefined;

  return (
    <div className="options" role="radiogroup" aria-labelledby={`${question.questionId}-label`}>
      {(question.options ?? []).map((option) => {
        const selected = current?.value === option.value;
        const inputId = `${question.questionId}-${option.value}`;
        return (
          <div key={option.value}>
            <div className="option-row">
            <label className={`option${selected ? ' option--selected' : ''}`} htmlFor={inputId}>
              <input
                id={inputId}
                type="radio"
                name={question.questionId}
                value={option.value}
                checked={selected}
                onChange={() => onChange({ kind: 'choice', value: option.value })}
              />
              <span className="option__body">
                {option.label}
                {selected && (
                  <span className="option__mark" aria-hidden="true">
                    ✔
                  </span>
                )}
                {option.hint && <span className="option__hint">{option.hint}</span>}
              </span>
            </label>
            <SignButton label={option.label} className="sign-btn" />
            </div>

            {selected && option.numberField && (
              <div className="option__sub">
                <label className="field__label" htmlFor={`${inputId}-number`}>
                  {option.numberField.label}
                </label>
                <input
                  id={`${inputId}-number`}
                  type="number"
                  inputMode="numeric"
                  min={option.numberField.min}
                  max={option.numberField.max}
                  value={current?.numbers?.[option.numberField.key] ?? ''}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const numbers = { ...(current?.numbers ?? {}) };
                    if (raw === '') delete numbers[option.numberField!.key];
                    else numbers[option.numberField!.key] = Number(raw);
                    onChange({ kind: 'choice', value: option.value, numbers, text: current?.text });
                  }}
                />
                <span className="field__unit">{option.numberField.unit}</span>
                <span className="field__hint">
                  {option.numberField.min}~{option.numberField.max}
                  {option.numberField.unit}
                </span>
              </div>
            )}

            {selected && option.textField && (
              <div className="option__sub">
                <label className="field__label" htmlFor={`${inputId}-text`}>
                  {option.textField.label}
                </label>
                <input
                  id={`${inputId}-text`}
                  type="text"
                  maxLength={option.textField.maxLength}
                  placeholder={option.textField.placeholder}
                  value={current?.text ?? ''}
                  onChange={(event) =>
                    onChange({
                      kind: 'choice',
                      value: option.value,
                      numbers: current?.numbers,
                      text: event.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
