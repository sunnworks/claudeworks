import { useEffect } from 'react';
import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';

interface Props {
  onStart: () => void;
}

const CAPTION = '건강검진 문진표를 수어로 보고 직접 작성합니다.';

/** 시작 화면. 글은 짧게, 필요한 말만 둔다. */
export function IntroScreen({ onStart }: Props) {
  const { setPlaylist } = useSignVideo();

  useEffect(() => {
    setPlaylist([{ caption: CAPTION, kind: '안내', key: 'screen-intro' }], 'screen-intro');
  }, [setPlaylist]);

  return (
    <div>
      <div className="card">
        <h2 className="screen-title">
          <span>건강검진 문진표를 수어로 작성합니다</span>
          <SignButton label={CAPTION} kind="안내" variant="main" className="sign-btn sign-btn--main" />
        </h2>

        <ul className="plain-list">
          <li>
            질문과 답을 모두 수어영상으로 볼 수 있습니다.
            <SignButton label="질문과 답을 모두 수어영상으로 볼 수 있습니다." kind="안내" className="sign-btn sign-btn--inline" />
          </li>
          <li>
            문장 옆 손 모양 버튼을 누르면 그 문장을 수어로 보여 줍니다.
            <SignButton label="문장 옆 손 모양 버튼을 누르면 그 문장을 수어로 보여 줍니다." kind="안내" className="sign-btn sign-btn--inline" />
          </li>
          <li>
            작성한 내용은 저장하지 않습니다. 창을 닫으면 사라집니다.
            <SignButton label="작성한 내용은 저장하지 않습니다. 창을 닫으면 사라집니다." kind="안내" className="sign-btn sign-btn--inline" />
          </li>
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
