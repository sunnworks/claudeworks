'use client';

import { SignAvatarPlayer } from '@/components/SignAvatarPlayer';
import type { SharedContent } from '@/lib/types';

/** QR 재열람 화면 — 수어 재생, 자막, 처음부터, 천천히만 제공한다 (설계서 8 8 4번) */
export function ShareViewer({
  content,
  expiryLabel,
  remainingHours,
}: {
  content: SharedContent;
  expiryLabel: string;
  remainingHours: number;
}) {
  const cards = content.cards
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((card) => ({ cardId: card.cardId, displayText: card.displayText, gloss: card.signPayload.gloss }));

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-patient-bg px-4 py-4 text-white md:px-8 md:py-6">
      <header className="mb-3 flex flex-none flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-white/10 text-white/80">
            <span aria-hidden>🤟</span> 복약안내 다시보기
          </span>
          <span className="chip bg-warn-soft text-warn">
            <span aria-hidden>⚠</span> 시연용 가상 데이터
          </span>
        </div>
        <span className="text-xs font-bold text-white/60">
          {expiryLabel}까지 · 남은 시간 {Math.floor(remainingHours)}시간
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <SignAvatarPlayer
          cards={cards}
          segments={content.avatar?.segments ?? []}
          playbackType={content.avatar?.playbackType ?? 'placeholder'}
          playbackUrl={content.avatar?.playbackUrl ?? null}
          playbackRate={1}
        />
      </div>

      <footer className="mt-3 flex-none space-y-1 text-xs leading-5 text-white/45">
        <p>
          {content.pharmacyName} · 약사 승인 {new Date(content.approvedAt).toLocaleString('ko-KR')} · 콘텐츠 버전{' '}
          {content.contentVersion}
        </p>
        <p>이 화면은 약사가 승인한 안내를 다시 보여줍니다. 내용 수정과 추가 의료정보 조회는 제공하지 않습니다.</p>
      </footer>
    </main>
  );
}
