import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { markFieldsVerified, updateMedications, verifySession } from '@/lib/session-service';
import { validateSession } from '@/lib/validation';

const bodySchema = z.object({
  updates: z
    .array(
      z.object({
        groupId: z.string(),
        field: z.enum([
          'medicineName',
          'doseAmount',
          'doseUnit',
          'frequencyPerDay',
          'durationDays',
          'timingCode',
          'asNeeded',
        ]),
        value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      }),
    )
    .default([]),
  notes: z.array(z.object({ groupId: z.string(), note: z.string().max(200).nullable() })).optional(),
  cautions: z.array(z.object({ groupId: z.string(), cautionIds: z.array(z.string()) })).optional(),
  verify: z.array(z.object({ groupId: z.string(), fields: z.array(z.string()) })).optional(),
  /** true이면 검토 완료(VERIFIED)로 전이한다 */
  finalizeReview: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = bodySchema.parse(await request.json());

    let session = updateMedications(id, body.updates, { notes: body.notes, cautions: body.cautions });
    for (const entry of body.verify ?? []) {
      session = markFieldsVerified(id, entry.groupId, entry.fields);
    }
    if (body.finalizeReview === true) session = verifySession(id);

    return ok({ session, issues: validateSession(session) });
  } catch (error) {
    return handle(error);
  }
}
