import { describe, expect, it } from 'vitest';
import { PHARMACIST_STEPS, canTransition, isPatientVisible, stepOf } from './state';
import { SESSION_STATUSES } from './types';

describe('상태 전이', () => {
  it('승인 전 상태에서 환자 전송을 허용하지 않는다', () => {
    const blocked = [
      'CAPTURED',
      'OCR_COMPLETE',
      'NEEDS_REVIEW',
      'VERIFIED',
      'COMPOSED',
      'QR_EXPIRED',
      'CANCELLED',
    ] as const;
    for (const status of blocked) expect(isPatientVisible(status)).toBe(false);
  });

  it('승인 이후 상태에서만 환자 전송을 허용한다', () => {
    for (const status of ['APPROVED', 'PLAYING', 'QUESTION', 'COMPLETED'] as const) {
      expect(isPatientVisible(status)).toBe(true);
    }
  });

  it('검토 단계에서 바로 승인으로 건너갈 수 없다', () => {
    expect(canTransition('NEEDS_REVIEW', 'APPROVED')).toBe(false);
    expect(canTransition('OCR_COMPLETE', 'APPROVED')).toBe(false);
    expect(canTransition('VERIFIED', 'APPROVED')).toBe(false);
    expect(canTransition('COMPOSED', 'APPROVED')).toBe(true);
  });

  it('승인본을 수정하려면 안내구성 단계로 되돌린다', () => {
    expect(canTransition('APPROVED', 'COMPOSED')).toBe(true);
    expect(canTransition('PLAYING', 'COMPOSED')).toBe(true);
  });

  it('만료와 취소는 종료 상태다', () => {
    expect(canTransition('QR_EXPIRED', 'QR_ACTIVE')).toBe(false);
    expect(canTransition('CANCELLED', 'CAPTURED')).toBe(false);
  });

  it('모든 상태가 5단계 중 하나에 대응한다', () => {
    for (const status of SESSION_STATUSES) {
      expect(PHARMACIST_STEPS).toContain(stepOf(status));
    }
  });
});
