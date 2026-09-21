import { handle, ok } from '@/lib/http';
import { patientPayload } from '@/lib/session-service';

/**
 * 환자 태블릿용 승인 콘텐츠 조회.
 * 약사 최종 승인 전에는 복약정보를 반환하지 않는다 (부록 C 5 안전 규칙).
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(patientPayload(id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return handle(error);
  }
}
