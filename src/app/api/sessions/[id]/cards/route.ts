import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { addPharmacistCard, updateCards } from '@/lib/session-service';

const bodySchema = z.object({
  changes: z
    .array(
      z.object({
        cardId: z.string(),
        selected: z.boolean().optional(),
        order: z.number().int().optional(),
        displayText: z.string().max(200).optional(),
      }),
    )
    .default([]),
  /** 약사 입력카드 추가 */
  addText: z.string().max(200).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = bodySchema.parse(await request.json());
    let session = updateCards(id, body.changes);
    if (body.addText !== undefined && body.addText.trim() !== '') {
      session = addPharmacistCard(id, body.addText);
    }
    return ok({ session });
  } catch (error) {
    return handle(error);
  }
}
