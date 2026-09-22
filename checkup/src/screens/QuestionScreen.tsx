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

/**
 * 문항 화면.
 * 수어영상이 가장 크고, 바로 아래에 질문 한 문장과 선택지가 온다.
 * 설명 글은 최소로 두고 필요할 때만 펼친다.
 */
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
  const [showHelp, setShowHelp] = useState(false);
  const { setPrimary } = useSignVideo();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const module = findModule(question.moduleId);
  const canMarkUnknown = supportsUnknownFlag(question);
  const extraHelp = [question.helpText, module?.purposeNotice, module?.instrumentNotice]
    .filter((text): text is string => Boolean(text))
    .join('\n');

  useEffect(() => {
    setShowErrors(false);
    setShowHelp(false);
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
      <div className="card" data-question-id={question.questionId}>
        <div className="question-head">
          <span className="chip">{module?.title}</span>
          <span className="chip chip--muted">{positionLabel}</span>
        </div>

        <h2 className="question-official" id={`${question.questionId}-label`} tabIndex={-1} ref={headingRef}>
          <span>{question.officialText}</span>
          <SignButton
            label={question.officialText}
            kind="문항"
            signAssetId={question.signAssetId}
            variant="main"
            className="sign-btn sign-btn--main"
          />
        </h2>

        {question.easyText && <p className="question-sub">{question.easyText}</p>}

        <QuestionRenderer question={question} answer={answer} context={context} onChange={onChange} />

        {question.bulkNoneGroup && bulkGroupRemaining > 1 && (
          <div className="btn-row" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => onBulkNone(question.bulkNoneGroup!)}
            >
              여기 {bulkGroupRemaining}개 모두 “없음”으로
            </button>
          </div>
        )}

        <div className="question-actions">
          {canMarkUnknown && (
            <button
              type="button"
              className={`btn btn--small ${unknown ? 'btn--primary' : 'btn--ghost'}`}
              onClick={onToggleUnknown}
            >
              {unknown ? '✔ 잘 모르겠어요' : '잘 모르겠어요'}
            </button>
          )}
          {extraHelp && (
            <button type="button" className="question-help-toggle" onClick={() => setShowHelp(!showHelp)}>
              {showHelp ? '설명 닫기' : '이게 무슨 말인가요?'}
            </button>
          )}
        </div>

        {unknown && <p className="question-sub">모르는 문항으로 표시했어요. 병원에서 같이 확인합니다.</p>}

        {showHelp && extraHelp && (
          <p className="question-help-body">
            {extraHelp}
            <SignButton label={extraHelp} kind="안내" className="sign-btn sign-btn--inline" />
          </p>
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
          <button type="button" className="btn btn--ghost" onClick={onPrev}>
            이전
          </button>
          <button type="button" className="btn btn--primary" onClick={handleNext}>
            {isLast ? '다 했어요' : '다음'}
          </button>
        </div>
      </div>
    </>
  );
}
