import type { Answer, QuestionDefinition } from '../../domain/types';
import { SignButton } from '../SignButton';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
}

export function ScaleInput({ question, answer, onChange }: Props) {
  const scale = question.scale;
  if (!scale) return null;
  const current = answer && answer.kind === 'scale' ? answer.value : undefined;
  const steps = Array.from({ length: scale.max - scale.min + 1 }, (_, index) => scale.min + index);

  return (
    <div>
      <div className="field__row" style={{ justifyContent: 'space-between' }}>
        <span className="field__hint">
          {scale.minLabel}
          <SignButton label={scale.minLabel} className="sign-btn sign-btn--inline" />
        </span>
        <span className="field__hint">
          {scale.maxLabel}
          <SignButton label={scale.maxLabel} className="sign-btn sign-btn--inline" />
        </span>
      </div>
      <div className="matrix__choices" role="radiogroup" aria-label={question.officialText}>
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={current === step}
            className={`pill${current === step ? ' pill--selected' : ''}`}
            onClick={() => onChange({ kind: 'scale', value: step })}
          >
            {current === step ? `✔ ${step}` : step}
          </button>
        ))}
      </div>
    </div>
  );
}
