/**
 * 데모 전용 시계.
 * 부록 A 2 13번 "시스템 시계를 48시간 뒤로 이동" 시연을 위해
 * 서버 시계를 바꾸지 않고 오프셋만 더한다. 운영에서는 오프셋을 항상 0으로 둔다.
 */

interface ClockState {
  offsetMs: number;
}

const globalRef = globalThis as typeof globalThis & { __demoClock__?: ClockState };

function state(): ClockState {
  globalRef.__demoClock__ ??= { offsetMs: 0 };
  return globalRef.__demoClock__;
}

export function now(): number {
  return Date.now() + state().offsetMs;
}

export function nowIso(): string {
  return new Date(now()).toISOString();
}

export function getOffsetHours(): number {
  return state().offsetMs / 3_600_000;
}

export function setOffsetHours(hours: number): void {
  state().offsetMs = hours * 3_600_000;
}

export function advanceHours(hours: number): void {
  state().offsetMs += hours * 3_600_000;
}

export function resetClock(): void {
  state().offsetMs = 0;
}
