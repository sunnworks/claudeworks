import { useEffect, useMemo, useRef, useState } from 'react';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { SignVideoPanel, type SignVideoRequest } from '../components/SignVideoPanel';
import { findModule, visibleQuestionsOfModule } from '../domain/questionnaireEngine';
import type { EvaluationContext } from '../domain/rules';
import type { Answer, QuestionDefinition } from '../domain/types';
import type { ValidationResult } from '../domain/validation';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  status: ValidationResult;
  context: EvaluationContext;
  positionLabel: string;
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
  onChange,
  onBulkNone,
  onPrev,
  onNext,
  isLast,
}: Props) {
  const [showErrors, setShowErrors] = useState(false);
  const [videoRequest, setVideoRequest] = useState<SignVideoRequest>({
    caption: question.officialText,
    kind: '문항',
    key: question.questionId,
    signAssetId: question.signAssetId,
  });
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const module = findModule(question.moduleId);

  useEffect(() => {
    setShowErrors(false);
    setVideoRequest({
      caption: question.officialText,
      kind: '문항',
      key: question.questionId,
      signAssetId: question.signAssetId,
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
    headingRef.current?.focus();
  }, [question.questionId, question.officialText, question.signAssetId]);

  const bulkGroupRemaining = useMemo(() => {
    if (!question.bulkNoneGroup) return 0;
    return visibleQuestionsOfModule(question.moduleId, context).filter(
      (item) => item.bulkNoneGroup === question.bulkNoneGroup,
    ).length;
  }, [question.bulkNoneGroup, question.moduleId, context]);

  const handleNext = () => {
    if (!status.complete) {
      setShowErrors(true);
      return;
    }
    onNext();
  };

  return (
    <div className="question-layout">
      <div className="question-layout__video">
        <SignVideoPanel request={videoRequest} />
        <p className="field__hint" style={{ marginTop: 8 }}>
          선택지 옆 <strong>수어 보기</strong>를 누르면 그 선택지의 수어영상이 이 자리에서 재생됩니다.
        </p>
      </div>

      <div>
        <div className="card">
          <div className="question-head">
            <span className="chip">{module?.title}</span>
            <span className="chip chip--muted">{positionLabel}</span>
            <span className="chip chip--muted">{question.questionId}</span>
            {!question.required && <span className="chip chip--muted">선택 문항</span>}
          </div>

          {module?.instrumentNotice && (
            <div className="notice notice--info">
              <strong>검증형 평가도구</strong>
              {module.instrumentNotice}
            </div>
          )}

          <h2 className="question-official" id={`${question.questionId}-label`} tabIndex={-1} ref={headingRef}>
            {question.officialText}
          </h2>

          {question.easyText && <p className="question-easy">쉬운 설명 · {question.easyText}</p>}
          {question.helpText && <p className="question-help">도움말 · {question.helpText}</p>}

          <QuestionRenderer
            question={question}
            answer={answer}
            context={context}
            onChange={onChange}
            onPlayOptionVideo={(label) =>
              setVideoRequest({
                caption: label,
                kind: '선택지',
                key: `${question.questionId}-${label}-${Date.now()}`,
                autoPlay: true,
              })
            }
          />

          {question.bulkNoneGroup && bulkGroupRemaining > 1 && (
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="btn btn--small btn--ghost"
                onClick={() => onBulkNone(question.bulkNoneGroup!)}
              >
                이 그룹 {bulkGroupRemaining}개 문항을 모두 “해당 없음”으로 표시
              </button>
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
      </div>

      <div className="navbar">
        <div className="navbar__inner">
          <button type="button" className="btn btn--ghost" onClick={onPrev}>
            이전
          </button>
          <button type="button" className="btn btn--primary" onClick={handleNext}>
            {isLast ? '답변 검토하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
