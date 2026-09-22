import { useEffect, useMemo, useRef, useState } from 'react';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import { findModule, visibleQuestionsOfModule } from '../domain/questionnaireEngine';
import type { EvaluationContext } from '../domain/rules';
import type { Answer, QuestionDefinition } from '../domain/types';
import { supportsUnknownFlag } from '../domain/unknown';
import type { ValidationResult } from '../domain/validation';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  status: ValidationResult;
  context: EvaluationContext;
  positionLabel: string;
  unknown: boolean;
  onToggleUnknown: () => void;
  onChange: (answer: Answer | undefined) => void;
  onBulkNone: (group: string) => void;
  onPrev: () => void;
  onNext: () => void;
  isLast: boolean;
}

/** S05·S06 문항 작성 화면 */
export function QuestionScreen({
  question,
  answer,
  status,
  context,
  positionLabel,
  unknown,
  onToggleUnknown,
  onChange,
  onBulkNone,
  onPrev,
  onNext,
  isLast,
}: Props) {
  const [showErrors, setShowErrors] = useState(false);
  const { setPrimary } = useSignVideo();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const module = findModule(question.moduleId);
  const canMarkUnknown = supportsUnknownFlag(question);

  useEffect(() => {
    setShowErrors(false);
    setPrimary({
      caption: question.officialText,
      kind: '문항',
      key: question.questionId,
      signAssetId: question.signAssetId,
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
    headingRef.current?.focus();
  }, [question.questionId, question.officialText, question.signAssetId, setPrimary]);

  const bulkGroupRemaining = useMemo(() => {
    if (!question.bulkNoneGroup) return 0;
    return visibleQuestionsOfModule(question.moduleId, context).filter(
      (item) => item.bulkNoneGroup === question.bulkNoneGroup,
    ).length;
  }, [question.bulkNoneGroup, question.moduleId, context]);

  const handleNext = () => {
    if (!unknown && !status.complete) {
      setShowErrors(true);
      return;
    }
    onNext();
  };

  return (
    <>
      <div className="card">
        <div className="question-head">
          <span className="chip">{module?.title}</span>
          <span className="chip chip--muted">{positionLabel}</span>
          <span className="chip chip--muted">{question.questionId}</span>
          {!question.required && <span className="chip chip--muted">선택 문항</span>}
        </div>

        {module?.purposeNotice && (
          <div className="notice notice--info">
            <strong>
              이 문항을 묻는 이유
              <SignButton label={module.purposeNotice} kind="안내" className="sign-btn sign-btn--inline" />
            </strong>
            {module.purposeNotice}
          </div>
        )}

        {module?.instrumentNotice && (
          <div className="notice notice--info">
            <strong>
              검증형 평가도구
              <SignButton label={module.instrumentNotice} kind="안내" className="sign-btn sign-btn--inline" />
            </strong>
            {module.instrumentNotice}
          </div>
        )}

        <h2 className="question-official" id={`${question.questionId}-label`} tabIndex={-1} ref={headingRef}>
          {question.officialText}
          <SignButton
            label={question.officialText}
            kind="문항"
            signAssetId={question.signAssetId}
            className="sign-btn sign-btn--inline"
          />
        </h2>

        {question.easyText && (
          <p className="question-easy">
            쉬운 설명 · {question.easyText}
            <SignButton label={question.easyText} kind="안내" className="sign-btn sign-btn--inline" />
          </p>
        )}
        {question.helpText && (
          <p className="question-help">
            도움말 · {question.helpText}
            <SignButton label={question.helpText} kind="안내" className="sign-btn sign-btn--inline" />
          </p>
        )}

        <QuestionRenderer question={question} answer={answer} context={context} onChange={onChange} />

        {canMarkUnknown && (
          <div className={`unknown-box${unknown ? ' unknown-box--on' : ''}`}>
            <div className="unknown-box__row">
              <button type="button" className={`btn btn--small ${unknown ? 'btn--primary' : 'btn--ghost'}`} onClick={onToggleUnknown}>
                {unknown ? '✔ 잘 모르겠음으로 표시함' : '잘 모르겠어요'}
              </button>
              <SignButton label="잘 모르겠어요" className="sign-btn" />
            </div>
            <p className="field__hint">
              {unknown
                ? '값을 저장하지 않고 검진 당일 의료진이 확인할 문항으로 표시했습니다. 답을 고르면 표시가 없어집니다.'
                : '이 문항의 공식 응답에는 모름이 없습니다. 모르겠으면 억지로 고르지 말고 이 버튼을 누르세요. 의료진 확인 문항으로만 남습니다.'}
            </p>
          </div>
        )}

        {question.bulkNoneGroup && bulkGroupRemaining > 1 && (
          <div className="btn-row" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => onBulkNone(question.bulkNoneGroup!)}
            >
              이 그룹 {bulkGroupRemaining}개 문항을 모두 “해당 없음”으로 표시
            </button>
            <SignButton label="이 그룹 문항을 모두 해당 없음으로 표시" className="sign-btn" />
          </div>
        )}

        <div aria-live="assertive" role="status">
          {showErrors &&
            status.errors.map((error) => (
              <p className="field-error" key={error}>
                {error}
              </p>
            ))}
        </div>
      </div>

      <div className="navbar">
        <div className="navbar__inner">
          <SignButton label="이전 문항으로 돌아가기" kind="버튼" className="sign-btn" />
          <button type="button" className="btn btn--ghost" onClick={onPrev}>
            이전
          </button>
          <button type="button" className="btn btn--primary" onClick={handleNext}>
            {isLast ? '답변 검토하기' : '다음'}
          </button>
          <SignButton label={isLast ? '답변 검토하기' : '다음 문항으로 가기'} kind="버튼" className="sign-btn" />
        </div>
      </div>
    </>
  );
}
