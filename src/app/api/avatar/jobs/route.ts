import { z } from 'zod';
import { handle, notFound, ok } from '@/lib/http';
import { getAvatarProvider } from '@/lib/avatar';

const bodySchema = z.object({
  sessionId: z.string(),
  contentVersion: z.string().default('GUIDANCE_V1'),
  language: z.literal('KSL').default('KSL'),
  cards: z.array(
    z.object({
      cardId: z.string(),
      templateId: z.string(),
      slots: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
      gloss: z.array(z.string()),
      subtitle: z.string(),
    }),
  ),
  provider: z.enum(['mock', 'live']).optional(),
});

/** 수어 아바타 생성 또는 캐시 조회 (설계서 14 5) */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const provider = getAvatarProvider(body.provider);
    const job = await provider.createJob({
      sessionId: body.sessionId,
      contentVersion: body.contentVersion,
      language: body.language,
      cards: body.cards,
    });
    return ok(job);
  } catch (error) {
    return handle(error);
  }
}

export async function GET(request: Request) {
  try {
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (jobId === null) return notFound('jobId가 필요합니다.');
    const job = await getAvatarProvider().getJob(jobId);
    if (job === null) return notFound('아바타 작업을 찾을 수 없습니다.');
    return ok(job);
  } catch (error) {
    return handle(error);
  }
}
