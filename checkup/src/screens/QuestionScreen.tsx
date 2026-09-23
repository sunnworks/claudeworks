import { useEffect, useMemo, useRef, useState } from 'react';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { SignButton } from '../components/SignButton';
import { useSignVideo } from '../components/SignVideoContext';
import { findModule } from '../domain/questionnaireEngine';
import type { EvaluationContext } from '../domain/rules';
import type { Answer, QuestionDefinition } from '../domain/types';
import { bulkNoneTargets, supportsUnknownFlag, type UnknownFlags } from '../domain/unknown';
import type { ValidationResult } from '../domain/validation';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  status: ValidationResult;
  context: EvaluationContext;
  positionLabel: string;
  unknown: boolean;
  unknownFlags: UnknownFlags;
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
  unknownFlags,
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

  /** 같은 묶음에서 아직 답하지 않은 문항과 그 질환 이름 */
  const bulkGroup = useMemo(() => {
    if (!question.bulkNoneGroup) return { count: 0, names: [] as string[] };
    const remaining = bulkNoneTargets(context, question.bulkNoneGroup, unknownFlags);
    return {
      count: remaining.length,
      // '뇌졸중 또는 중풍으로 진단을 받았거나...' → '뇌졸중 또는 중풍'
      names: remaining.map((item) => item.officialText.split('으로 진단')[0]),
    };
  }, [question.bulkNoneGroup, context, unknownFlags]);

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

        {question.bulkNoneGroup && bulkGroup.count > 1 && (
          <div className="bulk-none">
            <div className="bulk-none__row">
              <button
                type="button"
                className="btn btn--small btn--ghost"
                onClick={() => onBulkNone(question.bulkNoneGroup!)}
              >
                앓은 적 없는 병 {bulkGroup.count}가지를 한 번에 “해당 없음”
              </button>
              <SignButton
                label={`앓은 적 없는 병 ${bulkGroup.count}가지를 한 번에 해당 없음으로 표시합니다. ${bulkGroup.names
                  .slice(0, 3)
                  .join(', ')} 등입니다.`}
                className="sign-btn"
              />
            </div>
            <p className="field__hint">
              {bulkGroup.names.slice(0, 3).join(', ')} 등 {bulkGroup.count}가지입니다. 이미 답한 질문은 그대로
              둡니다.
            </p>
          </div>
        )}

        <div className="question-actions">
          {canMarkUnknown && (
            <>
              <button
                type="button"
                className={`btn btn--small ${unknown ? 'btn--primary' : 'btn--ghost'}`}
                onClick={onToggleUnknown}
              >
                {unknown ? '✔ 잘 모르겠어요' : '잘 모르겠어요'}
              </button>
              <SignButton
                label="잘 모르겠어요. 억지로 고르지 않아도 됩니다. 병원에서 같이 확인합니다."
                className="sign-btn"
              />
            </>
          )}
          {extraHelp && (
            <button type="button" className="question-help-toggle" onClick={() => setShowHelp(!showHelp)}>
              {showHelp ? '설명 닫기' : '이게 무슨 말인가요?'}
            </button>
          )}
        </div>

        {unknown && (
          <p className="question-sub">
            병원에서 같이 확인합니다.
            <SignButton
              label="잘 모르겠다고 표시했습니다. 병원에서 같이 확인합니다."
              kind="안내"
              className="sign-btn sign-btn--inline"
            />
          </p>
        )}

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
