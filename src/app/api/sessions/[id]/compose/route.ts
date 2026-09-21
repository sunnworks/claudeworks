import { handle, ok } from '@/lib/http';
import { composeSession } from '@/lib/session-service';
import { validateSession } from '@/lib/validation';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = composeSession(id);
    return ok({ session, issues: validateSession(session) });
  } catch (error) {
    return handle(error);
  }
}
