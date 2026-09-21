/**
 * QR 재열람 생명주기 — 설계서 8 8 / 11 3 기준.
 *
 * 안전 규칙 (부록 C 5):
 * - 토큰 원문은 저장하지 않고 sha256 해시만 보관한다.
 * - 유효기간은 발급 시각부터 항상 48시간이다.
 * - 만료·폐기된 토큰에는 복약내용을 반환하지 않는다.
 * - 만료 후 안내 JSON과 임시 아바타 자산을 자동 파기한다.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { QR_TTL_HOURS, serverConfig } from './config';
import { now, nowIso } from './clock';
import type { SharedContent, ShareLink, ShareStatus } from './types';

/** 고엔트로피 임의 토큰 (32바이트 → base64url 43자) */
export function createToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(`${serverConfig.qrTokenSecret}:${token}`).digest('hex');
}

export function tokenMatches(token: string, tokenHash: string): boolean {
  const candidate = Buffer.from(hashToken(token), 'utf8');
  const stored = Buffer.from(tokenHash, 'utf8');
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export function expiresAtFrom(issuedAtMs: number): number {
  return issuedAtMs + QR_TTL_HOURS * 3_600_000;
}

export interface IssuedShare {
  share: ShareLink;
  /** 토큰 원문은 발급 응답에서 1회만 전달하고 서버에 저장하지 않는다 */
  token: string;
}

export function issueShare(params: {
  shareId: string;
  sessionId: string;
  contentVersion: string;
  content: SharedContent;
}): IssuedShare {
  const token = createToken();
  const issuedAtMs = now();
  const share: ShareLink = {
    shareId: params.shareId,
    tokenHash: hashToken(token),
    contentVersion: params.contentVersion,
    issuedAt: new Date(issuedAtMs).toISOString(),
    expiresAt: new Date(expiresAtFrom(issuedAtMs)).toISOString(),
    status: 'ACTIVE',
    pharmacistApproved: true,
    patientIdentifiers: null,
    sourceImageStored: false,
    sessionId: params.sessionId,
    content: params.content,
    purgedAt: null,
    accessCount: 0,
  };
  return { share, token };
}

/**
 * 현재 시각 기준으로 접근 가능 상태를 계산한다.
 * 만료 시각 이상이면 ACTIVE를 EXPIRED로 본다 (경계값: 정확히 48시간이면 만료).
 */
export function effectiveStatus(share: ShareLink, atMs: number = now()): ShareStatus {
  if (share.status === 'ACTIVE' && atMs >= Date.parse(share.expiresAt)) return 'EXPIRED';
  return share.status;
}

export function isReadable(share: ShareLink, atMs: number = now()): boolean {
  return effectiveStatus(share, atMs) === 'ACTIVE' && share.content !== null;
}

/** 약사 즉시 폐기 — 토큰을 무효화하고 재생 콘텐츠를 즉시 제거한다 */
export function revokeShare(share: ShareLink): ShareLink {
  return { ...share, status: 'REVOKED', content: null, purgedAt: nowIso() };
}

/**
 * 만료·폐기된 공유의 안내 JSON과 임시 아바타 자산을 파기한다.
 * 파기 완료 후에는 비식별 최소 로그만 남는다 (설계서 11 3 QR 상태).
 */
export function purgeShare(share: ShareLink, atMs: number = now()): ShareLink {
  const status = effectiveStatus(share, atMs);
  // 유효한 공유는 파기하지 않는다.
  if (status === 'ACTIVE') return share;
  // 약사가 즉시 폐기한 공유는 폐기 시점에 이미 콘텐츠가 제거되었고,
  // 환자에게는 만료가 아닌 폐기 안내를 보여야 하므로 REVOKED 상태를 유지한다 (설계서 16).
  if (status === 'PURGED' || status === 'REVOKED') return share;
  return { ...share, status: 'PURGED', content: null, purgedAt: new Date(atMs).toISOString() };
}

export function remainingMs(share: ShareLink, atMs: number = now()): number {
  return Math.max(0, Date.parse(share.expiresAt) - atMs);
}

/** 설계서 부록 B: 이 안내는 YYYY년 MM월 DD일 HH시 MM분까지 볼 수 있습니다 */
export function formatExpiryKorean(isoString: string): string {
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}년 ${get('month')}월 ${get('day')}일 ${get('hour')}시 ${get('minute')}분`;
}
