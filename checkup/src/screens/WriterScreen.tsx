import type { ScenarioDefinition } from '../domain/types';

const COMMUNICATION_OPTIONS = [
  { value: 'KSL', label: '수어통역' },
  { value: 'ORAL', label: '구화' },
  { value: 'WRITING', label: '필담·문자' },
  { value: 'DEVICE', label: '대화용 장치' },
];

interface Props {
  scenario: ScenarioDefinition;
  proxyWriting: boolean;
  onProxyChange: (value: boolean) => void;
  preferredCommunication: string[];
  onCommunicationChange: (values: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

/** S03 작성자와 지원 설정. 대리작성 사실은 확인표에 그대로 표시된다. */
export function WriterScreen({
  scenario,
  proxyWriting,
  onProxyChange,
  preferredCommunication,
  onCommunicationChange,
  onNext,
  onBack,
}: Props) {
  const toggle = (value: string) => {
    onCommunicationChange(
      preferredCommunication.includes(value)
        ? preferredCommunication.filter((item) => item !== value)
        : [...preferredCommunication, value],
    );
  };

  return (
    <div>
      <div className="card">
        <h2>누가 작성하나요?</h2>
        <p className="field__hint">
          선택한 시나리오: {scenario.title} · {scenario.personLabel}
        </p>

        <div className="options" role="radiogroup" aria-label="작성자">
          <label className={`option${!proxyWriting ? ' option--selected' : ''}`} htmlFor="writer-self">
            <input
              id="writer-self"
              type="radio"
              name="writer"
              checked={!proxyWriting}
              onChange={() => onProxyChange(false)}
            />
            <span className="option__body">
              본인이 작성합니다
              {!proxyWriting && <span className="option__mark" aria-hidden="true">✔ 선택함</span>}
            </span>
          </label>
          <label className={`option${proxyWriting ? ' option--selected' : ''}`} htmlFor="writer-proxy">
            <input
              id="writer-proxy"
              type="radio"
              name="writer"
              checked={proxyWriting}
              onChange={() => onProxyChange(true)}
            />
            <span className="option__body">
              보호자·조력인이 대리로 작성합니다
              <span className="option__hint">대리작성 사실은 확인표에 그대로 표시됩니다. 숨길 수 없습니다.</span>
              {proxyWriting && <span className="option__mark" aria-hidden="true">✔ 선택함</span>}
            </span>
          </label>
        </div>

        <h3>병원에서 편한 의사소통 방법 (여러 개 선택 가능)</h3>
        <p className="field__hint">검진기관이 방문 전에 통역과 안내를 준비하는 데 사용합니다.</p>
        <div className="matrix__choices">
          {COMMUNICATION_OPTIONS.map((option) => {
            const selected = preferredCommunication.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                className={`pill${selected ? ' pill--selected' : ''}`}
                onClick={() => toggle(option.value)}
              >
                {selected ? `✔ ${option.label}` : option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="btn-row btn-row--end">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          시나리오 다시 선택
        </button>
        <button type="button" className="btn btn--primary" onClick={onNext}>
          다음
        </button>
      </div>
    </div>
  );
}
