import { ok } from '@/lib/http';
import { serverConfig } from '@/lib/config';
import { SAMPLE_BAG_LIST } from '@/lib/ocr';

/** 시연용 샘플 약봉투 목록과 현재 데모 모드 */
export async function GET() {
  return ok({
    samples: SAMPLE_BAG_LIST,
    mode: {
      demoMode: serverConfig.demoMode,
      ocrProvider: serverConfig.ocrProvider,
      avatarProvider: serverConfig.avatarProvider,
      qrTtlHours: serverConfig.qrTtlHours,
      sessionImagePersist: serverConfig.sessionImagePersist,
    },
  });
}
