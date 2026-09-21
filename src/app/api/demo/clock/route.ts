import { z } from 'zod';
import { handle, ok } from '@/lib/http';
import { advanceHours, getOffsetHours, resetClock } from '@/lib/clock';
import { serverConfig } from '@/lib/config';
import { runPurgeCycle } from '@/lib/store';

const bodySchema = z.object({
  advanceHours: z.number().min(-720).max(720).optional(),
  reset: z.boolean().optional(),
});

/**
 * 데모 전용 시간 이동 — 부록 A 2 13번 "시스템 시계를 48시간 뒤로 이동" 시연용.
 * DEMO_MODE가 false이면 동작하지 않는다.
 */
export async function POST(request: Request) {
  try {
    if (!serverConfig.demoMode) {
      return ok({ enabled: false, offsetHours: 0, message: 'DEMO_MODE에서만 사용할 수 있습니다.' });
    }
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    if (body.reset === true) resetClock();
    if (body.advanceHours !== undefined) advanceHours(body.advanceHours);
    const cycle = runPurgeCycle();
    return ok({ enabled: true, offsetHours: getOffsetHours(), purged: cycle.purged, failed: cycle.failed });
  } catch (error) {
    return handle(error);
  }
}

export async function GET() {
  return ok({ enabled: serverConfig.demoMode, offsetHours: getOffsetHours() });
}
