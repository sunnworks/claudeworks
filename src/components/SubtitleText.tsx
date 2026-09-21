'use client';

import { Fragment } from 'react';

/**
 * 자막 강조 — 약품명, 숫자, 복용시점을 굵게 표시한다 (설계서 8 6 / 부록 C 9).
 * 수어와 자막의 숫자·단위 표현은 동일해야 한다 (설계서 12 1 원칙 4).
 */
const EMPHASIS = /(\d+\s*(?:번|회|포|정|캡슐|알|일|분|시간|mL)?|하루|아침|점심|저녁|식후|식전|취침\s*전|공복|필요할\s*때|시연용\s*[A-Z][가-힣A-Za-z]*)/g;

export function SubtitleText({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(EMPHASIS);

  return (
    <p className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={`${part}-${index}`} className="font-extrabold text-white underline decoration-brand decoration-4 underline-offset-4">
            {part}
          </strong>
        ) : (
          <Fragment key={`${part}-${index}`}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

/** 약사 미리보기용 — 어두운 배경이 아닌 곳에서 사용 */
export function SubtitlePreview({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(EMPHASIS);
  return (
    <p className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={`${part}-${index}`} className="font-extrabold text-brand-dark">
            {part}
          </strong>
        ) : (
          <Fragment key={`${part}-${index}`}>{part}</Fragment>
        ),
      )}
    </p>
  );
}
