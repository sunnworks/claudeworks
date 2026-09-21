'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PharmacistShell } from '@/components/PharmacistShell';
import { api } from '@/lib/client/api';
import { STATUS_LABELS } from '@/lib/state';
import type { Session } from '@/lib/types';

type SessionRow = {
  sessionId: string;
  status: Session['status'];
  pharmacyName: string;
  createdAt: string;
  updatedAt: string;
  bagCount: number;
  deviceCode: string;
};

/** P02 대시보드 — 새 복약안내, 태블릿 연결상태, 최근 세션 */
export default function DashboardPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [mode, setMode] = useState<{ ocrProvider: string; avatarProvider: string; qrTtlHours: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, samples] = await Promise.all([api.listSessions(), api.samples()]);
      setRows(list.sessions);
      setMode(samples.mode);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '목록을 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startSession() {
    setBusy(true);
    setError(null);
    try {
      const session = await api.createSession();
      router.push(`/pharmacist/scan?session=${session.sessionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '세션을 만들지 못했습니다.');
      setBusy(false);
    }
  }

  return (
    <PharmacistShell
      step="촬영"
      title="농인 환자를 위한 새 수어 복약안내를 시작합니다"
      description="약봉투를 촬영하면 복약정보를 인식해 약사 확인 화면으로 이동합니다."
      pharmacyName="서울 열린약국"
      mode={mode}
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h2 className="text-lg font-extrabold">새 복약안내</h2>
          <p className="mt-1 text-sm text-ink-soft">
            환자에게 수어 안내가 필요한지 확인한 뒤 시작하세요. 환자 회원가입은 필요하지 않습니다.
          </p>
          <button type="button" className="btn-primary mt-4 w-full text-lg" onClick={startSession} disabled={busy}>
            <span aria-hidden>📷</span> {busy ? '세션을 만들고 있습니다…' : '새 복약안내 시작'}
          </button>
          {error !== null && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-danger">
              <span aria-hidden>✕</span>
              {error}
            </p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-extrabold">환자 태블릿 연결</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft">이 기기</dt>
              <dd className="chip bg-ok-soft text-ok">
                <span aria-hidden>✓</span> 약사모드 사용 중
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft">환자 화면</dt>
              <dd className="chip bg-brand-soft text-brand-dark">
                <span aria-hidden>↺</span> 같은 태블릿에서 전환
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft">별도 기기</dt>
              <dd className="text-ink-soft">세션 주소로 접속 후 폴링 동기화</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft">QR 유효기간</dt>
              <dd className="font-bold">{mode?.qrTtlHours ?? 48}시간</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-lg bg-canvas p-3 text-xs leading-5 text-ink-soft">
            카운터 태블릿 1대로 시연할 때는 승인 후 <b>환자 화면 보여주기</b>를 눌러 태블릿을 환자에게 돌려
            보여주세요. 환자 화면에서는 약사 화면으로 돌아오는 버튼만 노출됩니다.
          </p>
          <Link href="/print/samples" target="_blank" className="btn-secondary mt-3 w-full text-sm">
            <span aria-hidden>🖨</span> 시연용 약봉투 인쇄 (실물 없이 촬영 시연)
          </Link>
        </section>
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-extrabold">최근 세션</h2>
          <button type="button" className="text-sm font-bold text-brand" onClick={() => void load()}>
            새로고침
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-soft">아직 생성된 세션이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.slice(0, 8).map((row) => (
              <li key={row.sessionId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold">{row.sessionId}</p>
                  <p className="text-xs text-ink-soft">
                    약봉투 {row.bagCount}장 · {new Date(row.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="chip bg-canvas text-ink-soft">{STATUS_LABELS[row.status]}</span>
                  <Link
                    href={`/pharmacist/scan?session=${row.sessionId}`}
                    className="btn-secondary min-h-10 px-3 text-sm"
                  >
                    이어서 진행
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PharmacistShell>
  );
}
