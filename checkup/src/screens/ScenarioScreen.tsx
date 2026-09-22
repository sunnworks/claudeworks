import { selectModules } from '../domain/questionnaireEngine';
import type { ScenarioDefinition } from '../domain/types';

interface Props {
  scenarios: ScenarioDefinition[];
  onSelect: (scenario: ScenarioDefinition) => void;
}

/** S02 시나리오 선택. 실서비스에서는 병원 또는 공단의 검진대상 정보를 받는다. */
export function ScenarioScreen({ scenarios, onSelect }: Props) {
  return (
    <div>
      <div className="card">
        <h2>어떤 검진 대상자로 시연할까요?</h2>
        <p>
          실제 서비스에서는 병원이나 국민건강보험공단에서 받은 검진대상 정보로 문항이 자동 구성됩니다.
          데모에서는 아래 4가지 가상 대상자 중 하나를 고릅니다.
        </p>

        <div className="scenario-grid">
          {scenarios.map((scenario) => {
            const modules = selectModules({
              scenario,
              proxyWriting: scenario.defaultProxyWriting,
              preferredCommunication: [],
            });
            return (
              <button
                key={scenario.scenarioId}
                type="button"
                className="scenario-card"
                onClick={() => onSelect(scenario)}
              >
                <h3>
                  {scenario.title} · {scenario.personLabel}
                </h3>
                <p>{scenario.purpose}</p>
                <p>
                  {modules.map((module) => (
                    <span key={module.moduleId} className="chip" style={{ marginRight: 6 }}>
                      {module.title}
                    </span>
                  ))}
                </p>
                <span className="chip chip--muted">{scenario.assumptionNote}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
