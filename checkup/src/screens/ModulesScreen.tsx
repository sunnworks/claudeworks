import { useEffect } from 'react';
import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import type { EvaluationContext } from '../domain/rules';
import { visibleQuestionsOfModule } from '../domain/questionnaireEngine';
import type { ModuleDefinition, ScenarioDefinition } from '../domain/types';

interface Props {
  scenario: ScenarioDefinition;
  modules: ModuleDefinition[];
  context: EvaluationContext;
  proxyWriting: boolean;
  onStart: () => void;
  onBack: () => void;
}

/** S04 적용 모듈과 예상 문항 안내 */
const CAPTION = '이번에 답할 문항을 안내합니다. 확인한 뒤 문진을 시작하세요.';

export function ModulesScreen({ scenario, modules, context, proxyWriting, onStart, onBack }: Props) {
  const { setPrimary } = useSignVideo();

  useEffect(() => {
    setPrimary({ caption: CAPTION, kind: '안내', key: 'screen-modules' });
  }, [setPrimary]);

  const counts = modules.map((module) => ({
    module,
    count: visibleQuestionsOfModule(module.moduleId, context).length,
  }));
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  // 추정: 문항당 30초로 계산한 값이며 실제 소요시간과 다를 수 있습니다.
  const estimatedMinutes = Math.max(1, Math.round((total * 30) / 60));

  return (
    <div>
      <div className="card">
        <h2>
          이번에 답할 문항
          <SignButton label={CAPTION} kind="안내" className="sign-btn sign-btn--inline" />
        </h2>
        <p>
          {scenario.title} · {scenario.personLabel} · {proxyWriting ? '대리작성' : '본인작성'}
        </p>
        <div className="notice notice--info">
          <strong>{scenario.assumptionNote}</strong>
          검진대상 정보는 데모 가정값입니다. 실제 대상 여부는 검진기관에서 확인합니다.
        </div>

        <table className="summary-table">
          <caption className="visually-hidden">적용 모듈과 문항 수</caption>
          <thead>
            <tr>
              <th scope="col">모듈</th>
              <th scope="col">문항 수</th>
            </tr>
          </thead>
          <tbody>
            {counts.map(({ module, count }) => (
              <tr key={module.moduleId}>
                <th scope="row">
                  {module.title}
                  <span className="option__hint">{module.description}</span>
                </th>
                <td className="answer">{count}문항</td>
              </tr>
            ))}
            <tr>
              <th scope="row">지금 기준 합계</th>
              <td className="answer">{total}문항</td>
            </tr>
          </tbody>
        </table>

        <p className="field__hint" style={{ marginTop: 12 }}>
          답변에 따라 문항이 늘거나 줄 수 있습니다. 예상 소요시간은 약 {estimatedMinutes}분입니다(문항당 30초로 계산한
          추정값). 시간 제한은 없습니다.
        </p>
      </div>

      <div className="btn-row btn-row--end">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          이전
        </button>
        <button type="button" className="btn btn--primary" onClick={onStart}>
          문진 시작
        </button>
        <SignButton label="문진을 시작합니다" kind="버튼" className="sign-btn" />
      </div>
    </div>
  );
}
