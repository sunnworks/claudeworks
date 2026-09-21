/**
 * 데모 저장소 — 프로세스 메모리에만 보관한다 (설계서 14 1 "데모는 메모리 또는 로컬 세션").
 * 실제 환자정보와 약봉투 이미지를 디스크나 DB에 영구 저장하지 않는다.
 */

import { serverConfig } from './config';
import { now, nowIso } from './clock';
import { effectiveStatus, purgeShare, tokenMatches } from './share';
import type { Session, ShareLink } from './types';

interface Store {
  sessions: Map<string, Session>;
  shares: Map<string, ShareLink>;
  sequence: number;
  cleanupTimer: ReturnType<typeof setInterval> | null;
  /** 자동파기 작업 로그 (비식별 최소 로그) */
  purgeLog: { at: string; shareId: string; result: 'PURGED' | 'FAILED' }[];
}

const globalRef = globalThis as typeof globalThis & { __demoStore__?: Store };

function store(): Store {
  globalRef.__demoStore__ ??= {
    sessions: new Map(),
    shares: new Map(),
    sequence: 0,
    cleanupTimer: null,
    purgeLog: [],
  };
  return globalRef.__demoStore__;
}

export function nextId(prefix: string): string {
  const current = store();
  current.sequence += 1;
  return `${prefix}_${String(current.sequence).padStart(3, '0')}`;
}

export function saveSession(session: Session): Session {
  const updated: Session = { ...session, updatedAt: nowIso() };
  store().sessions.set(updated.sessionId, updated);
  return updated;
}

export function getSession(sessionId: string): Session | undefined {
  return store().sessions.get(sessionId);
}

export function listSessions(): Session[] {
  return [...store().sessions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveShare(share: ShareLink): ShareLink {
  store().shares.set(share.shareId, share);
  return share;
}

export function getShare(shareId: string): ShareLink | undefined {
  return store().shares.get(shareId);
}

export function listShares(): ShareLink[] {
  return [...store().shares.values()];
}

/**
 * 토큰으로 공유를 조회한다. 토큰 원문은 저장하지 않으므로 해시 비교로 찾는다.
 * (데모 규모에서는 선형 탐색으로 충분하다. 운영에서는 해시 인덱스를 사용한다.)
 */
export function findShareByToken(token: string): ShareLink | undefined {
  return listShares().find((share) => tokenMatches(token, share.tokenHash));
}

/** 만료·폐기 대상을 정리한다. 설계서 11 3 PURGE_PENDING → PURGED */
export function runPurgeCycle(atMs: number = now()): { purged: string[]; failed: string[] } {
  const current = store();
  const purged: string[] = [];
  const failed: string[] = [];

  for (const share of listShares()) {
    const status = effectiveStatus(share, atMs);
    if (status === 'ACTIVE' || status === 'PURGED') continue;
    try {
      const next = purgeShare(share, atMs);
      saveShare(next);
      purged.push(share.shareId);
      current.purgeLog.push({ at: new Date(atMs).toISOString(), shareId: share.shareId, result: 'PURGED' });
    } catch {
      failed.push(share.shareId);
      current.purgeLog.push({ at: new Date(atMs).toISOString(), shareId: share.shareId, result: 'FAILED' });
    }
  }

  // 만료된 공유를 가진 세션 상태를 QR_EXPIRED로 반영한다.
  for (const session of listSessions()) {
    if (session.shareId === null) continue;
    const share = getShare(session.shareId);
    if (share === undefined) continue;
    const status = effectiveStatus(share, atMs);
    if (status !== 'ACTIVE' && session.status === 'QR_ACTIVE') {
      saveSession({ ...session, status: 'QR_EXPIRED' });
    }
  }

  return { purged, failed };
}

export function purgeLog(): Store['purgeLog'] {
  return [...store().purgeLog];
}

/** 자동파기 작업 주기 실행 — 서버 프로세스에서 1회만 시작한다 */
export function ensureCleanupJob(): void {
  const current = store();
  if (current.cleanupTimer !== null) return;
  const intervalMs = Math.max(1, serverConfig.qrCleanupIntervalMinutes) * 60_000;
  current.cleanupTimer = setInterval(() => {
    runPurgeCycle();
  }, intervalMs);
  // 개발 서버 리로드 시 프로세스를 붙잡지 않도록 unref 처리
  current.cleanupTimer.unref?.();
}

/** 테스트 전용 초기화 */
export function resetStore(): void {
  const current = store();
  if (current.cleanupTimer !== null) {
    clearInterval(current.cleanupTimer);
    current.cleanupTimer = null;
  }
  current.sessions.clear();
  current.shares.clear();
  current.purgeLog = [];
  current.sequence = 0;
}
