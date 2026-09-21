/**
 * 세션 업무 로직 — API 라우트와 테스트가 공유한다.
 * 상태 전이와 안전 규칙은 모두 이 계층에서 강제한다.
 */

import { getAvatarProvider, toAvatarCards } from './avatar';
import { now, nowIso } from './clock';
import { composeCards, selectedCards } from './compose';
import type { OCRResult } from './ocr';
import { assertTransition, isPatientVisible } from './state';
import { effectiveStatus, formatExpiryKorean, isReadable, issueShare, revokeShare } from './share';
import {
  ensureCleanupJob,
  findShareByToken,
  getSession,
  getShare,
  nextId,
  saveSession,
  saveShare,
} from './store';
import { blockingIssues, canApprove, validateSession } from './validation';
import type {
  ApprovalRecord,
  MedicationBag,
  MedicationGroup,
  OCRField,
  PatientPayload,
  PatientReaction,
  QuestionType,
  Session,
  SharedContent,
  TimingCode,
} from './types';

const DEMO_PHARMACY = '서울 열린약국';
const DEMO_PHARMACIST = 'PHARM_DEMO_001';

function deviceCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createSession(params?: { pharmacyName?: string; pharmacistId?: string }): Session {
  ensureCleanupJob();
  const session: Session = {
    sessionId: nextId('SESSION_DEMO'),
    status: 'CAPTURED',
    pharmacyName: params?.pharmacyName ?? DEMO_PHARMACY,
    pharmacistId: params?.pharmacistId ?? DEMO_PHARMACIST,
    deviceCode: deviceCode(),
    bags: [],
    cards: [],
    issues: [],
    approval: null,
    avatarJob: null,
    reactions: [],
    shareId: null,
    contentVersion: 'GUIDANCE_V1',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
    imagesPurged: false,
    playbackRate: 1,
    focusCardId: null,
  };
  return saveSession(session);
}

export function requireSession(sessionId: string): Session {
  const session = getSession(sessionId);
  if (session === undefined) throw new Error('세션을 찾을 수 없습니다.');
  return session;
}

function toField<T>(
  raw: { value: T; confidence: number; originalText: string; normalizedText: string; bbox: OCRField<T>['bbox'] },
): OCRField<T> {
  return {
    value: raw.value,
    confidence: raw.confidence,
    originalText: raw.originalText,
    normalizedText: raw.normalizedText,
    bbox: raw.bbox,
    sourceType: 'BAG_OCR',
    verified: false,
  };
}

/** 같은 약품명과 복용법이 반복되면 자동 삭제하지 않고 중복 의심으로 표시한다 (설계서 10 5) */
function markDuplicates(session: Session, groups: MedicationGroup[]): MedicationGroup[] {
  const existing = session.bags.flatMap((bag) => bag.groups);
  return groups.map((group) => {
    const duplicate = existing.some(
      (other) =>
        other.medicineName.value !== null &&
        other.medicineName.value === group.medicineName.value &&
        other.frequencyPerDay.value === group.frequencyPerDay.value &&
        other.timingCode.value === group.timingCode.value,
    );
    return { ...group, duplicateSuspect: duplicate };
  });
}

/** OCR 결과를 세션에 추가한다 (POST /api/sessions/[id]/bags) */
export function addBag(
  sessionId: string,
  result: OCRResult,
  options: { imageRef: string; label?: string },
): Session {
  const session = requireSession(sessionId);
  const bagId = nextId('BAG');

  const groups: MedicationGroup[] = result.groups.map((group, index) => ({
    groupId: `${bagId}_G${index + 1}`,
    bagId,
    medicineName: toField(group.medicineName),
    doseAmount: toField(group.doseAmount),
    doseUnit: toField(group.doseUnit),
    frequencyPerDay: toField(group.frequencyPerDay),
    durationDays: toField(group.durationDays),
    timingCode: toField<TimingCode | null>(group.timingCode),
    asNeeded: toField(group.asNeeded),
    symptomText: group.symptomText,
    cautionIds: group.cautionIds,
    pharmacistNote: null,
    duplicateSuspect: false,
  }));

  const bag: MedicationBag = {
    bagId,
    label: options.label ?? `약봉투 ${session.bags.length + 1}`,
    // 약봉투 이미지는 세션 메모리에서만 처리하고 완료 시 폐기한다.
    imageRef: options.imageRef,
    imageQuality: result.imageQuality,
    rawText: result.rawText,
    asNeededBag: result.asNeededBag,
    groups: markDuplicates(session, groups),
    provider: result.provider,
    capturedAt: nowIso(),
  };

  const bags = [...session.bags, bag];
  const withBags: Session = { ...session, bags };
  const issues = validateSession(withBags);
  const status = blockingIssues(issues).length > 0 ? 'NEEDS_REVIEW' : 'OCR_COMPLETE';
  assertTransition(session.status, status);

  return saveSession({ ...withBags, issues, status });
}

export interface FieldUpdate {
  groupId: string;
  field: 'medicineName' | 'doseAmount' | 'doseUnit' | 'frequencyPerDay' | 'durationDays' | 'timingCode' | 'asNeeded';
  value: string | number | boolean | null;
}

const NUMERIC_FIELDS = new Set(['doseAmount', 'frequencyPerDay', 'durationDays']);

/**
 * 약사가 수정한 필드를 저장한다 (PATCH /api/sessions/[id]/medications).
 * 수정된 필드는 sourceType을 PHARMACIST_INPUT으로 바꾸고 verified 처리한다.
 */
export function updateMedications(
  sessionId: string,
  updates: FieldUpdate[],
  options?: { notes?: { groupId: string; note: string | null }[]; cautions?: { groupId: string; cautionIds: string[] }[] },
): Session {
  const session = requireSession(sessionId);

  const bags = session.bags.map((bag) => ({
    ...bag,
    groups: bag.groups.map((group) => {
      let next = { ...group };
      for (const update of updates.filter((item) => item.groupId === group.groupId)) {
        const current = next[update.field] as OCRField<unknown>;
        let value: unknown = update.value;
        if (NUMERIC_FIELDS.has(update.field)) {
          const parsed = Number(update.value);
          value = update.value === null || update.value === '' || !Number.isFinite(parsed) ? null : parsed;
        }
        if (update.field === 'asNeeded') value = Boolean(update.value);
        if (update.field === 'medicineName' && value === '') value = null;

        next = {
          ...next,
          [update.field]: {
            ...current,
            value,
            // 약사 직접입력은 신뢰도 표시 대신 약사 책임 표시를 사용한다.
            confidence: 1,
            sourceType: 'PHARMACIST_INPUT',
            verified: true,
            normalizedText: value === null ? '' : String(value),
          },
        } as MedicationGroup;
      }
      for (const note of options?.notes?.filter((item) => item.groupId === group.groupId) ?? []) {
        next = { ...next, pharmacistNote: note.note };
      }
      for (const caution of options?.cautions?.filter((item) => item.groupId === group.groupId) ?? []) {
        next = { ...next, cautionIds: caution.cautionIds as MedicationGroup['cautionIds'] };
      }
      return next;
    }),
  }));

  const withUpdates: Session = { ...session, bags };
  const issues = validateSession(withUpdates);
  const status = blockingIssues(issues).length > 0 ? 'NEEDS_REVIEW' : 'OCR_COMPLETE';
  return saveSession({ ...withUpdates, issues, status: session.status === 'CAPTURED' ? session.status : status });
}

/** 약사가 필드를 원문과 대조해 확인했다고 표시한다 */
export function markFieldsVerified(sessionId: string, groupId: string, fields: string[]): Session {
  const session = requireSession(sessionId);
  const bags = session.bags.map((bag) => ({
    ...bag,
    groups: bag.groups.map((group) => {
      if (group.groupId !== groupId) return group;
      let next = { ...group };
      for (const field of fields) {
        const key = field as keyof MedicationGroup;
        const current = next[key] as OCRField<unknown> | undefined;
        if (current === undefined || typeof current !== 'object' || !('confidence' in current)) continue;
        next = { ...next, [key]: { ...current, verified: true } } as MedicationGroup;
      }
      return next;
    }),
  }));
  const withUpdates: Session = { ...session, bags };
  const issues = validateSession(withUpdates);
  const status = blockingIssues(issues).length > 0 ? 'NEEDS_REVIEW' : 'OCR_COMPLETE';
  return saveSession({ ...withUpdates, issues, status });
}

/** OCR 검토 완료 → VERIFIED (POST /api/sessions/[id]/compose 직전) */
export function verifySession(sessionId: string): Session {
  const session = requireSession(sessionId);
  const issues = validateSession(session);
  if (blockingIssues(issues).length > 0) {
    throw new Error('확인이 필요한 항목이 남아 있어 다음 단계로 이동할 수 없습니다.');
  }
  assertTransition(session.status, 'VERIFIED');
  return saveSession({ ...session, issues, status: 'VERIFIED' });
}

/** 안내카드 생성 (POST /api/sessions/[id]/compose) */
export function composeSession(sessionId: string): Session {
  let session = requireSession(sessionId);
  if (session.status !== 'VERIFIED' && session.status !== 'COMPOSED') {
    session = verifySession(sessionId);
  }
  const cards = composeCards(session);
  assertTransition(session.status, 'COMPOSED');
  return saveSession({ ...session, cards, status: 'COMPOSED' });
}

/** 안내카드 선택 상태와 순서를 변경한다 */
export function updateCards(
  sessionId: string,
  changes: { cardId: string; selected?: boolean; order?: number; displayText?: string }[],
): Session {
  const session = requireSession(sessionId);
  const cards = session.cards
    .map((card) => {
      const change = changes.find((item) => item.cardId === card.cardId);
      if (change === undefined) return card;
      const next = { ...card };
      if (change.selected !== undefined) next.selected = change.selected;
      if (change.order !== undefined) next.order = change.order;
      if (change.displayText !== undefined && change.displayText.trim() !== '') {
        next.displayText = change.displayText.trim();
        next.pharmacistAuthored = true;
        next.sourceType = 'PHARMACIST_INPUT';
      }
      return next;
    })
    .sort((a, b) => a.order - b.order);
  return saveSession({ ...session, cards });
}

/** 약사 입력카드 추가 — 자유입력에는 약사 책임 표시를 남긴다 */
export function addPharmacistCard(sessionId: string, text: string): Session {
  const session = requireSession(sessionId);
  const trimmed = text.trim();
  if (trimmed === '') throw new Error('안내 문구를 입력해 주세요.');
  const maxOrder = session.cards.reduce((max, card) => Math.max(max, card.order), 0);
  const closing = session.cards.find((card) => card.type === 'CLOSING');
  const card = {
    cardId: nextId('CARD'),
    type: 'PHARMACIST_NOTE' as const,
    sourceType: 'PHARMACIST_INPUT' as const,
    required: false,
    selected: true,
    pharmacistVerified: true,
    displayText: trimmed,
    signPayload: { templateId: 'PHARMACIST_NOTE_V1', slots: { text: trimmed }, gloss: ['약사', '설명', '추가'] },
    groupId: null,
    bagId: null,
    pharmacistAuthored: true,
    order: closing === undefined ? maxOrder + 1 : closing.order,
  };
  const cards = [...session.cards, card]
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
  return saveSession({ ...session, cards });
}

/**
 * 약사 최종 승인 (POST /api/sessions/[id]/approve).
 * 승인 이후에만 환자 화면으로 복약정보가 전송된다.
 */
export async function approveSession(
  sessionId: string,
  checks: ApprovalRecord['checks'],
): Promise<Session> {
  const session = requireSession(sessionId);
  const verdict = canApprove(session, checks);
  if (!verdict.ok) throw new Error(verdict.reasons.join(' '));

  assertTransition(session.status, 'APPROVED');

  const approval: ApprovalRecord = {
    checks,
    pharmacistId: session.pharmacistId,
    approvedAt: nowIso(),
    contentVersion: session.contentVersion,
  };

  const provider = getAvatarProvider();
  let avatarJob = session.avatarJob;
  try {
    avatarJob = await provider.createJob({
      sessionId: session.sessionId,
      contentVersion: session.contentVersion,
      language: 'KSL',
      cards: toAvatarCards(session.cards),
    });
  } catch (error) {
    // 아바타 생성 실패 시 자막만 자동 재생하지 않고 약사에게 실패를 알린다 (설계서 12 3).
    avatarJob = {
      jobId: nextId('AVATAR_JOB'),
      sessionId: session.sessionId,
      contentVersion: session.contentVersion,
      language: 'KSL',
      status: 'FAILED',
      playbackType: 'placeholder',
      playbackUrl: null,
      segments: [],
      provider: 'unknown',
      cached: false,
      createdAt: nowIso(),
      readyAt: null,
      error: error instanceof Error ? error.message : '아바타 생성에 실패했습니다.',
    };
  }

  const cards = session.cards.map((card) => (card.selected ? { ...card, pharmacistVerified: true } : card));
  return saveSession({ ...session, status: 'APPROVED', approval, avatarJob, cards, focusCardId: null });
}

/** 승인 이후 문장을 바꾸려면 재생을 중단하고 검토 단계로 되돌린다 (설계서 8 5) */
export function revokeApproval(sessionId: string): Session {
  const session = requireSession(sessionId);
  assertTransition(session.status, 'COMPOSED');
  return saveSession({ ...session, status: 'COMPOSED', approval: null, avatarJob: null, focusCardId: null });
}

/** 환자 반응 기록 (POST /api/sessions/[id]/reactions) */
export function recordReaction(
  sessionId: string,
  input: { type: PatientReaction['type']; questionType?: QuestionType | null; cardId?: string | null },
): Session {
  const session = requireSession(sessionId);
  if (!isPatientVisible(session.status)) {
    throw new Error('약사 승인 전에는 환자 반응을 기록할 수 없습니다.');
  }

  const reaction: PatientReaction = {
    reactionId: nextId('REACTION'),
    type: input.type,
    questionType: input.questionType ?? null,
    cardId: input.cardId ?? null,
    createdAt: nowIso(),
    resolved: false,
  };

  let status = session.status;
  if (input.type === 'PLAY_STARTED' && (status === 'APPROVED' || status === 'QUESTION')) status = 'PLAYING';
  if (input.type === 'REPLAY' && status === 'QUESTION') status = 'PLAYING';
  if (input.type === 'QUESTION' && (status === 'PLAYING' || status === 'APPROVED')) status = 'QUESTION';

  const playbackRate = input.type === 'SLOW' ? 0.7 : session.playbackRate;
  return saveSession({ ...session, reactions: [...session.reactions, reaction], status, playbackRate });
}

/** 약사가 질문에 대응해 특정 카드만 다시 전송한다 (부록 A 2 10번) */
export function resolveQuestion(sessionId: string, reactionId: string, cardId: string | null): Session {
  const session = requireSession(sessionId);
  const reactions = session.reactions.map((reaction) =>
    reaction.reactionId === reactionId ? { ...reaction, resolved: true } : reaction,
  );
  const status = session.status === 'QUESTION' ? 'PLAYING' : session.status;
  return saveSession({ ...session, reactions, focusCardId: cardId, status });
}

export function setPlaybackRate(sessionId: string, rate: number): Session {
  const session = requireSession(sessionId);
  return saveSession({ ...session, playbackRate: rate });
}

function buildSharedContent(session: Session): SharedContent {
  return {
    contentVersion: session.contentVersion,
    pharmacyName: session.pharmacyName,
    approvedAt: session.approval?.approvedAt ?? nowIso(),
    cards: selectedCards(session).map((card) => ({
      cardId: card.cardId,
      type: card.type,
      displayText: card.displayText,
      signPayload: card.signPayload,
      order: card.order,
    })),
    avatar:
      session.avatarJob === null
        ? null
        : {
            jobId: session.avatarJob.jobId,
            playbackType: session.avatarJob.playbackType,
            playbackUrl: session.avatarJob.playbackUrl,
            segments: session.avatarJob.segments,
          },
  };
}

export interface CompleteResult {
  session: Session;
  /** 토큰 원문은 이 응답에서 1회만 전달한다 */
  token: string;
  shareUrl: string;
  issuedAt: string;
  expiresAt: string;
  expiryLabel: string;
}

/**
 * 세션 종료 (POST /api/sessions/[id]/complete).
 * 약봉투 이미지를 폐기하고 최종 승인본에 대한 48시간 QR을 발급한다.
 */
export function completeSession(sessionId: string, baseUrl: string): CompleteResult {
  const session = requireSession(sessionId);
  if (session.approval === null) {
    throw new Error('약사 최종 승인이 없는 세션은 종료할 수 없습니다.');
  }
  if (session.status !== 'COMPLETED' && session.status !== 'QR_ACTIVE') {
    assertTransition(session.status, 'COMPLETED');
  }

  const content = buildSharedContent(session);
  const { share, token } = issueShare({
    shareId: nextId('SHARE_DEMO'),
    sessionId: session.sessionId,
    contentVersion: session.contentVersion,
    content,
  });
  saveShare(share);

  // 약봉투 원본 이미지를 세션에서 제거한다 (설계서 10 1 세션 폐기).
  const bags = session.bags.map((bag) => ({ ...bag, imageRef: '' }));

  const completed = saveSession({
    ...session,
    bags,
    status: 'QR_ACTIVE',
    completedAt: nowIso(),
    imagesPurged: true,
    shareId: share.shareId,
    focusCardId: null,
  });

  return {
    session: completed,
    token,
    shareUrl: `${baseUrl.replace(/\/$/, '')}/r/${token}`,
    issuedAt: share.issuedAt,
    expiresAt: share.expiresAt,
    expiryLabel: formatExpiryKorean(share.expiresAt),
  };
}

/** 약사 즉시 폐기 (DELETE /api/shares/[id]) */
export function revokeShareForSession(shareId: string): { ok: boolean } {
  const share = getShare(shareId);
  if (share === undefined) return { ok: false };
  saveShare(revokeShare(share));
  const session = getSession(share.sessionId);
  if (session !== undefined && session.status === 'QR_ACTIVE') {
    saveSession({ ...session, status: 'QR_EXPIRED' });
  }
  return { ok: true };
}

/**
 * 환자 태블릿용 승인 콘텐츠 (GET /api/sessions/[id]/patient).
 * 승인 전에는 복약정보를 반환하지 않는다.
 * QR 주소는 약사 완료화면에서만 노출하므로 이 응답에는 담지 않는다.
 */
export function patientPayload(sessionId: string): PatientPayload {
  const session = requireSession(sessionId);
  const approved = isPatientVisible(session.status);

  if (!approved) {
    return {
      sessionId: session.sessionId,
      status: session.status,
      approved: false,
      pharmacyName: session.pharmacyName,
      contentVersion: session.contentVersion,
      cards: [],
      avatar: null,
      playbackRate: session.playbackRate,
      focusCardId: null,
      share: null,
      message: '약사가 수어 복약안내를 준비하고 있습니다',
    };
  }

  const content = buildSharedContent(session);
  const share = session.shareId === null ? undefined : getShare(session.shareId);

  return {
    sessionId: session.sessionId,
    status: session.status,
    approved: true,
    pharmacyName: session.pharmacyName,
    contentVersion: session.contentVersion,
    cards: content.cards,
    avatar: content.avatar,
    playbackRate: session.playbackRate,
    focusCardId: session.focusCardId,
    share:
      share === undefined || !isReadable(share)
        ? null
        : { issuedAt: share.issuedAt, expiresAt: share.expiresAt, url: '' },
    message: '준비가 되면 안내 시작을 눌러 주세요',
  };
}

/**
 * QR 토큰으로 승인본을 조회한다 (GET /r/[token]).
 * 만료·폐기된 토큰에는 복약내용을 반환하지 않는다.
 */
export type ShareReadResult =
  | { ok: true; content: SharedContent; issuedAt: string; expiresAt: string; expiryLabel: string; remainingHours: number }
  | { ok: false; reason: 'NOT_FOUND' | 'EXPIRED' | 'REVOKED' | 'PURGED'; message: string };

export function readShareByToken(token: string): ShareReadResult {
  ensureCleanupJob();
  const share = findShareByToken(token);
  if (share === undefined) {
    return { ok: false, reason: 'NOT_FOUND', message: '이 안내는 더 이상 이용할 수 없습니다' };
  }

  const status = effectiveStatus(share, now());
  if (status === 'REVOKED') {
    return { ok: false, reason: 'REVOKED', message: '이 안내는 더 이상 이용할 수 없습니다' };
  }
  if (status === 'PURGED' || status === 'PURGE_PENDING') {
    return { ok: false, reason: 'PURGED', message: '이 안내는 만료되었습니다  약국에 문의해 주세요' };
  }
  if (status === 'EXPIRED' || share.content === null) {
    // 만료된 토큰은 복약정보를 반환하지 않고 만료 안내만 제공한다 (설계서 8 8 6번).
    return { ok: false, reason: 'EXPIRED', message: '이 안내는 만료되었습니다  약국에 문의해 주세요' };
  }

  saveShare({ ...share, accessCount: share.accessCount + 1 });

  return {
    ok: true,
    content: share.content,
    issuedAt: share.issuedAt,
    expiresAt: share.expiresAt,
    expiryLabel: formatExpiryKorean(share.expiresAt),
    remainingHours: Math.max(0, (Date.parse(share.expiresAt) - now()) / 3_600_000),
  };
}

export function shareStatusOf(shareId: string): string | null {
  const share = getShare(shareId);
  if (share === undefined) return null;
  return effectiveStatus(share, now());
}
