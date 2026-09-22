import type { Answer, QuestionDefinition } from '../../domain/types';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
  onPlayOptionVideo: (label: string) => void;
}

export function MultiChoiceInput({ question, answer, onChange, onPlayOptionVideo }: Props) {
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
          <label key={option.value} className={`option${selected ? ' option--selected' : ''}`} htmlFor={inputId}>
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
            <button
              type="button"
              className="option-video-btn"
              onClick={(event) => {
                event.preventDefault();
                onPlayOptionVideo(option.label);
              }}
              aria-label={`${option.label} 선택지 수어영상 보기`}
            >
              수어 보기
            </button>
          </label>
        );
      })}
    </div>
  );
}
