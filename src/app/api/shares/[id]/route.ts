import { handle, notFound, ok } from '@/lib/http';
import { revokeShareForSession } from '@/lib/session-service';
import { effectiveStatus } from '@/lib/share';
import { getShare, runPurgeCycle } from '@/lib/store';

/** 약사의 QR 즉시 폐기 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = revokeShareForSession(id);
    if (!result.ok) return notFound('QR 정보를 찾을 수 없습니다.');
    // 폐기 직후 재생 자산까지 정리한다.
    const cycle = runPurgeCycle();
    return ok({ revoked: true, purged: cycle.purged });
  } catch (error) {
    return handle(error);
  }
}

/** QR 상태 확인 (약사 완료화면에서 사용) */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const share = getShare(id);
    if (share === undefined) return notFound('QR 정보를 찾을 수 없습니다.');
    return ok({
      shareId: share.shareId,
      status: effectiveStatus(share),
      issuedAt: share.issuedAt,
      expiresAt: share.expiresAt,
      accessCount: share.accessCount,
      purgedAt: share.purgedAt,
      contentPurged: share.content === null,
      sourceImageStored: share.sourceImageStored,
      patientIdentifiers: share.patientIdentifiers,
    });
  } catch (error) {
    return handle(error);
  }
}
