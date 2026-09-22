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

/** S08 모듈 완료 */
export function ModuleDoneScreen({ module, missingCount, onContinue, onReview }: Props) {
  const { setPrimary } = useSignVideo();
  const caption = `${module?.title ?? '이 모듈'}을 마쳤습니다. 다음 모듈로 갑니다.`;

  useEffect(() => {
    setPrimary({ caption, kind: '안내', key: `screen-moduledone-${module?.moduleId ?? 'none'}` });
  }, [setPrimary, caption, module?.moduleId]);

  return (
    <div>
      <div className="card">
        <h2>
          {module?.title ?? '모듈'}을(를) 마쳤습니다
          <SignButton label={caption} kind="안내" className="sign-btn sign-btn--inline" />
        </h2>
        {missingCount > 0 ? (
          <div className="notice notice--warn">
            <strong>아직 답하지 않은 문항이 {missingCount}개 있습니다</strong>
            검토 화면에서 채울 수 있습니다. 모두 채워야 완료할 수 있습니다.
          </div>
        ) : (
          <div className="notice notice--ok">
            <strong>이 모듈의 필수문항을 모두 채웠습니다</strong>
            다음 모듈로 넘어갑니다.
          </div>
        )}
        <p>답변은 언제든지 이전으로 돌아가 수정할 수 있습니다.</p>
      </div>

      <div className="btn-row btn-row--end">
        <button type="button" className="btn btn--ghost" onClick={onReview}>
          지금까지 답변 보기
        </button>
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          다음 모듈 시작
        </button>
        <SignButton label="다음 모듈을 시작합니다" kind="버튼" className="sign-btn" />
      </div>
    </div>
  );
}
