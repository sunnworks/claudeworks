'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PharmacistShell } from '@/components/PharmacistShell';
import { SubtitlePreview } from '@/components/SubtitleText';
import { api } from '@/lib/client/api';
import type { GuidanceCard, Session } from '@/lib/types';

const TYPE_LABELS: Record<GuidanceCard['type'], string> = {
  INTRO: '안내 시작',
  DOSING: '복용량·횟수',
  FREQUENCY: '복용횟수',
  TIMING: '복용시점',
  DURATION: '복용기간',
  AS_NEEDED: '필요시 복용',
  CAUTION: '주의사항',
  STORAGE: '보관',
  ADVERSE_REACTION: '이상반응',
  PHARMACIST_NOTE: '약사 입력',
  CLOSING: '안내 종료',
};

const SOURCE_LABELS: Record<GuidanceCard['sourceType'], string> = {
  BAG_OCR: '약봉투 OCR',
  REVIEWED_PHRASE_DB: '검수 문구DB',
  PHARMACIST_INPUT: '약사 직접입력',
};

/** P06 안내카드 편집 — 필수·선택카드, 문구 미리보기, 순서변경 */
function ComposePage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session');

  const [session, setSession] = useState<Session | null>(null);
  const [newText, setNewText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (sessionId === null) return;
    const detail = await api.getSession(sessionId);
    if (detail.session.cards.length === 0) {
      const composed = await api.compose(sessionId);
      setSession(composed.session);
      return;
    }
    setSession(detail.session);
  }, [sessionId]);

  useEffect(() => {
    void load().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : '안내카드를 불러오지 못했습니다.'),
    );
  }, [load]);

  async function change(changes: { cardId: string; selected?: boolean; order?: number; displayText?: string }[]) {
    if (sessionId === null) return;
    try {
      const result = await api.patchCards(sessionId, { changes });
      setSession(result.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '변경에 실패했습니다.');
    }
  }

  async function move(card: GuidanceCard, direction: -1 | 1) {
    if (session === null) return;
    const sorted = [...session.cards].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((item) => item.cardId === card.cardId);
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const other = sorted[target]!;
    await change([
      { cardId: card.cardId, order: other.order },
      { cardId: other.cardId, order: card.order },
    ]);
  }

  async function addCard() {
    if (sessionId === null || newText.trim() === '') return;
    setBusy(true);
    try {
      const result = await api.patchCards(sessionId, { addText: newText });
      setSession(result.session);
      setNewText('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '문구를 추가하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (sessionId === null || session === null) {
    return (
      <PharmacistShell step="안내구성" title="안내카드를 불러오는 중입니다">
        {error !== null && <p className="text-sm font-semibold text-danger">{error}</p>}
      </PharmacistShell>
    );
  }

  const cards = [...session.cards].sort((a, b) => a.order - b.order);
  const selected = cards.filter((card) => card.selected);

  return (
    <PharmacistShell
      step="안내구성"
      title="환자에게 안내할 문장을 최종 확인해 주세요"
      description="선택한 문장만 환자 화면의 수어와 자막으로 전달됩니다. 약봉투에 없는 내용은 자동으로 만들지 않습니다."
      sessionId={sessionId}
      pharmacyName={session.pharmacyName}
      footer={
        <>
          <span className="mr-auto text-sm font-bold">
            선택된 문장 {selected.length}개 / 전체 {cards.length}개
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push(`/pharmacist/review?session=${sessionId}`)}
          >
            인식 결과로 돌아가기
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={selected.length === 0}
            onClick={() => router.push(`/pharmacist/approve?session=${sessionId}`)}
          >
            수어 안내 승인으로 이동
          </button>
        </>
      }
    >
      {error !== null && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          <span aria-hidden>✕</span> {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="space-y-2">
          {cards.map((card, index) => (
            <article
              key={card.cardId}
              className={[
                'card p-3.5',
                card.selected ? 'border-brand/50 bg-brand-soft/30' : 'opacity-75',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip bg-canvas text-ink-soft">{index + 1}</span>
                  <span className="chip bg-canvas text-ink">{TYPE_LABELS[card.type]}</span>
                  {card.required ? (
                    <span className="chip bg-danger-soft text-danger">
                      <span aria-hidden>★</span> 필수
                    </span>
                  ) : (
                    <span className="chip bg-canvas text-ink-soft">선택</span>
                  )}
                  <span className="chip bg-canvas text-ink-soft">{SOURCE_LABELS[card.sourceType]}</span>
                  {card.pharmacistAuthored && (
                    <span className="chip bg-warn-soft text-warn">
                      <span aria-hidden>✎</span> 약사 책임 문구
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="위로 이동"
                    className="btn-secondary min-h-10 px-3"
                    onClick={() => void move(card, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="아래로 이동"
                    className="btn-secondary min-h-10 px-3"
                    onClick={() => void move(card, 1)}
                  >
                    ↓
                  </button>
                  <label className="btn-secondary min-h-10 cursor-pointer px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={card.selected}
                      onChange={(event) => void change([{ cardId: card.cardId, selected: event.target.checked }])}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    {card.selected ? '포함' : '제외'}
                  </label>
                </div>
              </div>

              <SubtitlePreview text={card.displayText} className="mt-2.5 text-lg font-bold leading-relaxed" />

              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
                  수어 글로스 · 템플릿 보기
                </summary>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="font-mono text-xs text-ink-soft">{card.signPayload.templateId}</span>
                  {card.signPayload.gloss.map((gloss, position) => (
                    <span key={`${gloss}-${position}`} className="chip bg-canvas text-ink">
                      {gloss}
                    </span>
                  ))}
                </div>
              </details>
            </article>
          ))}

          <div className="card p-3.5">
            <label htmlFor="new-card" className="text-sm font-bold">
              약사 입력카드 추가
            </label>
            <p className="mt-1 text-xs text-ink-soft">
              직접 입력한 문장은 약사 책임 문구로 표시되며, 수어는 승인된 대체표현으로 전달됩니다.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                id="new-card"
                className="field-input"
                value={newText}
                maxLength={120}
                placeholder="예: 물을 충분히 마시면서 드세요."
                onChange={(event) => setNewText(event.target.value)}
              />
              <button type="button" className="btn-secondary" disabled={busy || newText.trim() === ''} onClick={() => void addCard()}>
                문구 추가
              </button>
            </div>
          </div>
        </section>

        <section className="card sticky top-36 h-fit p-4">
          <h2 className="text-base font-extrabold">환자 자막 미리보기</h2>
          <p className="mt-1 text-xs text-ink-soft">한 화면에 한 문장씩 표시되며 숫자와 복용시점을 강조합니다.</p>
          <ol className="mt-3 space-y-2">
            {selected.map((card, index) => (
              <li key={card.cardId} className="rounded-xl bg-patient-bg px-4 py-3">
                <p className="mb-1 text-xs font-bold text-white/50">{index + 1} / {selected.length}</p>
                <SubtitlePreview text={card.displayText} className="text-base font-bold leading-relaxed text-white" />
              </li>
            ))}
          </ol>
          {selected.length === 0 && (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
              <span aria-hidden>✕</span> 선택된 문장이 없어 승인할 수 없습니다.
            </p>
          )}
        </section>
      </div>
    </PharmacistShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">불러오는 중…</div>}>
      <ComposePage />
    </Suspense>
  );
}
