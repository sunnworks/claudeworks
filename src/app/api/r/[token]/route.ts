import { handle, ok } from '@/lib/http';
import { readShareByToken } from '@/lib/session-service';

/**
 * 유효한 QR 토큰의 승인 콘텐츠만 조회한다 (설계서 14 3 GET /r/token).
 * 만료·폐기된 토큰에는 복약정보를 반환하지 않고 만료 안내만 제공한다.
 */
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const result = readShareByToken(token);
    return ok(result, {
      status: result.ok ? 200 : 410,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return handle(error);
  }
}
