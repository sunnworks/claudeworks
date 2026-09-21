import { baseUrlFrom, handle, ok } from '@/lib/http';
import { completeSession } from '@/lib/session-service';

/**
 * 세션 종료 — 약봉투 이미지 폐기와 48시간 QR 발급.
 * 토큰 원문은 이 응답에서 1회만 전달하며 서버에는 해시만 남는다.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = completeSession(id, baseUrlFrom(request));
    return ok(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handle(error);
  }
}
