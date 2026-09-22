import type { Answer, QuestionDefinition } from '../../domain/types';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
}

export function DurationInput({ question, answer, onChange }: Props) {
  const current = answer && answer.kind === 'duration' ? answer : { hours: NaN, minutes: NaN };

  const update = (key: 'hours' | 'minutes', raw: string) => {
    const next = { hours: current.hours, minutes: current.minutes, [key]: raw === '' ? NaN : Number(raw) };
    if (Number.isNaN(next.hours) && Number.isNaN(next.minutes)) {
      onChange(undefined);
      return;
    }
    onChange({
      kind: 'duration',
      hours: Number.isNaN(next.hours) ? 0 : next.hours,
      minutes: Number.isNaN(next.minutes) ? 0 : next.minutes,
    });
  };

  return (
    <div className="field__row" style={{ marginBottom: 16 }}>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="field__label" htmlFor={`${question.questionId}-hours`}>
          시간
        </label>
        <div className="field__row">
          <input
            id={`${question.questionId}-hours`}
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            value={Number.isNaN(current.hours) ? '' : current.hours}
            onChange={(event) => update('hours', event.target.value)}
          />
          <span className="field__unit">시간</span>
        </div>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="field__label" htmlFor={`${question.questionId}-minutes`}>
          분
        </label>
        <div className="field__row">
          <input
            id={`${question.questionId}-minutes`}
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={Number.isNaN(current.minutes) ? '' : current.minutes}
            onChange={(event) => update('minutes', event.target.value)}
          />
          <span className="field__unit">분</span>
        </div>
      </div>
      <span className="field__hint">분은 0분부터 59분까지 입력합니다.</span>
    </div>
  );
}
