import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import { useScreenPlaylist } from '../components/useScreenPlaylist';

interface Props {
  proxyWriting: boolean;
  onProxyChange: (value: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

const CAPTION = '누가 작성하나요? 본인인가요, 다른 사람이 대신 쓰나요?';
const SELF = '내가 직접 씁니다';
const PROXY = '가족이나 도와주는 사람이 대신 씁니다';

/** 작성자 확인. 의사소통 방법은 문진 안 SUP-05·SUP-06 에서 수어와 함께 묻는다. */
export function WriterScreen({ proxyWriting, onProxyChange, onNext, onBack }: Props) {
  const { isSigning } = useSignVideo();
  useScreenPlaylist('screen-writer', [
    { caption: CAPTION, kind: '문항' },
    { caption: SELF, kind: '선택지' },
    { caption: PROXY, kind: '선택지' },
  ]);

  return (
    <div>
      <div className="card">
        <h2 className={`screen-title${isSigning(CAPTION) ? ' screen-title--signing' : ''}`}>
          <span>누가 작성하나요?</span>
          <SignButton label={CAPTION} kind="문항" variant="main" className="sign-btn sign-btn--main" />
        </h2>

        <div className="options" role="radiogroup" aria-label="작성자">
          <div className="option-row">
            <label
              className={`option${!proxyWriting ? ' option--selected' : ''}${
                isSigning(SELF) ? ' option--signing' : ''
              }`}
              htmlFor="writer-self"
            >
              <input
                id="writer-self"
                type="radio"
                name="writer"
                checked={!proxyWriting}
                onChange={() => onProxyChange(false)}
              />
              <span className="option__body">
                {SELF}
                {!proxyWriting && (
                  <span className="option__mark" aria-hidden="true">
                    ✔
                  </span>
                )}
              </span>
            </label>
            <SignButton label={SELF} className="sign-btn" />
          </div>

          <div className="option-row">
            <label
              className={`option${proxyWriting ? ' option--selected' : ''}${
                isSigning(PROXY) ? ' option--signing' : ''
              }`}
              htmlFor="writer-proxy"
            >
              <input
                id="writer-proxy"
                type="radio"
                name="writer"
                checked={proxyWriting}
                onChange={() => onProxyChange(true)}
              />
              <span className="option__body">
                {PROXY}
                {proxyWriting && (
                  <span className="option__mark" aria-hidden="true">
                    ✔
                  </span>
                )}
              </span>
            </label>
            <SignButton label={PROXY} className="sign-btn" />
          </div>
        </div>
      </div>

      <div className="btn-row btn-row--end">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          뒤로
        </button>
        <button type="button" className="btn btn--primary" onClick={onNext}>
          다음
        </button>
      </div>
    </div>
  );
}
