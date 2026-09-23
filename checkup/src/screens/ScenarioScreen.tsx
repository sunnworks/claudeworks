import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import { useScreenPlaylist } from '../components/useScreenPlaylist';
import { selectModules } from '../domain/questionnaireEngine';
import type { ScenarioDefinition } from '../domain/types';

interface Props {
  scenarios: ScenarioDefinition[];
  onSelect: (scenario: ScenarioDefinition) => void;
}

const CAPTION = '어떤 분의 문진표를 작성할지 고르세요.';

export function ScenarioScreen({ scenarios, onSelect }: Props) {
  const { isSigning } = useSignVideo();
  const captions = scenarios.map(
    (scenario) =>
      `${scenario.personLabel}. ${selectModules({
        scenario,
        proxyWriting: scenario.defaultProxyWriting,
        preferredCommunication: [],
      })
        .map((module) => module.title)
        .join(', ')}`,
  );
  useScreenPlaylist('screen-scenario', [
    { caption: CAPTION, kind: '문항' },
    ...captions.map((caption) => ({ caption, kind: '선택지' as const })),
  ]);

  return (
    <div className="card">
      <h2 className={`screen-title${isSigning(CAPTION) ? ' screen-title--signing' : ''}`}>
        <span>어떤 분의 문진표인가요?</span>
        <SignButton label={CAPTION} kind="문항" variant="main" className="sign-btn sign-btn--main" />
      </h2>

      <div className="scenario-grid">
        {scenarios.map((scenario, order) => {
          const modules = selectModules({
            scenario,
            proxyWriting: scenario.defaultProxyWriting,
            preferredCommunication: [],
          });
          const caption = captions[order];
          return (
            <div key={scenario.scenarioId} className="scenario-card-wrap">
              <button
                type="button"
                className={`scenario-card${isSigning(caption) ? ' scenario-card--signing' : ''}`}
                onClick={() => onSelect(scenario)}
              >
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
