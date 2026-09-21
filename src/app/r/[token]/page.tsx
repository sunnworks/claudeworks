import { notFound } from 'next/navigation';
import { readShareByToken } from '@/lib/session-service';
import { ShareViewer } from './ShareViewer';

/**
 * Q01 QR 재열람 — 약사가 최종 승인한 동일 콘텐츠 버전만 재생한다.
 * 만료·폐기 시 복약정보를 반환하지 않고 만료 안내만 표시한다 (설계서 8 8).
 */
export const dynamic = 'force-dynamic';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token === '') notFound();

  const result = readShareByToken(token);

  if (!result.ok) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-patient-bg px-6 py-10 text-center text-white">
        <div aria-hidden className="text-6xl">
          {result.reason === 'REVOKED' ? '⛔' : '⏳'}
        </div>
        <h1 className="text-3xl font-extrabold">{result.message}</h1>
        <p className="text-lg text-white/70">
          복약안내는 발급 후 48시간까지만 다시 볼 수 있습니다. 필요하면 약국에 문의해 주세요.
        </p>
        <p className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/60">
          상태 {result.reason}
        </p>
      </main>
    );
  }

  return (
    <ShareViewer
      content={result.content}
      expiryLabel={result.expiryLabel}
      remainingHours={result.remainingHours}
    />
  );
}
