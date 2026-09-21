/**
 * 세션 상태 전이 — 설계서 11 2 상태값 기준.
 * 승인 전 상태에서는 환자 화면으로 복약정보를 전송하지 않는다.
 */

import { PATIENT_VISIBLE_STATUSES, type SessionStatus } from './types';

const TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  CAPTURED: ['OCR_COMPLETE', 'NEEDS_REVIEW', 'CAPTURED', 'CANCELLED'],
  // 약봉투 추가 촬영은 같은 단계에 머문다.
  OCR_COMPLETE: ['OCR_COMPLETE', 'NEEDS_REVIEW', 'VERIFIED', 'CAPTURED', 'CANCELLED'],
  NEEDS_REVIEW: ['NEEDS_REVIEW', 'OCR_COMPLETE', 'VERIFIED', 'CAPTURED', 'CANCELLED'],
  VERIFIED: ['COMPOSED', 'OCR_COMPLETE', 'NEEDS_REVIEW', 'CAPTURED', 'CANCELLED'],
  COMPOSED: ['APPROVED', 'COMPOSED', 'VERIFIED', 'OCR_COMPLETE', 'NEEDS_REVIEW', 'CAPTURED', 'CANCELLED'],
  // 승인 후 문장을 바꾸려면 재생을 중단하고 검토 단계로 되돌린다 (설계서 8 5)
  APPROVED: ['PLAYING', 'COMPLETED', 'COMPOSED', 'CANCELLED'],
  PLAYING: ['QUESTION', 'PLAYING', 'COMPLETED', 'COMPOSED', 'CANCELLED'],
  QUESTION: ['PLAYING', 'COMPLETED', 'COMPOSED', 'CANCELLED'],
  COMPLETED: ['QR_ACTIVE', 'COMPLETED'],
  QR_ACTIVE: ['QR_EXPIRED', 'COMPLETED'],
  QR_EXPIRED: [],
  CANCELLED: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: SessionStatus, to: SessionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`허용되지 않은 상태 전이입니다: ${from} → ${to}`);
  }
}

/** 설계서 11 2 "환자 전송" 열 — 승인 이후 상태만 복약정보를 반환할 수 있다 */
export function isPatientVisible(status: SessionStatus): boolean {
  return PATIENT_VISIBLE_STATUSES.includes(status);
}

/** 약사 화면 진행단계 — 촬영, 확인, 안내구성, 승인, 완료 5단계로 고정한다 (부록 C 6) */
export const PHARMACIST_STEPS = ['촬영', '확인', '안내구성', '승인', '완료'] as const;
export type PharmacistStep = (typeof PHARMACIST_STEPS)[number];

export function stepOf(status: SessionStatus): PharmacistStep {
  switch (status) {
    case 'CAPTURED':
      return '촬영';
    case 'OCR_COMPLETE':
    case 'NEEDS_REVIEW':
      return '확인';
    case 'VERIFIED':
    case 'COMPOSED':
      return '안내구성';
    case 'APPROVED':
    case 'PLAYING':
    case 'QUESTION':
      return '승인';
    case 'COMPLETED':
    case 'QR_ACTIVE':
    case 'QR_EXPIRED':
    case 'CANCELLED':
      return '완료';
  }
}

export const STATUS_LABELS: Record<SessionStatus, string> = {
  CAPTURED: '이미지 입력 완료',
  OCR_COMPLETE: 'OCR 처리 완료',
  NEEDS_REVIEW: '필수 검토 항목 존재',
  VERIFIED: '약사 확인 완료',
  COMPOSED: '안내카드 구성 완료',
  APPROVED: '약사 최종 승인',
  PLAYING: '환자 태블릿 재생 중',
  QUESTION: '환자 질문 요청',
  COMPLETED: '현장 안내 종료',
  QR_ACTIVE: 'QR 재열람 가능',
  QR_EXPIRED: 'QR 만료',
  CANCELLED: '세션 취소',
};
