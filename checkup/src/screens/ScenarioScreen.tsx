import { useEffect } from 'react';
import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import { selectModules } from '../domain/questionnaireEngine';
import type { ScenarioDefinition } from '../domain/types';

interface Props {
  scenarios: ScenarioDefinition[];
  onSelect: (scenario: ScenarioDefinition) => void;
}

const CAPTION = '어떤 분의 문진표를 작성할지 고르세요.';

export function ScenarioScreen({ scenarios, onSelect }: Props) {
  const { setPrimary } = useSignVideo();

  useEffect(() => {
    setPrimary({ caption: CAPTION, kind: '문항', key: 'screen-scenario' });
  }, [setPrimary]);

  return (
    <div className="card">
      <h2 className="screen-title">
        <span>어떤 분의 문진표인가요?</span>
        <SignButton label={CAPTION} kind="문항" variant="main" className="sign-btn sign-btn--main" />
      </h2>

      <div className="scenario-grid">
        {scenarios.map((scenario) => {
          const modules = selectModules({
            scenario,
            proxyWriting: scenario.defaultProxyWriting,
            preferredCommunication: [],
          });
          const caption = `${scenario.personLabel}. ${modules.map((module) => module.title).join(', ')}`;
          return (
            <div key={scenario.scenarioId} className="scenario-card-wrap">
              <button type="button" className="scenario-card" onClick={() => onSelect(scenario)}>
                <h3>{scenario.personLabel}</h3>
                <p>
                  {modules.map((module) => (
                    <span key={module.moduleId} className="chip" style={{ marginRight: 6 }}>
                      {module.title}
                    </span>
                  ))}
                </p>
              </button>
              <SignButton label={caption} className="sign-btn" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
