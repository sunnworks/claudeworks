import { visibleMatrixRows, type EvaluationContext } from '../../domain/rules';
import type { Answer, MatrixCell, QuestionDefinition } from '../../domain/types';
import { SignButton } from '../SignButton';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  context: EvaluationContext;
  onChange: (answer: Answer | undefined) => void;
}

export function MatrixInput({ question, answer, context, onChange }: Props) {
  const matrix = question.matrix;
  if (!matrix) return null;

  const current = answer && answer.kind === 'matrix' ? answer : { kind: 'matrix' as const, rows: {} };
  const rows = visibleMatrixRows(question, current, context);

  const updateRow = (rowKey: string, cell: MatrixCell | undefined) => {
    const nextRows = { ...current.rows };
    if (cell === undefined) delete nextRows[rowKey];
    else nextRows[rowKey] = cell;
    const hasValue = Object.keys(nextRows).length > 0;
    onChange(hasValue ? { kind: 'matrix', rows: nextRows } : undefined);
  };

  const chooseExclusive = (value: string) => {
    if (current.exclusive === value) onChange(undefined);
    else onChange({ kind: 'matrix', rows: {}, exclusive: value });
  };

  return (
    <div>
      {matrix.exclusiveOptions && (
        <div className="matrix__choices" style={{ marginBottom: 12 }}>
          {matrix.exclusiveOptions.map((option) => (
            <span key={option.value} className="pill-with-sign">
              <button
                type="button"
                aria-pressed={current.exclusive === option.value}
                className={`pill${current.exclusive === option.value ? ' pill--selected' : ''}`}
                onClick={() => chooseExclusive(option.value)}
              >
                {current.exclusive === option.value ? `✔ ${option.label}` : option.label}
              </button>
              <SignButton label={option.label} className="sign-btn" />
            </span>
          ))}
        </div>
      )}

      {!current.exclusive && (
        <div className="matrix">
          {rows.map((row) => {
            const cell = current.rows[row.key];
            const options = row.options ?? question.options ?? [];
            const answered =
              Boolean(cell?.choice) || (cell?.checks?.length ?? 0) > 0 || (cell?.amount ?? 0) > 0;

            return (
              <div key={row.key} className={`matrix__row${answered ? ' matrix__row--answered' : ''}`}>
                <div className="matrix__row-label">
                  <span id={`${question.questionId}-${row.key}-label`}>{row.label}</span>
                  <SignButton label={row.label} className="sign-btn" />
                </div>
                {row.hint && <p className="field__hint">{row.hint}</p>}

                {matrix.mode === 'choice' && (
                  <div
                    className="matrix__choices"
                    role="radiogroup"
                    aria-labelledby={`${question.questionId}-${row.key}-label`}
                  >
                    {options.map((option) => (
                      <span key={option.value} className="pill-with-sign">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={cell?.choice === option.value}
                          className={`pill${cell?.choice === option.value ? ' pill--selected' : ''}`}
                          onClick={() => updateRow(row.key, { ...cell, choice: option.value })}
                        >
                          {cell?.choice === option.value ? `✔ ${option.label}` : option.label}
                        </button>
                        <SignButton label={option.label} className="sign-btn" />
                      </span>
                    ))}
                  </div>
                )}

                {matrix.mode === 'checks' && (
                  <div className="matrix__choices" role="group" aria-labelledby={`${question.questionId}-${row.key}-label`}>
                    {(matrix.columns ?? []).map((column) => {
                      const checked = cell?.checks?.includes(column.value) ?? false;
                      return (
                        <span key={column.value} className="pill-with-sign">
                        <button
                          type="button"
                          aria-pressed={checked}
                          className={`pill${checked ? ' pill--selected' : ''}`}
                          onClick={() => {
                            const checks = new Set(cell?.checks ?? []);
                            if (checks.has(column.value)) checks.delete(column.value);
                            else checks.add(column.value);
                            const next = [...checks];
                            updateRow(row.key, next.length === 0 ? undefined : { ...cell, checks: next });
                          }}
                        >
                          {checked ? `✔ ${column.label}` : column.label}
                        </button>
                        <SignButton label={column.label} className="sign-btn" />
                        </span>
                      );
                    })}
                  </div>
                )}

                {matrix.mode === 'amount' && (
                  <div className="field__row">
                    <label className="visually-hidden" htmlFor={`${question.questionId}-${row.key}-amount`}>
                      {row.label} 수량
                    </label>
                    <input
                      id={`${question.questionId}-${row.key}-amount`}
                      type="number"
                      inputMode="numeric"
                      min={matrix.amount?.min ?? 0}
                      max={matrix.amount?.max ?? 100}
                      value={cell?.amount ?? ''}
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (raw === '') {
                          updateRow(row.key, cell?.unit ? { ...cell, amount: undefined } : undefined);
                          return;
                        }
                        updateRow(row.key, { ...cell, amount: Number(raw) });
                      }}
                    />
                    <label className="visually-hidden" htmlFor={`${question.questionId}-${row.key}-unit`}>
                      {row.label} 단위
                    </label>
                    <select
                      id={`${question.questionId}-${row.key}-unit`}
                      value={cell?.unit ?? ''}
                      onChange={(event) =>
                        updateRow(row.key, { ...cell, unit: event.target.value === '' ? undefined : event.target.value })
                      }
                    >
                      <option value="">단위 선택</option>
                      {(matrix.units ?? []).map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
