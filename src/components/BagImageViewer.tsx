'use client';

import type { BBox, MedicationBag } from '@/lib/types';

/**
 * 약봉투 원문 이미지 — 선택한 필드의 원문 영역을 강조한다 (설계서 9 1).
 * 환자명 영역은 마스킹 상태로 표시한다 (설계서 8 3 5번).
 */
export function BagImageViewer({
  bag,
  highlight,
  maskPatientName = true,
}: {
  bag: MedicationBag;
  highlight: BBox | null;
  maskPatientName?: boolean;
}) {
  const quality = bag.imageQuality;
  const qualityStyle =
    quality.status === 'PASS'
      ? 'bg-ok-soft text-ok'
      : quality.status === 'REVIEW'
        ? 'bg-warn-soft text-warn'
        : 'bg-danger-soft text-danger';
  const qualityLabel =
    quality.status === 'PASS' ? '사용 가능' : quality.status === 'REVIEW' ? '품질 확인' : '재촬영 필요';

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{bag.label}</span>
          <span className={`chip ${qualityStyle}`}>
            <span aria-hidden>{quality.status === 'PASS' ? '✓' : quality.status === 'REVIEW' ? '!' : '✕'}</span>
            {qualityLabel}
          </span>
          {bag.asNeededBag && (
            <span className="chip bg-brand-soft text-brand-dark">
              <span aria-hidden>◆</span> 필요시약
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-ink-soft">
          흐림 {quality.blur.toFixed(2)} · 반사 {quality.glare.toFixed(2)}
        </span>
      </div>

      <div className="relative bg-canvas">
        {bag.imageRef === '' ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-ink-soft">
            <span aria-hidden className="text-2xl">
              🗑
            </span>
            <p>약봉투 이미지가 폐기되었습니다.</p>
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bag.imageRef} alt={`${bag.label} 원문 이미지`} className="block w-full" />
            {maskPatientName && (
              // 환자명 위치는 약봉투 양식에 따라 다르다. 표 양식은 머리글 아래 한 줄 위에 있다.
              <div
                className="absolute flex items-center justify-center rounded bg-ink text-[10px] font-bold text-white"
                style={
                  bag.imageRef.includes('bag-table')
                    ? { left: '6.5%', top: '13.3%', width: '20%', height: '4.8%' }
                    : { left: '7%', top: '15.2%', width: '26%', height: '5.6%' }
                }
                aria-label="환자명 가림 영역"
              >
                이름은 가립니다
              </div>
            )}
            {highlight !== null && (
              <div
                className="pointer-events-none absolute rounded-md ring-4 ring-brand"
                style={{
                  left: `${highlight.x * 100}%`,
                  top: `${highlight.y * 100}%`,
                  width: `${highlight.w * 100}%`,
                  height: `${highlight.h * 100}%`,
                  background: 'rgba(13, 91, 212, 0.14)',
                }}
                aria-hidden
              />
            )}
          </>
        )}
      </div>

      {quality.messages.length > 0 && (
        <ul className="space-y-1 border-t border-line bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
          {quality.messages.map((message) => (
            <li key={message} className="flex gap-1.5">
              <span aria-hidden>✕</span>
              {message}
            </li>
          ))}
        </ul>
      )}

      {bag.imageRef.startsWith('data:') && (
        <p className="border-t border-line bg-brand-soft px-3 py-2 text-xs font-semibold text-brand-dark">
          <span aria-hidden>ℹ</span> 촬영한 이미지입니다. 인쇄물 촬영 시연에서는 원문 강조 위치가 약간 어긋날 수
          있습니다.
        </p>
      )}

      <details className="border-t border-line px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-ink-soft">OCR 원문 텍스트 보기</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-canvas p-2 text-xs leading-5 text-ink">
          {bag.rawText === '' ? '(인식된 문자 없음)' : bag.rawText}
        </pre>
      </details>
    </div>
  );
}
