/**
 * 시연용 가상 데이터 표시 — 부록 C 5 안전 규칙.
 * 모든 화면에 데모 데이터임을 명시한다.
 */
export function DemoBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="chip bg-warn-soft text-warn">
        <span aria-hidden>⚠</span> 시연용 가상 데이터
      </span>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-2 text-sm font-semibold text-warn">
      <span aria-hidden className="text-base leading-5">
        ⚠
      </span>
      <p>
        시연용 가상 데이터입니다. 실제 환자정보·처방·의약품이 아니며, 본 안내로 법정 복약지도 의무가 충족되지
        않습니다.
      </p>
    </div>
  );
}
