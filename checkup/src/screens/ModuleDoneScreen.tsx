import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import { useScreenPlaylist } from '../components/useScreenPlaylist';
import type { ModuleDefinition } from '../domain/types';

interface Props {
  module: ModuleDefinition | undefined;
  missingCount: number;
  onContinue: () => void;
  onReview: () => void;
}

export function ModuleDoneScreen({ module, missingCount, onContinue, onReview }: Props) {
  const { isSigning } = useSignVideo();
  const caption = `${module?.title ?? '이 부분'} 끝났습니다. 다음으로 갑니다.`;
  const missingText = `아직 답하지 않은 질문이 ${missingCount}개 있습니다.`;

  useScreenPlaylist(`screen-moduledone-${module?.moduleId ?? 'none'}`, [
    { caption },
    ...(missingCount > 0 ? [{ caption: missingText }] : []),
  ]);

  return (
    <div>
      <div className="card">
        <h2 className={`screen-title${isSigning(caption) ? ' screen-title--signing' : ''}`}>
          <span>{module?.title ?? '이 부분'} 끝났습니다</span>
          <SignButton label={caption} kind="안내" variant="main" className="sign-btn sign-btn--main" />
        </h2>
        {missingCount > 0 && (
          <p className={`question-sub${isSigning(missingText) ? ' question-sub--signing' : ''}`}>
            {missingText}
            <SignButton label={missingText} kind="안내" className="sign-btn sign-btn--inline" />
          </p>
        )}
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
