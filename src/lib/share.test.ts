import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetClock, setOffsetHours } from './clock';
import {
  createToken,
  effectiveStatus,
  expiresAtFrom,
  formatExpiryKorean,
  hashToken,
  isReadable,
  issueShare,
  purgeShare,
  revokeShare,
  tokenMatches,
} from './share';
import { QR_TTL_HOURS } from './config';
import type { SharedContent } from './types';

const content: SharedContent = {
  contentVersion: 'GUIDANCE_V1',
  pharmacyName: '서울 열린약국',
  approvedAt: '2026-09-21T01:00:00.000Z',
  cards: [
    {
      cardId: 'CARD_001',
      type: 'DOSING',
      displayText: '하루 3번, 한 번에 1포씩, 3일 동안 드세요.',
      signPayload: { templateId: 'DOSING_STANDARD_V1', slots: { times: 3 }, gloss: ['하루'] },
      order: 0,
    },
  ],
  avatar: null,
};

function issue() {
  return issueShare({
    shareId: 'SHARE_DEMO_001',
    sessionId: 'SESSION_DEMO_001',
    contentVersion: 'GUIDANCE_V1',
    content,
  });
}

describe('QR 토큰', () => {
  it('토큰 원문을 저장하지 않고 해시만 보관한다', () => {
    const { share, token } = issue();
    expect(share.tokenHash).not.toContain(token);
    expect(share.tokenHash).toHaveLength(64);
    expect(JSON.stringify(share)).not.toContain(token);
  });

  it('고엔트로피 임의 토큰을 발급한다', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createToken()));
    expect(tokens.size).toBe(200);
    expect([...tokens][0]!.length).toBeGreaterThanOrEqual(40);
  });

  it('올바른 토큰만 매칭된다', () => {
    const { share, token } = issue();
    expect(tokenMatches(token, share.tokenHash)).toBe(true);
    expect(tokenMatches(createToken(), share.tokenHash)).toBe(false);
    expect(tokenMatches(`${token}x`, share.tokenHash)).toBe(false);
  });

  it('같은 토큰은 같은 해시를 만든다', () => {
    const token = createToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('환자 식별정보와 약봉투 이미지를 저장하지 않는다', () => {
    const { share } = issue();
    expect(share.patientIdentifiers).toBeNull();
    expect(share.sourceImageStored).toBe(false);
  });
});

describe('48시간 생명주기', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T10:00:00+09:00'));
    resetClock();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetClock();
  });

  it('유효기간은 발급 시각부터 항상 48시간이다', () => {
    const { share } = issue();
    expect(QR_TTL_HOURS).toBe(48);
    expect(Date.parse(share.expiresAt) - Date.parse(share.issuedAt)).toBe(48 * 3_600_000);
    expect(expiresAtFrom(0)).toBe(48 * 3_600_000);
  });

  it('발급 직후에는 재생 가능하다', () => {
    const { share } = issue();
    expect(effectiveStatus(share)).toBe('ACTIVE');
    expect(isReadable(share)).toBe(true);
  });

  it('47시간 59분에는 재생 가능하다', () => {
    const { share } = issue();
    setOffsetHours(47 + 59 / 60);
    expect(effectiveStatus(share)).toBe('ACTIVE');
    expect(isReadable(share)).toBe(true);
  });

  it('정확히 48시간이면 만료된다', () => {
    const { share } = issue();
    setOffsetHours(48);
    expect(effectiveStatus(share)).toBe('EXPIRED');
    expect(isReadable(share)).toBe(false);
  });

  it('48시간 이후에는 만료 상태가 유지된다', () => {
    const { share } = issue();
    setOffsetHours(72);
    expect(effectiveStatus(share)).toBe('EXPIRED');
  });

  it('만료 후 자동파기는 안내 JSON을 제거한다', () => {
    const { share } = issue();
    setOffsetHours(48);
    const purged = purgeShare(share);
    expect(purged.status).toBe('PURGED');
    expect(purged.content).toBeNull();
    expect(purged.purgedAt).not.toBeNull();
    expect(isReadable(purged)).toBe(false);
  });

  it('유효기간 안에는 자동파기가 동작하지 않는다', () => {
    const { share } = issue();
    setOffsetHours(24);
    expect(purgeShare(share).status).toBe('ACTIVE');
    expect(purgeShare(share).content).not.toBeNull();
  });

  it('약사 즉시폐기는 즉시 접근을 차단하고 콘텐츠를 제거한다', () => {
    const { share } = issue();
    const revoked = revokeShare(share);
    expect(revoked.status).toBe('REVOKED');
    expect(revoked.content).toBeNull();
    expect(isReadable(revoked)).toBe(false);
  });

  it('만료시각을 한국어 문구로 표시한다', () => {
    const { share } = issue();
    expect(formatExpiryKorean(share.expiresAt)).toBe('2026년 09월 23일 10시 00분');
  });
});

describe('즉시폐기와 자동파기의 상호작용', () => {
  it('즉시폐기된 공유는 자동파기 작업에서도 폐기 상태를 유지한다', () => {
    const { share } = issue();
    const revoked = revokeShare(share);
    const afterPurge = purgeShare(revoked);
    // 환자에게 만료가 아닌 폐기 안내를 보여주기 위해 REVOKED를 유지한다 (설계서 16).
    expect(afterPurge.status).toBe('REVOKED');
    expect(afterPurge.content).toBeNull();
  });
});
