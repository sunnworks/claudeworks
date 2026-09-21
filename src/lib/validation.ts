/**
 * 검증 엔진 — 설계서 10 3 신뢰도와 검증 규칙 / 8 4 OCR 결과 확인 기준.
 *
 * 핵심 원칙: 필수값이 없거나 신뢰도가 낮으면 약사가 직접 확인하기 전까지
 * 최종 승인과 환자 전송을 차단한다 (부록 C 5 안전 규칙).
 */

import { confidenceThresholds } from './config';
import type {
  ConfidenceLevel,
  MedicationBag,
  MedicationFieldKey,
  MedicationGroup,
  OCRField,
  Session,
  ValidationIssue,
} from './types';

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= confidenceThresholds.high) return 'HIGH';
  if (confidence >= confidenceThresholds.review) return 'REVIEW';
  return 'LOW';
}

/** 약사가 직접 확인·수정한 필드는 신뢰도와 무관하게 통과시킨다 */
function fieldBlocked(field: OCRField<unknown>): boolean {
  if (field.verified) return false;
  return confidenceLevel(field.confidence) === 'LOW';
}

/** 복용법 중심 모드: 약품명이 없어도 복용법만으로 안내한다 (설계서 8 4) */
export function isDosingOnlyMode(group: MedicationGroup): boolean {
  const name = group.medicineName.value;
  return name === null || name.trim() === '';
}

const REQUIRED_FIELDS: MedicationFieldKey[] = [
  'doseAmount',
  'frequencyPerDay',
  'durationDays',
  'timingCode',
];

const FIELD_LABELS: Record<MedicationFieldKey, string> = {
  medicineName: '약품명',
  doseAmount: '1회 복용량',
  doseUnit: '단위',
  frequencyPerDay: '1일 복용횟수',
  durationDays: '복용기간',
  timingCode: '복용시점',
  asNeeded: '필요시 복용',
};

export function fieldLabel(key: MedicationFieldKey): string {
  return FIELD_LABELS[key];
}

/**
 * 필요시약은 1일 복용횟수와 복용기간이 없을 수 있으므로 필수에서 제외한다
 * (설계서 8 4 특별복용 / 10 5 다중 약봉투 병합).
 */
function requiredFieldsFor(group: MedicationGroup): MedicationFieldKey[] {
  if (group.asNeeded.value) return ['doseAmount'];
  return REQUIRED_FIELDS;
}

function fieldOf(group: MedicationGroup, key: MedicationFieldKey): OCRField<unknown> {
  switch (key) {
    case 'medicineName':
      return group.medicineName;
    case 'doseAmount':
      return group.doseAmount;
    case 'doseUnit':
      return group.doseUnit;
    case 'frequencyPerDay':
      return group.frequencyPerDay;
    case 'durationDays':
      return group.durationDays;
    case 'timingCode':
      return group.timingCode;
    case 'asNeeded':
      return group.asNeeded;
  }
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/** 하나의 복용그룹을 검증한다 */
export function validateGroup(bag: MedicationBag, group: MedicationGroup): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const key of requiredFieldsFor(group)) {
    const field = fieldOf(group, key);
    if (isEmpty(field.value)) {
      issues.push({
        code: 'MISSING_REQUIRED',
        severity: 'BLOCKING',
        bagId: bag.bagId,
        groupId: group.groupId,
        field: key,
        message: `${FIELD_LABELS[key]}을(를) 직접 확인해 주세요.`,
      });
      continue;
    }
    if (fieldBlocked(field)) {
      issues.push({
        code: 'LOW_CONFIDENCE',
        severity: 'BLOCKING',
        bagId: bag.bagId,
        groupId: group.groupId,
        field: key,
        message: `${FIELD_LABELS[key]}의 인식 신뢰도가 낮습니다. 약봉투 원문과 대조해 확인해 주세요.`,
      });
      continue;
    }
    if (!field.verified && confidenceLevel(field.confidence) === 'REVIEW') {
      issues.push({
        code: 'NEEDS_REVIEW_CONFIDENCE',
        severity: 'WARNING',
        bagId: bag.bagId,
        groupId: group.groupId,
        field: key,
        message: `${FIELD_LABELS[key]}을(를) 약봉투 원문과 비교해 주세요.`,
      });
    }
  }

  // 1회 복용량에는 단위가 함께 있어야 문장을 만들 수 있다.
  if (!isEmpty(group.doseAmount.value) && isEmpty(group.doseUnit.value)) {
    issues.push({
      code: 'MISSING_REQUIRED',
      severity: 'BLOCKING',
      bagId: bag.bagId,
      groupId: group.groupId,
      field: 'doseUnit',
      message: '복용 단위(정, 포 등)를 확인해 주세요.',
    });
  }

  if (isDosingOnlyMode(group)) {
    issues.push({
      code: 'NO_MEDICINE_NAME',
      severity: 'WARNING',
      bagId: bag.bagId,
      groupId: group.groupId,
      field: 'medicineName',
      message: '약품명이 표시되지 않은 봉투입니다. 복용법 중심으로 안내합니다.',
    });
  }

  if (group.duplicateSuspect) {
    issues.push({
      code: 'DUPLICATE_SUSPECT',
      severity: 'WARNING',
      bagId: bag.bagId,
      groupId: group.groupId,
      field: null,
      message: '같은 약품명과 복용법이 중복 인식되었습니다. 약사가 확인해 주세요.',
    });
  }

  return issues;
}

/**
 * 같은 봉투 안에서 서로 다른 복용정보가 인식된 경우 충돌로 표시한다
 * (설계서 10 3 충돌 / 16 값 충돌).
 */
export function detectConflicts(bag: MedicationBag): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const regular = bag.groups.filter((group) => !group.asNeeded.value);
  if (regular.length < 2) return issues;

  const keys: MedicationFieldKey[] = ['frequencyPerDay', 'durationDays', 'timingCode'];
  for (const key of keys) {
    const values = new Set(
      regular
        .map((group) => fieldOf(group, key).value)
        .filter((value) => !isEmpty(value))
        .map((value) => String(value)),
    );
    if (values.size > 1) {
      issues.push({
        code: 'CONFLICT',
        severity: 'BLOCKING',
        bagId: bag.bagId,
        groupId: null,
        field: key,
        message: `서로 다른 ${FIELD_LABELS[key]}이(가) 인식되었습니다. 원문 영역을 비교해 값을 선택해 주세요.`,
      });
    }
  }
  return issues;
}

export function validateBag(bag: MedicationBag): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (bag.imageQuality.status === 'RETAKE') {
    issues.push({
      code: 'IMAGE_QUALITY',
      severity: 'BLOCKING',
      bagId: bag.bagId,
      groupId: null,
      field: null,
      message: bag.imageQuality.messages[0] ?? '약봉투를 다시 촬영해 주세요.',
    });
  } else if (bag.imageQuality.status === 'REVIEW') {
    issues.push({
      code: 'IMAGE_QUALITY',
      severity: 'WARNING',
      bagId: bag.bagId,
      groupId: null,
      field: null,
      message: bag.imageQuality.messages[0] ?? '이미지 품질을 확인해 주세요.',
    });
  }

  for (const group of bag.groups) issues.push(...validateGroup(bag, group));
  issues.push(...detectConflicts(bag));
  return issues;
}

export function validateSession(session: Session): ValidationIssue[] {
  return session.bags.flatMap(validateBag);
}

export function blockingIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => issue.severity === 'BLOCKING');
}

/** OCR 검토 완료(다음 단계 이동) 가능 여부 */
export function canProceedToCompose(session: Session): boolean {
  if (session.bags.length === 0) return false;
  return blockingIssues(validateSession(session)).length === 0;
}

/**
 * 최종 승인 가능 여부.
 * 차단 이슈가 없고, 선택된 안내카드가 있으며, 약사 확인 체크 5개가 모두 완료돼야 한다
 * (설계서 15 2 약사 확인 체크).
 */
export function canApprove(
  session: Session,
  checks: {
    ocrMatchesBag: boolean;
    missingFieldsChecked: boolean;
    cautionsAppropriate: boolean;
    subtitlesChecked: boolean;
    finalApproval: boolean;
  },
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (session.bags.length === 0) reasons.push('약봉투가 등록되지 않았습니다.');

  const blocking = blockingIssues(validateSession(session));
  if (blocking.length > 0) {
    reasons.push(`확인이 필요한 항목이 ${blocking.length}건 남아 있습니다.`);
  }

  if (session.cards.filter((card) => card.selected).length === 0) {
    reasons.push('선택된 안내카드가 없습니다.');
  }

  const unchecked = Object.entries(checks).filter(([, value]) => !value);
  if (unchecked.length > 0) reasons.push('약사 확인 체크가 완료되지 않았습니다.');

  return { ok: reasons.length === 0, reasons };
}
