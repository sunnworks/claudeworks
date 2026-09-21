import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { approveSession, revokeApproval } from '@/lib/session-service';

const bodySchema = z.object({
  checks: z.object({
    ocrMatchesBag: z.boolean(),
    missingFieldsChecked: z.boolean(),
    cautionsAppropriate: z.boolean(),
    subtitlesChecked: z.boolean(),
    finalApproval: z.boolean(),
  }),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = bodySchema.parse(await request.json());
    const session = await approveSession(id, body.checks);
    return ok({ session, avatarJob: session.avatarJob });
  } catch (error) {
    return handle(error);
  }
}

/** 승인 취소 — 환자 재생을 중단하고 안내구성 단계로 되돌린다 (설계서 8 5) */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok({ session: revokeApproval(id) });
  } catch (error) {
    return handle(error);
  }
}
