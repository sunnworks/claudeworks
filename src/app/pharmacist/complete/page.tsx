'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PharmacistShell } from '@/components/PharmacistShell';
import { QrPanel } from '@/components/QrPanel';
import { SubtitlePreview } from '@/components/SubtitleText';
import { api } from '@/lib/client/api';
import { QUESTION_LABELS } from '@/lib/types';
import type { QuestionType, Session } from '@/lib/types';

interface ShareInfo {
  token: string;
  shareUrl: string;
  issuedAt: string;
  expiresAt: string;
  expiryLabel: string;
}

const POLL_MS = 2000;

/** P08 질문 대응 + P09 완료 + U05 QR 발급 + 48시간 생명주기 확인 */
function CompletePage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session');

  const [session, setSession] = useState<Session | null>(null);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [shareStatus, setShareStatus] = useState<Awaited<ReturnType<typeof api.shareStatus>> | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const poll = useCallback(async () => {
    if (sessionId === null) return;
    try {
      const detail = await api.getSession(sessionId);
      setSession(detail.session);
      if (detail.session.shareId !== null) {
        setShareStatus(await api.shareStatus(detail.session.shareId));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '세션을 불러오지 못했습니다.');
    }
  }, [sessionId]);

  useEffect(() => {
    void poll();
    void api.clock().then((value) => setClockOffset(value.offsetHours)).catch(() => undefined);
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  async function complete() {
    if (sessionId === null) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.complete(sessionId);
      setSession(result.session);
      setShare({
        token: result.token,
        shareUrl: result.shareUrl,
        issuedAt: result.issuedAt,
        expiresAt: result.expiresAt,
        expiryLabel: result.expiryLabel,
      });
      await poll();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '세션을 종료할 수 없습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function resendCard(reactionId: string, cardId: string | null) {
    if (sessionId === null) return;
    const result = await api.resolveQuestion(sessionId, { reactionId, cardId });
    setSession(result.session);
  }

  async function revokeQr() {
    if (session?.shareId == null) return;
    setBusy(true);
    try {
      await api.revokeShare(session.shareId);
      await poll();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'QR을 폐기하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function advance(hours: number) {
    setBusy(true);
    try {
      const result = await api.advanceClock(hours);
      setClockOffset(result.offsetHours);
      await poll();
    } finally {
      setBusy(false);
    }
  }

  async function resetClock() {
    setBusy(true);
    try {
      const result = await api.resetClock();
      setClockOffset(result.offsetHours);
      await poll();
    } finally {
      setBusy(false);
    }
  }

  if (sessionId === null || session === null) {
    return (
      <PharmacistShell step="완료" title="완료 화면을 불러오는 중입니다">
        {error !== null && <p className="text-sm font-semibold text-danger">{error}</p>}
      </PharmacistShell>
    );
  }

  const questions = session.reactions.filter((reaction) => reaction.type === 'QUESTION');
  const openQuestions = questions.filter((reaction) => !reaction.resolved);
  const selected = session.cards.filter((card) => card.selected).sort((a, b) => a.order - b.order);
  const understood = session.reactions.some((reaction) => reaction.type === 'UNDERSTOOD');
  const issued = session.shareId !== null;

  return (
    <PharmacistShell
      step="완료"
      title={issued ? '복약안내가 끝났습니다' : '환자 질문에 대응하고 안내를 종료하세요'}
      description={
        issued
          ? '최종 승인본은 48시간 동안 QR로 다시 볼 수 있습니다. 약봉투 이미지는 폐기되었습니다.'
          : '환자가 이해했습니다를 누르거나 약사가 안내완료를 누르면 현장 세션을 종료합니다.'
      }
      sessionId={sessionId}
      pharmacyName={session.pharmacyName}
      footer={
        <>
          {understood && (
            <span className="mr-auto text-sm font-bold text-ok">
              <span aria-hidden>✓</span> 환자가 이해했습니다를 눌렀습니다
            </span>
          )}
          {!issued ? (
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void complete()}>
              안내완료 · 48시간 QR 발급
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => router.push('/pharmacist')}>
              대시보드로 돌아가기
            </button>
          )}
        </>
      }
    >
      {error !== null && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          <span aria-hidden>✕</span> {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="card p-5">
          <h2 className="text-base font-extrabold">
            환자 질문 {openQuestions.length > 0 && <span className="text-danger">· 대응 필요 {openQuestions.length}건</span>}
          </h2>

          {questions.length === 0 ? (
            <p className="mt-3 rounded-lg bg-canvas px-3 py-6 text-center text-sm text-ink-soft">
              아직 전달된 질문이 없습니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {questions.map((reaction) => (
                <li
                  key={reaction.reactionId}
                  className={[
                    'rounded-xl border-2 p-3',
                    reaction.resolved ? 'border-line opacity-70' : 'border-danger/50 bg-danger-soft/40',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-bold">
                      <span aria-hidden>💬</span>{' '}
                      {QUESTION_LABELS[(reaction.questionType ?? 'OTHER') as QuestionType]}
                    </p>
                    <span className="text-xs text-ink-soft">
                      {new Date(reaction.createdAt).toLocaleTimeString('ko-KR')}
                      {reaction.resolved && ' · 대응 완료'}
                    </span>
                  </div>
                  {!reaction.resolved && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selected.map((card) => (
                        <button
                          key={card.cardId}
                          type="button"
                          className="btn-secondary min-h-10 px-3 text-sm"
                          onClick={() => void resendCard(reaction.reactionId, card.cardId)}
                        >
                          {card.displayText.slice(0, 18)}
                          {card.displayText.length > 18 && '…'} 다시 전송
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-5 text-sm font-extrabold">환자 반응 기록 (비식별)</h3>
          <ul className="mt-2 space-y-1 text-xs text-ink-soft">
            {session.reactions.length === 0 && <li>기록된 반응이 없습니다.</li>}
            {session.reactions
              .slice()
              .reverse()
              .slice(0, 8)
              .map((reaction) => (
                <li key={reaction.reactionId} className="flex justify-between gap-2">
                  <span className="font-mono">{reaction.type}</span>
                  <span>{new Date(reaction.createdAt).toLocaleTimeString('ko-KR')}</span>
                </li>
              ))}
          </ul>
        </section>

        <section className="space-y-4">
          <div className="card p-5">
            <h2 className="text-base font-extrabold">48시간 재열람 QR</h2>

            {!issued ? (
              <p className="mt-3 rounded-lg bg-canvas px-3 py-6 text-center text-sm text-ink-soft">
                안내완료를 누르면 최종 승인본을 다시 볼 수 있는 QR을 발급합니다.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {share !== null && <QrPanel url={share.shareUrl} />}

                <div className="rounded-xl bg-brand-soft px-4 py-3 text-sm font-bold text-brand-dark">
                  <p>이 QR은 발급 후 48시간 동안 다시 볼 수 있습니다.</p>
                  {share !== null && <p className="mt-1">이 안내는 {share.expiryLabel}까지 볼 수 있습니다.</p>}
                </div>

                {shareStatus !== null && (
                  <dl className="space-y-1.5 rounded-lg bg-canvas p-3 text-xs">
                    <Row label="QR 상태" value={shareStatus.status} />
                    <Row label="발급 시각" value={new Date(shareStatus.issuedAt).toLocaleString('ko-KR')} />
                    <Row label="만료 시각" value={new Date(shareStatus.expiresAt).toLocaleString('ko-KR')} />
                    <Row label="재열람 횟수" value={`${shareStatus.accessCount}회`} />
                    <Row label="재생 콘텐츠" value={shareStatus.contentPurged ? '파기 완료' : '보관 중 (48시간 임시)'} />
                    <Row label="약봉투 이미지 저장" value={shareStatus.sourceImageStored ? '저장됨' : '비저장'} />
                    <Row label="환자 식별정보" value={shareStatus.patientIdentifiers === null ? '없음' : '있음'} />
                  </dl>
                )}

                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-danger" disabled={busy} onClick={() => void revokeQr()}>
                    QR 즉시 폐기
                  </button>
                  {share !== null && (
                    <a href={share.shareUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                      재열람 화면 열기
                    </a>
                  )}
                </div>

                <p className="text-xs leading-5 text-ink-soft">
                  QR 주소에는 환자명과 복약정보가 포함되지 않습니다. 서버는 토큰의 해시값만 보관하며 48시간이 지나면
                  토큰과 재생용 콘텐츠를 자동 파기합니다.
                </p>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-base font-extrabold">데모 시간 이동</h2>
            <p className="mt-1 text-xs text-ink-soft">
              부록 A 2 13번 시연용입니다. 서버 시계를 바꾸지 않고 데모 오프셋만 조정해 48시간 만료와 자동파기를
              확인합니다.
            </p>
            <p className="mt-2 text-sm font-bold">
              현재 오프셋 <span className="font-mono">{clockOffset.toFixed(2)}시간</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary min-h-11" disabled={busy} onClick={() => void advance(47.9)}>
                +47시간 54분
              </button>
              <button type="button" className="btn-secondary min-h-11" disabled={busy} onClick={() => void advance(48)}>
                +48시간 (만료)
              </button>
              <button type="button" className="btn-secondary min-h-11" disabled={busy} onClick={() => void resetClock()}>
                시계 초기화
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-extrabold">세션 폐기 상태</h2>
            <dl className="mt-2 space-y-1.5 text-xs">
              <Row label="약봉투 이미지" value={session.imagesPurged ? '폐기 완료' : '세션 메모리 처리 중'} />
              <Row label="환자 식별정보" value="수집·저장하지 않음" />
              <Row label="세션 상태" value={session.status} />
              <Row
                label="승인 시각"
                value={session.approval === null ? '-' : new Date(session.approval.approvedAt).toLocaleString('ko-KR')}
              />
            </dl>
          </div>
        </section>
      </div>

      {issued && (
        <section className="card mt-4 p-5">
          <h2 className="text-base font-extrabold">최종 승인본 자막</h2>
          <ol className="mt-3 grid gap-2 md:grid-cols-2">
            {selected.map((card, index) => (
              <li key={card.cardId} className="rounded-xl bg-canvas px-4 py-3">
                <p className="mb-1 text-xs font-bold text-ink-soft">{index + 1}</p>
                <SubtitlePreview text={card.displayText} className="text-sm font-bold leading-relaxed" />
              </li>
            ))}
          </ol>
        </section>
      )}
    </PharmacistShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">불러오는 중…</div>}>
      <CompletePage />
    </Suspense>
  );
}
