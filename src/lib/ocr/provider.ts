/**
 * OCR Provider 인터페이스 — 설계서 14 1 / 부록 C 2.
 * mock과 live 구현을 분리해 OCR 사업자를 교체할 수 있게 한다.
 */

import type { BBox, CautionId, ImageQuality, TimingCode } from '@/lib/types';

export interface OCRFieldResult<T> {
  value: T;
  confidence: number;
  originalText: string;
  normalizedText: string;
  bbox: BBox | null;
}

export interface OCRGroupResult {
  medicineName: OCRFieldResult<string | null>;
  doseAmount: OCRFieldResult<number | null>;
  doseUnit: OCRFieldResult<string | null>;
  frequencyPerDay: OCRFieldResult<number | null>;
  durationDays: OCRFieldResult<number | null>;
  timingCode: OCRFieldResult<TimingCode | null>;
  asNeeded: OCRFieldResult<boolean>;
  symptomText: string | null;
  cautionIds: CautionId[];
}

/** 설계서 14 4 OCR 응답 예시 */
export interface OCRResult {
  provider: string;
  imageQuality: ImageQuality;
  rawText: string;
  groups: OCRGroupResult[];
  asNeededBag: boolean;
  /** OCR 단계에서 감지한 경고 메시지 */
  notes: string[];
}

export interface OCRRequest {
  /** data URL 또는 샘플 이미지 경로. 서버 메모리에서만 사용한다. */
  image?: string;
  /** 샘플 모드에서 사용할 고정 결과 ID */
  sampleId?: string;
  /** 업로드 파일의 MIME 타입 */
  mimeType?: string;
  /** 업로드 파일 크기(byte) */
  sizeBytes?: number;
}

export interface OCRProvider {
  readonly name: string;
  recognize(request: OCRRequest): Promise<OCRResult>;
}

/** 입력 파일 검사 — 형식, 용량 (설계서 10 1 입력 안전장치) */
export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export function validateImageInput(request: OCRRequest): string | null {
  if (request.sampleId !== undefined) return null;
  if (request.image === undefined || request.image === '') {
    return '약봉투 이미지가 없습니다. 촬영하거나 사진을 불러와 주세요.';
  }
  if (request.mimeType !== undefined && !ACCEPTED_MIME.includes(request.mimeType as (typeof ACCEPTED_MIME)[number])) {
    return 'JPG, PNG, WEBP 형식의 이미지만 사용할 수 있습니다.';
  }
  if (request.sizeBytes !== undefined && request.sizeBytes > MAX_IMAGE_BYTES) {
    return '이미지 용량이 너무 큽니다. 12MB 이하로 다시 촬영해 주세요.';
  }
  return null;
}
