import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetClock, setOffsetHours } from './clock';
import { getOcrProvider } from './ocr';
import {
  addBag,
  approveSession,
  completeSession,
  composeSession,
  createSession,
  patientPayload,
  readShareByToken,
  recordReaction,
  revokeShareForSession,
  updateCards,
  updateMedications,
  verifySession,
} from './session-service';
import { resetStore, runPurgeCycle } from './store';
import { canApprove, validateSession, blockingIssues } from './validation';
import type { ApprovalRecord, Session } from './types';

const BASE_URL = 'https://demo.example.test';

const ALL_CHECKS: ApprovalRecord['checks'] = {
  ocrMatchesBag: true,
  missingFieldsChecked: true,
  cautionsAppropriate: true,
  subtitlesChecked: true,
  finalApproval: true,
};

async function addSample(session: Session, sampleId: string): Promise<Session> {
  const provider = getOcrProvider('mock');
  const result = await provider.recognize({ sampleId });
  return addBag(session.sessionId, result, { imageRef: `/samples/${sampleId}.svg` });
}

beforeEach(() => {
  resetStore();
  resetClock();
});

afterEach(() => {
  vi.useRealTimers();
  resetClock();
});

describe('T01 선명한 단일 약봉투', () => {
  it('샘플 약봉투 1을 추가하면 필수정보가 추출되고 검토로 진행할 수 있다', async () => {
    let session = createSession();
    expect(session.status).toBe('CAPTURED');

    session = await addSample(session, 'SAMPLE_BAG_1');
    expect(session.status).toBe('OCR_COMPLETE');

    const group = session.bags[0]!.groups[0]!;
    expect(group.doseAmount.value).toBe(1);
    expect(group.doseUnit.value).toBe('포');
    expect(group.frequencyPerDay.value).toBe(3);
    expect(group.durationDays.value).toBe(3);
    expect(group.timingCode.value).toBe('AFTER_MEAL_30');
    expect(blockingIssues(validateSession(session))).toHaveLength(0);
  });

  it('복용기간 신뢰도 0.82는 경고로만 표시한다 (부록 A 2 4번)', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    const issues = validateSession(session).filter((issue) => issue.field === 'durationDays');
    expect(issues[0]?.code).toBe('NEEDS_REVIEW_CONFIDENCE');
    expect(issues[0]?.severity).toBe('WARNING');
  });
});

describe('T02 흐린 약봉투', () => {
  it('RETAKE 품질과 필수값 누락으로 승인이 차단된다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_3');
    expect(session.status).toBe('NEEDS_REVIEW');

    const issues = validateSession(session);
    expect(issues.some((issue) => issue.code === 'IMAGE_QUALITY' && issue.severity === 'BLOCKING')).toBe(true);
    expect(issues.some((issue) => issue.code === 'MISSING_REQUIRED')).toBe(true);
    expect(canApprove(session, ALL_CHECKS).ok).toBe(false);
    expect(() => verifySession(session.sessionId)).toThrow();
  });
});

describe('T05 낮은 신뢰도 복용횟수', () => {
  it('0.61은 차단 이슈이고 약사 수정 후 해제된다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_4');

    const blocked = validateSession(session).filter((issue) => issue.code === 'LOW_CONFIDENCE');
    expect(blocked.some((issue) => issue.field === 'frequencyPerDay')).toBe(true);

    const groupId = session.bags[0]!.groups[0]!.groupId;
    session = updateMedications(session.sessionId, [
      { groupId, field: 'frequencyPerDay', value: 2 },
    ]);

    const group = session.bags[0]!.groups[0]!;
    expect(group.frequencyPerDay.verified).toBe(true);
    expect(group.frequencyPerDay.sourceType).toBe('PHARMACIST_INPUT');
    expect(validateSession(session).some((issue) => issue.code === 'LOW_CONFIDENCE')).toBe(false);
  });
});

describe('T04 필요시약 추가', () => {
  it('정규약과 필요시약이 별도 안내카드로 생성된다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = await addSample(session, 'SAMPLE_BAG_2');
    expect(session.bags).toHaveLength(2);

    session = composeSession(session.sessionId);
    expect(session.status).toBe('COMPOSED');

    const texts = session.cards.map((card) => card.displayText);
    expect(texts).toContain('하루 3번, 한 번에 1포씩, 3일 동안 드세요.');
    expect(texts).toContain('아침, 점심, 저녁 식사 후 30분에 드세요.');
    expect(texts.some((text) => text.includes('통증이 있을 때만'))).toBe(true);
    expect(session.cards.some((card) => card.type === 'AS_NEEDED')).toBe(true);
  });

  it('약봉투에 기재된 주의문구만 검수 문구DB에서 추천한다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);

    const cautions = session.cards.filter((card) => card.sourceType === 'REVIEWED_PHRASE_DB' && card.type === 'CAUTION');
    expect(cautions.map((card) => card.displayText)).toContain('이 약은 졸릴 수 있습니다.');
    // 약봉투에 없는 주의사항은 생성하지 않는다.
    expect(cautions.some((card) => card.displayText.includes('냉장고'))).toBe(false);
  });
});

describe('승인 전 환자 전송 차단 (부록 C 5)', () => {
  it('승인 전 환자 API는 복약정보를 반환하지 않는다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);

    const payload = patientPayload(session.sessionId);
    expect(payload.approved).toBe(false);
    expect(payload.cards).toHaveLength(0);
    expect(payload.message).toBe('약사가 수어 복약안내를 준비하고 있습니다');
    expect(JSON.stringify(payload)).not.toContain('1포');
  });

  it('약사 확인 체크가 하나라도 없으면 승인되지 않는다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);

    await expect(
      approveSession(session.sessionId, { ...ALL_CHECKS, subtitlesChecked: false }),
    ).rejects.toThrow('약사 확인 체크');
  });

  it('승인 후에는 자막과 아바타 세그먼트가 전달된다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);
    session = await approveSession(session.sessionId, ALL_CHECKS);

    expect(session.status).toBe('APPROVED');
    expect(session.approval?.checks.finalApproval).toBe(true);
    expect(session.avatarJob?.status).toBe('READY');
    expect(session.avatarJob?.segments.length).toBeGreaterThan(0);

    const payload = patientPayload(session.sessionId);
    expect(payload.approved).toBe(true);
    expect(payload.cards.length).toBeGreaterThan(0);
    expect(payload.cards[0]?.displayText).toBe('지금부터 약을 먹는 방법을 안내하겠습니다.');
  });

  it('선택 해제한 카드는 환자 자막에 포함되지 않는다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);

    const caution = session.cards.find((card) => card.type === 'CAUTION')!;
    session = updateCards(session.sessionId, [{ cardId: caution.cardId, selected: false }]);
    session = await approveSession(session.sessionId, ALL_CHECKS);

    const payload = patientPayload(session.sessionId);
    expect(payload.cards.some((card) => card.cardId === caution.cardId)).toBe(false);
  });
});

describe('T08 T09 환자 반응', () => {
  async function approved(): Promise<Session> {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);
    return approveSession(session.sessionId, ALL_CHECKS);
  }

  it('재생 시작과 질문이 상태에 반영된다', async () => {
    const base = await approved();
    let session = recordReaction(base.sessionId, { type: 'PLAY_STARTED' });
    expect(session.status).toBe('PLAYING');

    session = recordReaction(base.sessionId, { type: 'QUESTION', questionType: 'WHEN_TO_TAKE' });
    expect(session.status).toBe('QUESTION');
    expect(session.reactions.at(-1)?.questionType).toBe('WHEN_TO_TAKE');
  });

  it('천천히 보기는 재생속도를 0.7로 낮춘다', async () => {
    const base = await approved();
    const session = recordReaction(base.sessionId, { type: 'SLOW' });
    expect(session.playbackRate).toBe(0.7);
  });

  it('승인 전에는 환자 반응을 기록할 수 없다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    expect(() => recordReaction(session.sessionId, { type: 'PLAY_STARTED' })).toThrow();
  });
});

describe('T10~T13 세션 종료와 QR 생명주기', () => {
  async function completed() {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);
    session = await approveSession(session.sessionId, ALL_CHECKS);
    return completeSession(session.sessionId, BASE_URL);
  }

  beforeEach(() => {
    // Mock OCR의 지연 타이머가 진행되도록 shouldAdvanceTime을 사용한다.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-21T10:00:00+09:00'));
  });

  it('T10 완료 시 이미지가 폐기되고 48시간 QR이 발급된다', async () => {
    const result = await completed();
    expect(result.session.status).toBe('QR_ACTIVE');
    expect(result.session.imagesPurged).toBe(true);
    expect(result.session.bags.every((bag) => bag.imageRef === '')).toBe(true);
    expect(Date.parse(result.expiresAt) - Date.parse(result.issuedAt)).toBe(48 * 3_600_000);
    expect(result.expiryLabel).toBe('2026년 09월 23일 10시 00분');
  });

  it('QR 주소에는 환자명과 복약정보가 포함되지 않는다', async () => {
    const result = await completed();
    expect(result.shareUrl.startsWith(`${BASE_URL}/r/`)).toBe(true);
    expect(result.shareUrl).not.toContain('김');
    expect(result.shareUrl).not.toMatch(/포|정|식후|3회/);
  });

  it('T11 48시간 이내에는 동일 승인본을 재생한다', async () => {
    const result = await completed();
    setOffsetHours(47 + 59 / 60);
    const read = readShareByToken(result.token);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.content.cards.some((card) => card.displayText.includes('하루 3번'))).toBe(true);
      expect(read.content.contentVersion).toBe('GUIDANCE_V1');
    }
  });

  it('T12 48시간이 지나면 복약정보를 반환하지 않는다', async () => {
    const result = await completed();
    setOffsetHours(48);
    const read = readShareByToken(result.token);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.reason).toBe('EXPIRED');
      expect(read.message).toBe('이 안내는 만료되었습니다  약국에 문의해 주세요');
    }
    expect(JSON.stringify(read)).not.toContain('1포');
  });

  it('T12 자동파기 작업이 만료 콘텐츠를 제거하고 세션 상태를 QR_EXPIRED로 바꾼다', async () => {
    const result = await completed();
    setOffsetHours(49);
    const cycle = runPurgeCycle();
    expect(cycle.purged).toContain(result.session.shareId);
    expect(cycle.failed).toHaveLength(0);

    const read = readShareByToken(result.token);
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.reason).toBe('PURGED');
  });

  it('T13 약사 즉시폐기는 즉시 접근을 차단한다', async () => {
    const result = await completed();
    expect(readShareByToken(result.token).ok).toBe(true);

    const revoked = revokeShareForSession(result.session.shareId!);
    expect(revoked.ok).toBe(true);

    const read = readShareByToken(result.token);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.reason).toBe('REVOKED');
      expect(read.message).toBe('이 안내는 더 이상 이용할 수 없습니다');
    }
  });

  it('알 수 없는 토큰으로는 복약정보를 조회할 수 없다', async () => {
    await completed();
    const read = readShareByToken('not-a-real-token');
    expect(read.ok).toBe(false);
  });

  it('승인 없는 세션은 종료할 수 없다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    expect(() => completeSession(session.sessionId, BASE_URL)).toThrow('약사 최종 승인');
  });
});

describe('수어 아바타 샘플 영상 배정', () => {
  it('승인 시 문장마다 데모용 샘플 수어영상이 배정된다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);
    session = await approveSession(session.sessionId, ALL_CHECKS);

    const job = session.avatarJob!;
    expect(job.playbackType).toBe('video');
    expect(job.segments).toHaveLength(session.cards.filter((card) => card.selected).length);
    for (const segment of job.segments) {
      expect(segment.playbackUrl).toMatch(/^\/avatar-samples\/sign-[1-5]\.mp4$/);
      expect(segment.durationMs).toBeGreaterThan(0);
    }
  });

  it('같은 영상이 연속으로 배정되지 않는다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);
    session = await approveSession(session.sessionId, ALL_CHECKS);

    const urls = session.avatarJob!.segments.map((segment) => segment.playbackUrl);
    for (let index = 1; index < urls.length; index += 1) {
      expect(urls[index]).not.toBe(urls[index - 1]);
    }
  });

  it('환자 승인본과 QR 승인본이 같은 영상 순서를 재생한다', async () => {
    let session = createSession();
    session = await addSample(session, 'SAMPLE_BAG_1');
    session = composeSession(session.sessionId);
    session = await approveSession(session.sessionId, ALL_CHECKS);

    const patient = patientPayload(session.sessionId);
    const result = completeSession(session.sessionId, BASE_URL);
    const read = readShareByToken(result.token);

    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.content.avatar?.segments.map((s) => s.playbackUrl)).toEqual(
        patient.avatar?.segments.map((s) => s.playbackUrl),
      );
    }
  });
});
