import { formatAnswer } from '../domain/answerFormat';
import { visibleQuestionsOfModule } from '../domain/questionnaireEngine';
import type { EvaluationContext } from '../domain/rules';
import { validateAnswer } from '../domain/validation';
import type { ModuleDefinition } from '../domain/types';

interface Props {
  modules: ModuleDefinition[];
  context: EvaluationContext;
  incompleteCount: number;
  showIncomplete: boolean;
  onJump: (questionId: string) => void;
  onFinish: () => void;
  onBack: () => void;
}

/** S09 전체 답변 검토와 수정 */
export function ReviewScreen({
  modules,
  context,
  incompleteCount,
  showIncomplete,
  onJump,
  onFinish,
  onBack,
}: Props) {
  return (
    <div>
      <div className="card">
        <h2>답변을 확인해 주세요</h2>
        <p>모듈 이름을 누르면 답변이 펼쳐집니다. 수정할 문항은 오른쪽 “수정”을 누르세요.</p>

        {incompleteCount > 0 ? (
          <div className="notice notice--warn" aria-live="polite">
            <strong>아직 답하지 않았거나 다시 확인할 문항이 {incompleteCount}개 있습니다</strong>
            모두 채워야 완료할 수 있습니다.
          </div>
        ) : (
          <div className="notice notice--ok" aria-live="polite">
            <strong>필수문항을 모두 채웠습니다</strong>
            완료를 누르면 데모 확인표를 볼 수 있습니다.
          </div>
        )}
      </div>

      {modules.map((module) => {
        const questions = visibleQuestionsOfModule(module.moduleId, context);
        const missing = questions.filter(
          (question) => !validateAnswer(question, context.answers[question.questionId], context).complete,
        ).length;

        return (
          <details className="review-module" key={module.moduleId} open={missing > 0}>
            <summary>
              {module.title} · {questions.length}문항
              {missing > 0 ? (
                <span className="chip" style={{ background: '#fdeaef', color: '#a4123a', borderColor: '#e2909f' }}>
                  확인 필요 {missing}
                </span>
              ) : (
                <span className="chip" style={{ background: '#e3f5ec', color: '#0f6b45', borderColor: '#8ec6ab' }}>
                  ✔ 완료
                </span>
              )}
            </summary>
            <div className="card">
              <table className="summary-table">
                <caption className="visually-hidden">{module.title} 답변 목록</caption>
                <tbody>
                  {questions.map((question) => {
                    const answer = context.answers[question.questionId];
                    const result = validateAnswer(question, answer, context);
                    return (
                      <tr key={question.questionId}>
                        <th scope="row">
                          {question.officialText}
                          <span className="option__hint">{question.questionId}</span>
                        </th>
                        <td className={result.complete ? 'answer' : 'missing'}>
                          {result.complete ? formatAnswer(question, answer) : '확인 필요'}
                        </td>
                        <td>
                          <button type="button" className="review-row-btn" onClick={() => onJump(question.questionId)}>
                            수정
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}

      {showIncomplete && incompleteCount > 0 && (
        <p className="field-error" role="alert">
          답하지 않은 문항이 남아 있어 완료할 수 없습니다. 확인 필요 표시를 누르면 해당 문항으로 이동합니다.
        </p>
      )}

      <div className="btn-row btn-row--end no-print">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          문항으로 돌아가기
        </button>
        <button type="button" className="btn btn--primary" onClick={onFinish} disabled={incompleteCount > 0}>
          작성 완료
        </button>
      </div>
    </div>
  );
}
