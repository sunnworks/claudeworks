import { useEffect } from 'react';
import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import type { ModuleDefinition } from '../domain/types';

interface Props {
  module: ModuleDefinition | undefined;
  missingCount: number;
  onContinue: () => void;
  onReview: () => void;
}

export function ModuleDoneScreen({ module, missingCount, onContinue, onReview }: Props) {
  const { setPlaylist } = useSignVideo();
  const caption = `${module?.title ?? '이 부분'} 끝났습니다. 다음으로 갑니다.`;

  useEffect(() => {
    setPlaylist(
      [{ caption, kind: '안내', key: `screen-moduledone-${module?.moduleId ?? 'none'}` }],
      `screen-moduledone-${module?.moduleId ?? 'none'}`,
    );
  }, [setPlaylist, caption, module?.moduleId]);

  return (
    <div>
      <div className="card">
        <h2 className="screen-title">
          <span>{module?.title ?? '이 부분'} 끝났습니다</span>
          <SignButton label={caption} kind="안내" variant="main" className="sign-btn sign-btn--main" />
        </h2>
        {missingCount > 0 && <p className="question-sub">아직 답하지 않은 질문이 {missingCount}개 있습니다.</p>}
      </div>

      <div className="btn-row btn-row--end">
        <button type="button" className="btn btn--ghost" onClick={onReview}>
          지금까지 답 보기
        </button>
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          다음
        </button>
      </div>
    </div>
  );
}
