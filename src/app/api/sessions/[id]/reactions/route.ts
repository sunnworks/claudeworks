import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { recordReaction, resolveQuestion, setPlaybackRate } from '@/lib/session-service';
import { QUESTION_TYPES } from '@/lib/types';

const bodySchema = z.object({
  type: z.enum(['UNDERSTOOD', 'REPLAY', 'SLOW', 'QUESTION', 'PLAY_STARTED', 'PLAY_COMPLETED']),
  questionType: z.enum(QUESTION_TYPES).nullish(),
  cardId: z.string().nullish(),
  playbackRate: z.number().min(0.5).max(1.5).optional(),
});

const resolveSchema = z.object({
  reactionId: z.string(),
  cardId: z.string().nullable(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = bodySchema.parse(await request.json());
    let session = recordReaction(id, {
      type: body.type,
      questionType: body.questionType ?? null,
      cardId: body.cardId ?? null,
    });
    if (body.playbackRate !== undefined) session = setPlaybackRate(id, body.playbackRate);
    return ok({ session });
  } catch (error) {
    return handle(error);
  }
}

/** 약사가 질문에 대응해 해당 문장만 다시 전송한다 (부록 A 2 10번) */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = resolveSchema.parse(await request.json());
    return ok({ session: resolveQuestion(id, body.reactionId, body.cardId) });
  } catch (error) {
    return handle(error);
  }
}
