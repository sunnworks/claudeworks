'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PharmacistShell } from '@/components/PharmacistShell';
import { SubtitlePreview } from '@/components/SubtitleText';
import { api } from '@/lib/client/api';
import type { Session } from '@/lib/types';

/** 설계서 15 2 약사 확인 체크 */
const CHECK_ITEMS = [
  { key: 'ocrMatchesBag', label: '약봉투 원문과 인식된 복용법이 일치합니다' },
  { key: 'missingFieldsChecked', label: '필수 복약정보의 누락 여부를 확인했습니다' },
  { key: 'cautionsAppropriate', label: '선택된 주의사항이 이번 조제 내용에 적절합니다' },
  { key: 'subtitlesChecked', label: '환자에게 표시될 최종 문장을 확인했습니다' },
  { key: 'finalApproval', label: '본 내용을 환자 태블릿으로 전송합니다' },
] as const;

type CheckKey = (typeof CHECK_ITEMS)[number]['key'];

/** P07 최종 승인 — 확인 체크와 환자 태블릿 전송 */
function ApprovePage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session');

  const [session, setSession] = useState<Session | null>(null);
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    ocrMatchesBag: false,
    missingFieldsChecked: false,
    cautionsAppropriate: false,
    subtitlesChecked: false,
    finalApproval: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (sessionId === null) return;
    const detail = await api.getSession(sessionId);
    setSession(detail.session);
  }, [sessionId]);

  useEffect(() => {
    void load().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : '세션을 불러오지 못했습니다.'),
    );
  }, [load]);

  const allChecked = CHECK_ITEMS.every((item) => checks[item.key]);
  const approved = session?.approval !== null && session?.approval !== undefined;

  async function approve() {
    if (sessionId === null) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.approve(sessionId, checks);
      setSession(result.session);
      if (result.avatarJob?.status === 'FAILED') {
        setError(`수어 안내를 시작할 수 없습니다. ${result.avatarJob.error ?? ''}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '승인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (sessionId === null) return;
    setBusy(true);
    try {
      const result = await api.revokeApproval(sessionId);
      setSession(result.session);
      router.push(`/pharmacist/compose?session=${sessionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '승인 취소에 실패했습니다.');
      setBusy(false);
    }
  }

  if (sessionId === null || session === null) {
    return (
      <PharmacistShell step="승인" title="승인 화면을 불러오는 중입니다">
        {error !== null && <p className="text-sm font-semibold text-danger">{error}</p>}
      </PharmacistShell>
    );
  }

  const selected = session.cards.filter((card) => card.selected).sort((a, b) => a.order - b.order);

  return (
    <PharmacistShell
      step="승인"
      title={approved ? '환자 태블릿으로 전송되었습니다' : '환자에게 안내할 문장을 최종 확인해 주세요'}
      description={
        approved
          ? '태블릿을 환자에게 보여주거나, 환자 태블릿에서 같은 세션 주소로 접속하면 수어 안내가 시작됩니다.'
          : '약사가 최종 승인하기 전까지 환자 화면에는 복약정보가 표시되지 않습니다.'
      }
      sessionId={sessionId}
      pharmacyName={session.pharmacyName}
    >
      {error !== null && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          <span aria-hidden>✕</span> {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="card p-5">
          <h2 className="text-base font-extrabold">약사 확인 체크</h2>
          <ul className="mt-3 space-y-2">
            {CHECK_ITEMS.map((item) => (
              <li key={item.key}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-line px-3 py-2 text-sm font-semibold has-checked:border-brand has-checked:bg-brand-soft">
                  <input
                    type="checkbox"
                    checked={checks[item.key]}
                    disabled={approved}
                    onChange={(event) => setChecks((prev) => ({ ...prev, [item.key]: event.target.checked }))}
                    className="size-6 flex-none accent-[var(--color-brand)]"
                  />
                  {item.label}
                </label>
              </li>
            ))}
          </ul>

          {!approved ? (
            <button type="button" className="btn-primary mt-4 w-full text-lg" disabled={!allChecked || busy} onClick={() => void approve()}>
              <span aria-hidden>🤟</span> {busy ? '수어 안내를 준비하고 있습니다…' : '수어 안내 승인'}
            </button>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 text-sm font-bold text-ok">
                <span aria-hidden>✓</span> 승인 완료 ·{' '}
                {new Date(session.approval!.approvedAt).toLocaleTimeString('ko-KR')} · 콘텐츠 버전{' '}
                {session.approval!.contentVersion}
              </div>
              <button
                type="button"
                className="btn-primary w-full text-lg"
                onClick={() => router.push(`/patient?session=${sessionId}&from=pharmacist`)}
              >
                <span aria-hidden>↺</span> 환자 화면 보여주기 (이 태블릿)
              </button>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => router.push(`/pharmacist/complete?session=${sessionId}`)}
              >
                질문 대응 · 완료 화면으로 이동
              </button>
              <button type="button" className="btn-danger w-full" disabled={busy} onClick={() => void revoke()}>
                승인 취소하고 문장 수정
              </button>
            </div>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold">환자에게 전달될 문장</h2>
            <span className="chip bg-canvas text-ink-soft">{selected.length}문장</span>
          </div>
          <ol className="mt-3 space-y-2">
            {selected.map((card, index) => (
              <li key={card.cardId} className="rounded-xl bg-patient-bg px-4 py-3">
                <p className="mb-1 text-xs font-bold text-white/50">
                  {index + 1} / {selected.length}
                  {card.pharmacistAuthored && ' · 약사 책임 문구'}
                </p>
                <SubtitlePreview text={card.displayText} className="text-base font-bold leading-relaxed text-white" />
              </li>
            ))}
          </ol>

          {session.avatarJob !== null && (
            <dl className="mt-4 space-y-1.5 rounded-lg bg-canvas p-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-soft">아바타 작업</dt>
                <dd className="font-mono">{session.avatarJob.jobId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">상태</dt>
                <dd className="font-bold">
                  {session.avatarJob.status === 'READY' ? '재생 준비 완료' : session.avatarJob.status}
                  {session.avatarJob.cached && ' · 캐시 사용'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">재생 자산</dt>
                <dd>
                  {session.avatarJob.playbackType === 'video' ? '샘플 수어영상' : '도형 플레이어'} ·{' '}
                  {session.avatarJob.provider}
                </dd>
              </div>
              <p className="pt-1 text-ink-soft">
                ※ 데모의 수어 영상은 샘플이며 자막 내용과 일치하지 않습니다. KLcube 아바타 API 연동 시 승인 문장에
                맞는 수어가 생성됩니다.
              </p>
            </dl>
          )}
        </section>
      </div>
    </PharmacistShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">불러오는 중…</div>}>
      <ApprovePage />
    </Suspense>
  );
}
