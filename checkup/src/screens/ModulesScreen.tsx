import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import { useScreenPlaylist } from '../components/useScreenPlaylist';
import { visibleQuestionsOfModule } from '../domain/questionnaireEngine';
import type { EvaluationContext } from '../domain/rules';
import type { ModuleDefinition } from '../domain/types';

interface Props {
  modules: ModuleDefinition[];
  context: EvaluationContext;
  onStart: () => void;
  onBack: () => void;
}

const NOTE = '답에 따라 질문 수가 늘거나 줄 수 있습니다. 시간 제한은 없습니다.';

export function ModulesScreen({ modules, context, onStart, onBack }: Props) {
  const { isSigning } = useSignVideo();
  const counts = modules.map((module) => ({
    module,
    count: visibleQuestionsOfModule(module.moduleId, context).length,
  }));
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const title = `모두 ${total}개를 물어봅니다.`;

  useScreenPlaylist('screen-modules', [
    { caption: title },
    ...counts.map(({ module, count }) => ({ caption: `${module.title} ${count}개` })),
    { caption: NOTE },
  ]);

  return (
    <div>
      <div className="card">
        <h2 className={`screen-title${isSigning(title) ? ' screen-title--signing' : ''}`}>
          <span>모두 {total}개를 물어봅니다</span>
          <SignButton label={title} kind="안내" variant="main" className="sign-btn sign-btn--main" />
        </h2>

        <ul className="plain-list">
          {counts.map(({ module, count }) => (
            <li
              key={module.moduleId}
              className={isSigning(`${module.title} ${count}개`) ? 'plain-list__item--signing' : undefined}
            >
              {module.title} <strong>{count}개</strong>
              <SignButton label={`${module.title} ${count}개`} className="sign-btn sign-btn--inline" />
            </li>
          ))}
        </ul>

        <p className={`question-sub${isSigning(NOTE) ? ' question-sub--signing' : ''}`}>
          {NOTE}
          <SignButton label={NOTE} kind="안내" className="sign-btn sign-btn--inline" />
        </p>
      </div>

      <div className="btn-row btn-row--end">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          뒤로
        </button>
        <button type="button" className="btn btn--primary btn--wide" onClick={onStart}>
          시작하기
        </button>
      </div>
    </div>
  );
}
