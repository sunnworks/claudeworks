import { useEffect } from 'react';
import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import type { ScenarioDefinition } from '../domain/types';

interface Props {
  scenario: ScenarioDefinition;
  proxyWriting: boolean;
  onProxyChange: (value: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

const CAPTION = '이 문진표를 누가 작성하는지 고르세요. 본인 작성인가요, 대리 작성인가요?';

/**
 * S03 작성자 설정.
 * 대리작성 사실은 확인표에 그대로 표시된다(설계서 6 역할과 권한).
 * 선호 의사소통 방법은 문진 안의 SUP-06 에서 수어영상과 함께 묻는다. 여기서 중복해 묻지 않는다.
 */
export function WriterScreen({ scenario, proxyWriting, onProxyChange, onNext, onBack }: Props) {
  const { setPrimary } = useSignVideo();

  useEffect(() => {
    setPrimary({ caption: CAPTION, kind: '문항', key: 'screen-writer' });
  }, [setPrimary]);

  return (
    <div>
      <div className="card">
        <h2>
          누가 작성하나요?
          <SignButton label={CAPTION} kind="문항" className="sign-btn sign-btn--inline" />
        </h2>
        <p className="field__hint">
          선택한 시나리오: {scenario.title} · {scenario.personLabel}
        </p>

        <div className="options" role="radiogroup" aria-label="작성자">
          <div className="option-row">
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
          <SignButton label="본인이 작성합니다" className="sign-btn" />
          </div>
          <div className="option-row">
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
          <SignButton
            label="보호자나 조력인이 대리로 작성합니다. 대리작성 사실은 확인표에 표시됩니다."
            className="sign-btn"
          />
          </div>
        </div>

        <div className="notice notice--info">
          <strong>
            의사소통 방법은 문진에서 묻습니다
            <SignButton
              label="병원에서 편한 의사소통 방법은 문진 문항에서 수어영상과 함께 묻습니다."
              kind="안내"
              className="sign-btn sign-btn--inline"
            />
          </strong>
          수어통역·구화·필담 같은 선호 의사소통 방법은 검진지원 문항(SUP-05, SUP-06)에서 수어영상과 함께
          묻습니다. 그 답변은 확인표의 검진기관 준비사항으로 정리됩니다.
        </div>
      </div>

      <div className="btn-row btn-row--end">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          시나리오 다시 선택
        </button>
        <button type="button" className="btn btn--primary" onClick={onNext}>
          다음
        </button>
        <SignButton label="다음으로 갑니다" kind="버튼" className="sign-btn" />
      </div>
    </div>
  );
}
