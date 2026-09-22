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

const CAPTION = '다 썼습니다. 이 화면을 인쇄해서 검진 날 가져가세요.';

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
        <h2 className="screen-title">
          <span>다 썼습니다</span>
          <SignButton label={CAPTION} kind="안내" variant="main" className="sign-btn sign-btn--main" />
        </h2>
        <p className="question-sub">
          이 내용은 저장되지 않습니다. 인쇄하거나 화면을 검진기관에 보여 주세요. 창을 닫으면 사라집니다.
        </p>

        <table className="summary-table">
          <caption className="visually-hidden">작성 정보</caption>
          <tbody>
            <tr>
              <th scope="row">검진 대상</th>
              <td className="answer">{scenario.personLabel}</td>
            </tr>
            <tr>
              <th scope="row">작성자</th>
              <td className="answer">{proxyWriting ? '가족·도와주는 사람이 대신 작성' : '본인이 작성'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="screen-title">
          <span>병원에 부탁할 것</span>
          <SignButton
            label="병원이 미리 준비할 것을 정리했습니다."
            kind="안내"
            className="sign-btn sign-btn--inline"
          />
        </h3>
        {facilityTasks.length === 0 ? (
          <p>따로 부탁한 것이 없습니다.</p>
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
          <h3 className="screen-title">
            <span>잘 모르겠다고 한 질문 {unknownQuestions.length}개</span>
            <SignButton
              label="잘 모르겠다고 한 질문입니다. 검진 날 의료진과 같이 확인하세요."
              kind="안내"
              className="sign-btn sign-btn--inline"
            />
          </h3>
          <p className="question-sub">검진 날 의료진과 같이 확인하세요.</p>
          <ul className="list">
            {unknownQuestions.map((question) => (
              <li key={question.questionId}>{question.officialText}</li>
            ))}
          </ul>
        </div>
      )}

      {scores.length > 0 && (
        <div className="card">
          <h3 className="screen-title">
            <span>검사 점수</span>
          </h3>
          <p className="question-sub">
            아래 점수는 병을 판정하는 것이 아닙니다. 의료진이 한 번 더 볼지 알려 주는 표시입니다.
          </p>
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
                    {score.medicalReview ? '의료진과 한 번 더 확인' : '괜찮습니다'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(safetyFlagged || needsReview.length > 0) && (
        <div className="card">
          <h3 className="screen-title">
            <span>의료진과 확인할 것</span>
          </h3>
          {safetyFlagged && (
            <div className="notice notice--danger">
              <strong>힘들 때는 연락하세요</strong>
              지금 위험하거나 스스로를 해칠 것 같으면 119 또는 112, 자살예방상담전화 109로 연락하세요.
            </div>
          )}
          <ul className="list">
            {needsReview.map((score) => (
              <li key={score.instrument}>{score.instrument} 검사 결과를 의료진과 같이 보세요.</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3 className="screen-title">
          <span>내가 답한 내용</span>
        </h3>
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
          처음으로
        </button>
      </div>
    </div>
  );
}
