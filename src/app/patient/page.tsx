'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SignAvatarPlayer } from '@/components/SignAvatarPlayer';
import { api } from '@/lib/client/api';
import { QUESTION_LABELS, QUESTION_TYPES, type PatientPayload, type QuestionType } from '@/lib/types';

type Phase = 'WAITING' | 'READY' | 'PLAYING' | 'DONE' | 'QUESTION_SENT';

const POLL_MS = 1500;

/** U01 환자 대기 → U02 안내 시작 → U03 수어 재생 → U04 이해 확인 */
function PatientScreen() {
  const params = useSearchParams();
  const sessionId = params.get('session');
  const fromPharmacist = params.get('from') === 'pharmacist';

  const [payload, setPayload] = useState<PatientPayload | null>(null);
  const [phase, setPhase] = useState<Phase>('WAITING');
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    if (sessionId === null) return;
    try {
      const next = await api.patient(sessionId);
      setPayload(next);
      setError(null);
      setPhase((current) => {
        if (!next.approved) return 'WAITING';
        if (current === 'WAITING') return 'READY';
        return current;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '연결을 확인하고 다시 시도해 주세요.');
    }
  }, [sessionId]);

  useEffect(() => {
    void poll();
    // 승인 상태와 약사의 재전송을 감지하기 위해 폴링한다 (C 2 권장: 세션코드와 폴링).
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  async function react(type: string, extra?: { questionType?: QuestionType; playbackRate?: number }) {
    if (sessionId === null) return;
    try {
      await api.reaction(sessionId, { type, questionType: extra?.questionType, playbackRate: extra?.playbackRate });
    } catch {
      // 환자 화면에서는 기록 실패를 노출하지 않는다.
    }
  }

  if (sessionId === null) {
    return (
      <Frame>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-2xl font-bold">세션 정보가 없습니다.</p>
          <p className="text-lg text-white/70">약사에게 문의해 주세요.</p>
        </div>
      </Frame>
    );
  }

  // U01 대기화면 — 승인 전에는 복약정보를 표시하지 않는다.
  if (payload === null || !payload.approved) {
    return (
      <Frame backLink={fromPharmacist ? `/pharmacist/approve?session=${sessionId}` : null}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div aria-hidden className="text-7xl">
            🤟
          </div>
          <h1 className="text-3xl font-extrabold md:text-4xl">농인 환자를 위한 수어 복약안내</h1>
          <p className="text-xl text-white/80 md:text-2xl">
            {payload?.message ?? '약사가 수어 복약안내를 준비하고 있습니다'}
          </p>
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-base font-bold text-white/70">
            <span aria-hidden className="animate-pulse">
              ◐
            </span>
            약사 승인을 기다리는 중입니다
          </div>
          {error !== null && <p className="text-base text-white/60">{error}</p>}
        </div>
      </Frame>
    );
  }

  const cards = payload.cards
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((card) => ({ cardId: card.cardId, displayText: card.displayText, gloss: card.signPayload.gloss }));

  // U02 안내 시작
  if (phase === 'READY') {
    return (
      <Frame backLink={fromPharmacist ? `/pharmacist/approve?session=${sessionId}` : null}>
        <div className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
          <div aria-hidden className="text-7xl">
            🤟
          </div>
          <h1 className="text-3xl font-extrabold md:text-4xl">약 먹는 방법을 수어로 안내합니다</h1>
          <p className="text-xl text-white/80">준비가 되면 안내 시작을 눌러 주세요</p>
          <button
            type="button"
            className="btn-patient bg-brand px-14 py-6 text-2xl text-white hover:bg-brand-dark"
            onClick={() => {
              setPhase('PLAYING');
              void react('PLAY_STARTED');
            }}
          >
            <span aria-hidden>▶</span> 안내 시작
          </button>
          <p className="text-base text-white/50">수어와 함께 한국어 자막이 표시됩니다.</p>
        </div>
      </Frame>
    );
  }

  // U04 이해 확인
  if (phase === 'DONE' || phase === 'QUESTION_SENT') {
    return (
      <Frame backLink={fromPharmacist ? `/pharmacist/complete?session=${sessionId}` : null}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          {phase === 'QUESTION_SENT' ? (
            <>
              <div aria-hidden className="text-7xl">
                💬
              </div>
              <h1 className="text-3xl font-extrabold md:text-4xl">약사에게 질문을 전달했습니다</h1>
              <p className="text-xl text-white/80">잠시 기다려 주세요</p>
            </>
          ) : (
            <>
              <div aria-hidden className="text-7xl">
                ✓
              </div>
              <h1 className="text-3xl font-extrabold md:text-4xl">복약안내가 끝났습니다</h1>
              <p className="text-xl text-white/80">궁금한 점은 약사에게 문의해 주세요</p>
            </>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="btn-patient bg-white/15 text-white hover:bg-white/25"
              onClick={() => {
                setPhase('PLAYING');
                void react('REPLAY');
              }}
            >
              <span aria-hidden>↺</span> 다시 보기
            </button>
            <button
              type="button"
              className="btn-patient bg-white/15 text-white hover:bg-white/25"
              onClick={() => {
                setPhase('PLAYING');
                void react('SLOW', { playbackRate: 0.7 });
              }}
            >
              <span aria-hidden>🐢</span> 천천히 보기
            </button>
          </div>

          <div className="w-full max-w-3xl rounded-2xl bg-white/5 p-5">
            <p className="mb-3 text-lg font-bold text-white/70">약사에게 질문하기</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUESTION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="btn-patient bg-white/10 text-white hover:bg-white/20"
                  onClick={() => {
                    setPhase('QUESTION_SENT');
                    void react('QUESTION', { questionType: type });
                  }}
                >
                  {QUESTION_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-patient bg-ok px-12 text-xl text-white hover:brightness-110"
            onClick={() => void react('UNDERSTOOD')}
          >
            <span aria-hidden>✓</span> 이해했습니다
          </button>
        </div>
      </Frame>
    );
  }

  // U03 수어 재생
  return (
    <Frame fill backLink={fromPharmacist ? `/pharmacist/complete?session=${sessionId}` : null}>
      <div className="flex min-h-0 flex-1 flex-col">
        <SignAvatarPlayer
          cards={cards}
          segments={payload.avatar?.segments ?? []}
          playbackType={payload.avatar?.playbackType ?? 'placeholder'}
          playbackUrl={payload.avatar?.playbackUrl ?? null}
          playbackRate={payload.playbackRate}
          focusCardId={payload.focusCardId}
          autoStart
          onEvent={(event) => {
            void react(event);
            if (event === 'PLAY_COMPLETED') setPhase('DONE');
          }}
          extraControls={
            <>
              <button
                type="button"
                className="btn-patient bg-white/15 text-white hover:bg-white/25"
                onClick={() => void react('SLOW', { playbackRate: 0.7 })}
              >
                <span aria-hidden>🐢</span> 천천히
              </button>
              <button
                type="button"
                className="btn-patient bg-white/15 text-white hover:bg-white/25"
                onClick={() => setPhase('DONE')}
              >
                <span aria-hidden>✓</span> 안내 확인
              </button>
            </>
          }
        />
      </div>
    </Frame>
  );
}

/**
 * 환자 화면 공통 프레임 — 가로형 태블릿 우선, 큰 터치영역.
 * fill이 true면 화면 높이에 맞춰 아바타 영역이 남은 공간을 모두 차지한다 (설계서 9 2).
 */
function Frame({
  children,
  backLink,
  fill = false,
}: {
  children: React.ReactNode;
  backLink?: string | null;
  fill?: boolean;
}) {
  return (
    <div
      className={[
        'flex flex-col bg-patient-bg px-5 py-4 text-white md:px-8 md:py-6',
        fill ? 'h-dvh overflow-hidden' : 'min-h-dvh',
      ].join(' ')}
    >
      <div className="mb-3 flex flex-none items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="chip bg-white/10 text-white/80">
            <span aria-hidden>🤟</span> 수어 복약안내
          </span>
          <span className="chip bg-warn-soft text-warn">
            <span aria-hidden>⚠</span> 시연용 가상 데이터
          </span>
        </div>
        {backLink != null && (
          <Link href={backLink} className="chip bg-white/10 text-white/70">
            약사 화면으로
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-patient-bg p-8 text-center text-white">불러오는 중…</div>}>
      <PatientScreen />
    </Suspense>
  );
}
