import { z } from 'zod';
import { handle, badRequest, ok } from '@/lib/http';
import { serverConfig } from '@/lib/config';
import { getOcrProvider, validateImageInput } from '@/lib/ocr';

const bodySchema = z.object({
  sampleId: z.string().max(60).optional(),
  /** data URL — 서버 메모리에서만 사용하고 저장하지 않는다 */
  image: z.string().max(18_000_000).optional(),
  mimeType: z.string().max(60).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  provider: z.enum(['mock', 'live']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const inputError = validateImageInput(body);
    if (inputError !== null) return badRequest(inputError);

    const provider = getOcrProvider(body.provider);
    try {
      const result = await provider.recognize(body);
      return ok({ ...result, mode: provider.name, demoMode: serverConfig.demoMode });
    } catch (error) {
      // OCR 서비스 장애: 안전한 오류화면과 재시도 (설계서 16)
      return badRequest(
        error instanceof Error ? error.message : '현재 자동인식이 어렵습니다. 샘플 모드 또는 직접입력을 사용해 주세요.',
        { recoverable: true },
      );
    }
  } catch (error) {
    return handle(error);
  }
}
