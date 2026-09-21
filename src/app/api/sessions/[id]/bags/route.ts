import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { addBag } from '@/lib/session-service';
import { validateSession } from '@/lib/validation';
import type { OCRResult } from '@/lib/ocr';

const bodySchema = z.object({
  imageRef: z.string().max(2000).default(''),
  label: z.string().max(40).optional(),
  ocr: z.custom<OCRResult>((value) => typeof value === 'object' && value !== null),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = bodySchema.parse(await request.json());
    const session = addBag(id, body.ocr, { imageRef: body.imageRef, label: body.label });
    return ok({ session, issues: validateSession(session) });
  } catch (error) {
    return handle(error);
  }
}
