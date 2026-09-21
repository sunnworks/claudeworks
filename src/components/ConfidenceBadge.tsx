'use client';

import { publicConfig } from '@/lib/config';

export type BadgeLevel = 'HIGH' | 'REVIEW' | 'LOW' | 'MISSING' | 'PHARMACIST';

/**
 * 신뢰도 표시 — 설계서 10 3.
 * 색상만으로 상태를 구분하지 않고 아이콘과 문구를 함께 제공한다 (설계서 9 2).
 */
export function levelOf(confidence: number, value: unknown, verified: boolean): BadgeLevel {
  if (value === null || value === undefined || value === '') return 'MISSING';
  if (verified) return 'PHARMACIST';
  if (confidence >= publicConfig.confidenceHigh) return 'HIGH';
  if (confidence >= publicConfig.confidenceReview) return 'REVIEW';
  return 'LOW';
}

const STYLES: Record<BadgeLevel, { icon: string; label: string; className: string }> = {
  HIGH: { icon: '✓', label: '확인', className: 'bg-ok-soft text-ok' },
  REVIEW: { icon: '!', label: '주의', className: 'bg-warn-soft text-warn' },
  LOW: { icon: '✕', label: '오류', className: 'bg-danger-soft text-danger' },
  MISSING: { icon: '✎', label: '입력 필요', className: 'bg-danger-soft text-danger' },
  PHARMACIST: { icon: '✓', label: '약사 확인', className: 'bg-brand-soft text-brand-dark' },
};

export function ConfidenceBadge({
  confidence,
  value,
  verified,
}: {
  confidence: number;
  value: unknown;
  verified: boolean;
}) {
  const level = levelOf(confidence, value, verified);
  const style = STYLES[level];
  const showNumber = level === 'HIGH' || level === 'REVIEW' || level === 'LOW';

  return (
    <span className={`chip ${style.className}`}>
      <span aria-hidden>{style.icon}</span>
      {style.label}
      {showNumber && <span className="font-mono font-normal">{confidence.toFixed(2)}</span>}
    </span>
  );
}
