import { z } from 'zod';
import { created, handle, ok } from '@/lib/http';
import { createSession } from '@/lib/session-service';
import { listSessions } from '@/lib/store';

const bodySchema = z.object({
  pharmacyName: z.string().min(1).max(60).optional(),
  pharmacistId: z.string().min(1).max(60).optional(),
});

export async function POST(request: Request) {
  try {
    const raw: unknown = await request.json().catch(() => ({}));
    const body = bodySchema.parse(raw ?? {});
    return created(createSession(body));
  } catch (error) {
    return handle(error);
  }
}

export async function GET() {
  return ok({
    sessions: listSessions().map((session) => ({
      sessionId: session.sessionId,
      status: session.status,
      pharmacyName: session.pharmacyName,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      bagCount: session.bags.length,
      deviceCode: session.deviceCode,
    })),
  });
}
