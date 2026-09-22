import { formatAnswer } from '../domain/answerFormat';
import { visibleQuestionsOfModule } from '../domain/questionnaireEngine';
import type { EvaluationContext } from '../domain/rules';
import type { AnyScore } from '../domain/scoring';
import type { ModuleDefinition, ScenarioDefinition } from '../domain/types';

interface Props {
  scenario: ScenarioDefinition;
  proxyWriting: boolean;
  preferredCommunication: string[];
  modules: ModuleDefinition[];
  context: EvaluationContext;
  scores: AnyScore[];
  safetyFlagged: boolean;
  onRestart: () => void;
}

const COMMUNICATION_LABELS: Record<string, string> = {
  KSL: '수어통역',
  ORAL: '구화',
  WRITING: '필담·문자',
  DEVICE: '대화용 장치',
};

function scoreLine(score: AnyScore): string {
  if (score.instrument === 'PHQ-9') return `총점 ${score.total} / ${score.maxTotal}`;
  if (score.instrument === 'KDSQ-C') return `총점 ${score.total} / ${score.maxTotal}`;
  return `빈도 ${score.frequencyTotal} / ${score.maxTotal} · 고통 ${score.distressTotal} / ${score.maxTotal}`;
}

/** S10 데모 확인표. 제출되지 않으며 인쇄만 제공한다. */
export function SummaryScreen({
  scenario,
  proxyWriting,
  preferredCommunication,
  modules,
  context,
  scores,
  safetyFlagged,
  onRestart,
}: Props) {
  const needsReview = scores.filter((score) => score.medicalReview);

  return (
    <div>
      <div className="card">
        <h2>사전문진 확인표 (데모)</h2>
        <div className="notice notice--warn">
          <strong>제출되지 않았습니다</strong>
          이 확인표는 화면과 인쇄로만 제공됩니다. 병원이나 공단으로 전송되지 않았고, 저장되지도 않았습니다.
          새로고침하면 사라집니다.
        </div>

        <table className="summary-table">
          <caption className="visually-hidden">작성 정보</caption>
          <tbody>
            <tr>
              <th scope="row">검진 대상</th>
              <td className="answer">
                {scenario.title} · {scenario.personLabel}
              </td>
            </tr>
            <tr>
              <th scope="row">작성자</th>
              <td className="answer">{proxyWriting ? '보호자·조력인 대리작성' : '본인 작성'}</td>
            </tr>
            <tr>
              <th scope="row">선호 의사소통 방법</th>
              <td className="answer">
                {preferredCommunication.length === 0
                  ? '선택하지 않음'
                  : preferredCommunication.map((value) => COMMUNICATION_LABELS[value] ?? value).join(', ')}
              </td>
            </tr>
            <tr>
              <th scope="row">데모 확인코드</th>
              <td className="answer">DEMO-NOT-SUBMITTED</td>
            </tr>
          </tbody>
        </table>
      </div>

      {scores.length > 0 && (
        <div className="card">
          <h3>검증형 척도 결과</h3>
          <div className="notice notice--info">
            <strong>진단이 아닙니다</strong>
            아래 점수는 의료진이 추가로 확인할 필요가 있는지 알려 주는 표시입니다. 질병을 판정하지 않습니다.
          </div>
          <table className="summary-table">
            <caption className="visually-hidden">척도 점수</caption>
            <thead>
              <tr>
                <th scope="col">도구</th>
                <th scope="col">점수</th>
                <th scope="col">표시</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score.instrument}>
                  <th scope="row">{score.instrument}</th>
                  <td className="answer">{scoreLine(score)}</td>
                  <td className={score.medicalReview ? 'missing' : 'answer'}>
                    {score.medicalReview ? `의료진 확인 필요 (${score.reasons.join(', ')})` : '추가 표시 없음'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(safetyFlagged || needsReview.length > 0) && (
        <div className="card">
          <h3>의료진 확인 필요 표시</h3>
          {safetyFlagged && (
            <div className="notice notice--danger">
              <strong>정신건강 안전안내를 표시했습니다</strong>
              지금 위험하거나 스스로를 해칠 것 같으면 119 또는 112, 자살예방상담전화 109로 연락하세요. 이 화면은
              상담이나 진료를 대신하지 않습니다.
            </div>
          )}
          <ul className="list">
            {needsReview.map((score) => (
              <li key={score.instrument}>
                {score.instrument} · {score.reasons.join(', ')} — 검진 당일 의료진 확인을 권합니다.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3>문진 답변</h3>
        {modules.map((module) => (
          <section key={module.moduleId} style={{ marginBottom: 20 }}>
            <h4>{module.title}</h4>
            <table className="summary-table">
              <caption className="visually-hidden">{module.title} 답변</caption>
              <tbody>
                {visibleQuestionsOfModule(module.moduleId, context).map((question) => (
                  <tr key={question.questionId}>
                    <th scope="row">{question.officialText}</th>
                    <td className="answer">{formatAnswer(question, context.answers[question.questionId])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <div className="btn-row btn-row--end no-print">
        <button type="button" className="btn btn--ghost" onClick={() => window.print()}>
          인쇄하기
        </button>
        <button type="button" className="btn btn--primary" onClick={onRestart}>
          새로 시작
        </button>
      </div>
    </div>
  );
}
