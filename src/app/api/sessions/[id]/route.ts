import { handle, notFound, ok } from '@/lib/http';
import { validateSession } from '@/lib/validation';
import { getSession } from '@/lib/store';
import { stepOf } from '@/lib/state';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = getSession(id);
    if (session === undefined) return notFound('세션을 찾을 수 없습니다.');
    return ok({ session, issues: validateSession(session), step: stepOf(session.status) });
  } catch (error) {
    return handle(error);
  }
}
