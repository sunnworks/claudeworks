import { useEffect } from 'react';
import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import { formatAnswer } from '../domain/answerFormat';
import { visibleQuestionsOfModule } from '../domain/questionnaireEngine';
import type { EvaluationContext } from '../domain/rules';
import { validateAnswer } from '../domain/validation';
import type { UnknownFlags } from '../domain/unknown';
import type { ModuleDefinition } from '../domain/types';

interface Props {
  modules: ModuleDefinition[];
  context: EvaluationContext;
  unknownFlags: UnknownFlags;
  incompleteCount: number;
  showIncomplete: boolean;
  onJump: (questionId: string) => void;
  onFinish: () => void;
  onBack: () => void;
}

/** S09 전체 답변 검토와 수정 */
const CAPTION = '답한 내용을 확인하세요. 고치고 싶으면 고치기를 누르세요.';

export function ReviewScreen({
  modules,
  context,
  unknownFlags,
  incompleteCount,
  showIncomplete,
  onJump,
  onFinish,
  onBack,
}: Props) {
  const { setPrimary } = useSignVideo();

  useEffect(() => {
    setPrimary({ caption: CAPTION, kind: '안내', key: 'screen-review' });
  }, [setPrimary]);

  return (
    <div>
      <div className="card">
        <h2 className="screen-title">
          <span>답한 내용을 확인하세요</span>
          <SignButton label={CAPTION} kind="안내" variant="main" className="sign-btn sign-btn--main" />
        </h2>

        {incompleteCount > 0 ? (
          <p className="question-sub" aria-live="polite">
            아직 답하지 않은 질문이 {incompleteCount}개 있습니다.
          </p>
        ) : (
          <p className="question-sub" aria-live="polite">
            모두 답했습니다.
          </p>
        )}
      </div>

      {modules.map((module) => {
        const questions = visibleQuestionsOfModule(module.moduleId, context);
        const missing = questions.filter(
          (question) =>
            unknownFlags[question.questionId] !== true &&
            !validateAnswer(question, context.answers[question.questionId], context).complete,
        ).length;

        return (
          <details className="review-module" key={module.moduleId} open={missing > 0}>
            <summary>
              {module.title} {questions.length}개
              {missing > 0 ? (
                <span className="chip" style={{ background: '#fdeaef', color: '#a4123a', borderColor: '#e2909f' }}>
                  {missing}개 남음
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
                    const isUnknown = unknownFlags[question.questionId] === true;
                    return (
                      <tr key={question.questionId}>
                        <th scope="row">
                          {question.officialText}
                        </th>
                        <td className={isUnknown ? 'unknown' : result.complete ? 'answer' : 'missing'}>
                          {isUnknown
                            ? '잘 모르겠어요'
                            : result.complete
                              ? formatAnswer(question, answer)
                              : '아직 답 안 함'}
                        </td>
                        <td>
                          <button type="button" className="review-row-btn" onClick={() => onJump(question.questionId)}>
                            고치기
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
          답하지 않은 질문이 남아 있습니다.
        </p>
      )}

      <div className="btn-row btn-row--end no-print">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          질문으로 돌아가기
        </button>
        <button type="button" className="btn btn--primary btn--wide" onClick={onFinish} disabled={incompleteCount > 0}>
          작성 완료
        </button>
      </div>
    </div>
  );
}
