import { SignButton } from '../components/SignButton';
import { useScreenPlaylist } from '../components/useScreenPlaylist';
import { useSignVideo } from '../components/SignVideoContext';

interface Props {
  onStart: () => void;
}

const TITLE = '지금부터 건강검진 문진표를 수어를 보며 작성합니다.';
const LINES = [
  '질문과 답을 모두 수어영상으로 볼 수 있습니다.',
  '문장 옆 손 모양 버튼을 누르면 그 문장을 수어로 다시 보여 줍니다.',
  '작성한 내용은 저장하지 않습니다. 창을 닫으면 사라집니다.',
];

/** 시작 화면. 제목과 안내 문장을 순서대로 수어로 보여 준다. */
export function IntroScreen({ onStart }: Props) {
  const { isSigning } = useSignVideo();
  useScreenPlaylist('screen-intro', [{ caption: TITLE }, ...LINES.map((caption) => ({ caption }))]);

  return (
    <div>
      <div className="card">
        <h2 className={`screen-title${isSigning(TITLE) ? ' screen-title--signing' : ''}`}>
          <span>지금부터 건강검진 문진표를 수어를 보며 작성합니다</span>
          <SignButton label={TITLE} kind="안내" variant="main" className="sign-btn sign-btn--main" />
        </h2>

        <ul className="plain-list">
          {LINES.map((line) => (
            <li key={line} className={isSigning(line) ? 'plain-list__item--signing' : undefined}>
              {line}
              <SignButton label={line} kind="안내" className="sign-btn sign-btn--inline" />
            </li>
          ))}
        </ul>
      </div>

      <div className="btn-row btn-row--end">
        <button type="button" className="btn btn--primary btn--wide" onClick={onStart}>
          시작하기
        </button>
      </div>
    </div>
  );
}
