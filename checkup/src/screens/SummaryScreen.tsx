import { useEffect } from 'react';
import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import { formatAnswer } from '../domain/answerFormat';
import { buildFacilityChecklist } from '../domain/facilityChecklist';
import { visibleQuestionsOfModule } from '../domain/questionnaireEngine';
import type { EvaluationContext } from '../domain/rules';
import type { AnyScore } from '../domain/scoring';
import type { QuestionDefinition, ModuleDefinition, ScenarioDefinition } from '../domain/types';

interface Props {
  scenario: ScenarioDefinition;
  proxyWriting: boolean;
  modules: ModuleDefinition[];
  context: EvaluationContext;
  scores: AnyScore[];
  safetyFlagged: boolean;
  unknownQuestions: QuestionDefinition[];
  onRestart: () => void;
}

const CAPTION = '사전문진 확인표입니다. 제출되지 않았습니다. 인쇄해서 검진 당일 가져가세요.';

function scoreLine(score: AnyScore): string {
  if (score.instrument === 'PHQ-9') return `총점 ${score.total} / ${score.maxTotal}`;
  if (score.instrument === 'KDSQ-C') return `총점 ${score.total} / ${score.maxTotal}`;
  return `빈도 ${score.frequencyTotal} / ${score.maxTotal} · 고통 ${score.distressTotal} / ${score.maxTotal}`;
}

/** S10 데모 확인표. 제출되지 않으며 인쇄만 제공한다. */
export function SummaryScreen({
  scenario,
  proxyWriting,
  modules,
  context,
  scores,
  safetyFlagged,
  unknownQuestions,
  onRestart,
}: Props) {
  const { setPrimary } = useSignVideo();
  const needsReview = scores.filter((score) => score.medicalReview);
  const facilityTasks = buildFacilityChecklist(context.answers);

  useEffect(() => {
    setPrimary({ caption: CAPTION, kind: '안내', key: 'screen-summary' });
  }, [setPrimary]);

  return (
    <div>
      <div className="card">
        <h2>
          사전문진 확인표 (데모)
          <SignButton label={CAPTION} kind="안내" className="sign-btn sign-btn--inline" />
        </h2>
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
              <th scope="row">데모 확인코드</th>
              <td className="answer">DEMO-NOT-SUBMITTED</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>
          검진기관 준비사항
          <SignButton
            label="검진기관이 미리 준비할 일을 정리했습니다."
            kind="안내"
            className="sign-btn sign-btn--inline"
          />
        </h3>
        <p className="field__hint">
          검진지원 문항의 답변을 검진기관이 방문 전에 준비할 일로 정리한 것입니다. 이 목록이 검진지원 문항을 묻는
          이유입니다.
        </p>
        {facilityTasks.length === 0 ? (
          <p>따로 요청한 지원이 없습니다.</p>
        ) : (
          <ul className="list">
            {facilityTasks.map((task) => (
              <li key={task.title}>
                <strong>{task.title}</strong> — {task.detail}
              </li>
            ))}
          </ul>
        )}
      </div>

      {unknownQuestions.length > 0 && (
        <div className="card">
          <h3>
            잘 모르겠다고 표시한 문항 {unknownQuestions.length}개
            <SignButton
              label="잘 모르겠다고 표시한 문항입니다. 검진 당일 의료진과 함께 확인하세요."
              kind="안내"
              className="sign-btn sign-btn--inline"
            />
          </h3>
          <div className="notice notice--warn">
            <strong>값을 저장하지 않았습니다</strong>
            공식 응답에 모름이 없는 문항이라 임의로 값을 만들지 않았습니다. 검진 당일 의료진과 함께 확인하세요.
          </div>
          <ul className="list">
            {unknownQuestions.map((question) => (
              <li key={question.questionId}>
                [{question.questionId}] {question.officialText}
              </li>
            ))}
          </ul>
        </div>
      )}

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
        <SignButton label="처음부터 다시 시작합니다" kind="버튼" className="sign-btn" />
      </div>
    </div>
  );
}
