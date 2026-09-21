/**
 * 시연용 가상 약봉투 데이터 — 부록 A 3 기준.
 * 실제 의약품이나 처방이 아니며 모든 값은 데모용 가상 데이터다.
 */

import type { BBox, CautionId, ImageQuality, TimingCode } from '@/lib/types';

export interface SampleField<T> {
  value: T;
  confidence: number;
  originalText: string;
  normalizedText: string;
  bbox: BBox | null;
}

export interface SampleGroup {
  medicineName: SampleField<string | null>;
  doseAmount: SampleField<number | null>;
  doseUnit: SampleField<string | null>;
  frequencyPerDay: SampleField<number | null>;
  durationDays: SampleField<number | null>;
  timingCode: SampleField<TimingCode | null>;
  asNeeded: SampleField<boolean>;
  symptomText: string | null;
  cautionIds: CautionId[];
}

export interface SampleBag {
  sampleId: string;
  label: string;
  /**
   * 시연 분류용 태그. 설계서 12 4에 따라 데모 메뉴와 통계의 선택적 태그로만 사용하고
   * 질환으로 복용법을 추정하지 않는다.
   */
  caseTag: string;
  description: string;
  imageRef: string;
  asNeededBag: boolean;
  imageQuality: ImageQuality;
  rawText: string;
  groups: SampleGroup[];
}

const PASS_QUALITY: ImageQuality = {
  status: 'PASS',
  blur: 0.08,
  glare: 0.04,
  cropped: false,
  rotationDeg: 0,
  messages: [],
};

/** T02 시험: 흐린 약봉투 → 재촬영 안내와 승인 차단 */
const BLUR_QUALITY: ImageQuality = {
  status: 'RETAKE',
  blur: 0.62,
  glare: 0.07,
  cropped: false,
  rotationDeg: 1.5,
  messages: ['글자가 선명하지 않습니다  카메라를 고정하고 다시 촬영해 주세요'],
};

/** T03 시험: 반사된 약봉투 → 반사 경고 */
const GLARE_QUALITY: ImageQuality = {
  status: 'REVIEW',
  blur: 0.14,
  glare: 0.48,
  cropped: false,
  rotationDeg: 0.5,
  messages: ['빛이 반사되고 있습니다  약봉투의 각도를 바꿔 주세요'],
};

export const SAMPLE_BAGS: SampleBag[] = [
  {
    sampleId: 'SAMPLE_BAG_1',
    label: '샘플 약봉투 1 · 정규 복용약 (선명)',
    caseTag: '감기',
    description: '1회 1포 · 1일 3회 · 3일분 · 식후 30분',
    imageRef: '/samples/bag-regular.svg',
    asNeededBag: false,
    imageQuality: PASS_QUALITY,
    rawText:
      '서울 열린약국 / 환자 김OO / 조제일 2026년 9월 21일\n' +
      '시연용 A정  시연용 B캡슐  시연용 C정\n' +
      '1회 1포 / 1일 3회 / 3일분 / 식후 30분\n' +
      '주의  졸음이 올 수 있음',
    groups: [
      {
        medicineName: {
          value: '시연용 A정, 시연용 B캡슐, 시연용 C정',
          confidence: 0.94,
          originalText: '시연용 A정 시연용 B캡슐 시연용 C정',
          normalizedText: '시연용 A정, 시연용 B캡슐, 시연용 C정',
          bbox: { x: 0.08, y: 0.3, w: 0.84, h: 0.12 },
        },
        doseAmount: {
          value: 1,
          confidence: 0.97,
          originalText: '1회 1포',
          normalizedText: '1회 1포',
          bbox: { x: 0.08, y: 0.47, w: 0.34, h: 0.07 },
        },
        doseUnit: {
          value: '포',
          confidence: 0.97,
          originalText: '포',
          normalizedText: '포',
          bbox: { x: 0.28, y: 0.47, w: 0.1, h: 0.07 },
        },
        frequencyPerDay: {
          value: 3,
          confidence: 0.95,
          originalText: '1일 3회',
          normalizedText: '1일 3회',
          bbox: { x: 0.45, y: 0.47, w: 0.3, h: 0.07 },
        },
        // 부록 A 2 4번 시연: 복용기간 신뢰도가 노란색으로 표시되고 약사가 원문을 보고 확인한다.
        durationDays: {
          value: 3,
          confidence: 0.82,
          originalText: '3일분',
          normalizedText: '3일',
          bbox: { x: 0.08, y: 0.57, w: 0.3, h: 0.07 },
        },
        timingCode: {
          value: 'AFTER_MEAL_30',
          confidence: 0.91,
          originalText: '식후 30분',
          normalizedText: '식후 30분',
          bbox: { x: 0.45, y: 0.57, w: 0.4, h: 0.07 },
        },
        asNeeded: {
          value: false,
          confidence: 0.99,
          originalText: '',
          normalizedText: '상시 복용',
          bbox: null,
        },
        symptomText: null,
        cautionIds: ['DROWSINESS'],
      },
    ],
  },
  {
    sampleId: 'SAMPLE_BAG_2',
    label: '샘플 약봉투 2 · 필요시약',
    caseTag: '통증',
    description: '증상이 있을 때 1회 1정 (T04 시험)',
    imageRef: '/samples/bag-asneeded.svg',
    asNeededBag: true,
    imageQuality: PASS_QUALITY,
    rawText:
      '서울 열린약국 / 필요시약\n시연용 D정\n증상이 있을 때 1회 1정\n주의  최소 4시간 간격을 두고 복용',
    groups: [
      {
        medicineName: {
          value: '시연용 D정',
          confidence: 0.93,
          originalText: '시연용 D정',
          normalizedText: '시연용 D정',
          bbox: { x: 0.1, y: 0.32, w: 0.5, h: 0.1 },
        },
        doseAmount: {
          value: 1,
          confidence: 0.96,
          originalText: '1회 1정',
          normalizedText: '1회 1정',
          bbox: { x: 0.1, y: 0.48, w: 0.35, h: 0.08 },
        },
        doseUnit: {
          value: '정',
          confidence: 0.96,
          originalText: '정',
          normalizedText: '정',
          bbox: { x: 0.3, y: 0.48, w: 0.1, h: 0.08 },
        },
        frequencyPerDay: {
          value: null,
          confidence: 0,
          originalText: '',
          normalizedText: '',
          bbox: null,
        },
        durationDays: {
          value: null,
          confidence: 0,
          originalText: '',
          normalizedText: '',
          bbox: null,
        },
        timingCode: {
          value: 'AS_NEEDED',
          confidence: 0.9,
          originalText: '증상이 있을 때',
          normalizedText: '필요할 때',
          bbox: { x: 0.1, y: 0.58, w: 0.55, h: 0.08 },
        },
        asNeeded: {
          value: true,
          confidence: 0.95,
          originalText: '증상이 있을 때',
          normalizedText: '필요시 복용',
          bbox: { x: 0.1, y: 0.58, w: 0.55, h: 0.08 },
        },
        symptomText: '통증',
        cautionIds: ['MIN_INTERVAL'],
      },
    ],
  },
  {
    sampleId: 'SAMPLE_BAG_3',
    label: '샘플 약봉투 3 · 흐림 (재촬영)',
    caseTag: '촬영품질',
    description: '품질검사에서 RETAKE로 차단 (T02 시험)',
    imageRef: '/samples/bag-blur.svg',
    asNeededBag: false,
    imageQuality: BLUR_QUALITY,
    rawText: '서울 열린약국 / 1회 ?포 / 1일 ?회 / ?일분 / 식후 ?분',
    groups: [
      {
        medicineName: {
          value: null,
          confidence: 0.31,
          originalText: '시O용 A정',
          normalizedText: '',
          bbox: { x: 0.08, y: 0.3, w: 0.8, h: 0.12 },
        },
        doseAmount: {
          value: null,
          confidence: 0.42,
          originalText: '1회 ?포',
          normalizedText: '',
          bbox: { x: 0.08, y: 0.47, w: 0.34, h: 0.07 },
        },
        doseUnit: {
          value: '포',
          confidence: 0.58,
          originalText: '포',
          normalizedText: '포',
          bbox: { x: 0.28, y: 0.47, w: 0.1, h: 0.07 },
        },
        frequencyPerDay: {
          value: null,
          confidence: 0.39,
          originalText: '1일 ?회',
          normalizedText: '',
          bbox: { x: 0.45, y: 0.47, w: 0.3, h: 0.07 },
        },
        durationDays: {
          value: null,
          confidence: 0.4,
          originalText: '?일분',
          normalizedText: '',
          bbox: { x: 0.08, y: 0.57, w: 0.3, h: 0.07 },
        },
        timingCode: {
          value: null,
          confidence: 0.44,
          originalText: '식후 ?분',
          normalizedText: '',
          bbox: { x: 0.45, y: 0.57, w: 0.4, h: 0.07 },
        },
        asNeeded: {
          value: false,
          confidence: 0.9,
          originalText: '',
          normalizedText: '상시 복용',
          bbox: null,
        },
        symptomText: null,
        cautionIds: [],
      },
    ],
  },
  {
    sampleId: 'SAMPLE_BAG_4',
    label: '샘플 약봉투 4 · 빛 반사 + 낮은 신뢰도',
    caseTag: '불면',
    description: '복용횟수 신뢰도 0.61로 수정 요구 (T03·T05 시험)',
    imageRef: '/samples/bag-glare.svg',
    asNeededBag: false,
    imageQuality: GLARE_QUALITY,
    rawText:
      '서울 열린약국 / 시연용 E정\n1회 1정 / 1일 2회(?) / 5일분 / 취침 전\n주의  운전 주의',
    groups: [
      {
        medicineName: {
          value: '시연용 E정',
          confidence: 0.88,
          originalText: '시연용 E정',
          normalizedText: '시연용 E정',
          bbox: { x: 0.08, y: 0.3, w: 0.5, h: 0.1 },
        },
        doseAmount: {
          value: 1,
          confidence: 0.92,
          originalText: '1회 1정',
          normalizedText: '1회 1정',
          bbox: { x: 0.08, y: 0.47, w: 0.34, h: 0.07 },
        },
        doseUnit: {
          value: '정',
          confidence: 0.92,
          originalText: '정',
          normalizedText: '정',
          bbox: { x: 0.28, y: 0.47, w: 0.1, h: 0.07 },
        },
        // T05 시험: 복용횟수 낮은 신뢰도 → 빨강 표시 후 수정 요구
        frequencyPerDay: {
          value: 2,
          confidence: 0.61,
          originalText: '1일 2회',
          normalizedText: '1일 2회',
          bbox: { x: 0.45, y: 0.47, w: 0.3, h: 0.07 },
        },
        durationDays: {
          value: 5,
          confidence: 0.93,
          originalText: '5일분',
          normalizedText: '5일',
          bbox: { x: 0.08, y: 0.57, w: 0.3, h: 0.07 },
        },
        timingCode: {
          value: 'BEDTIME',
          confidence: 0.89,
          originalText: '취침 전',
          normalizedText: '취침 전',
          bbox: { x: 0.45, y: 0.57, w: 0.4, h: 0.07 },
        },
        asNeeded: {
          value: false,
          confidence: 0.98,
          originalText: '',
          normalizedText: '상시 복용',
          bbox: null,
        },
        symptomText: null,
        cautionIds: ['DROWSINESS', 'DRIVING'],
      },
    ],
  },
];

export function findSampleBag(sampleId: string): SampleBag | undefined {
  return SAMPLE_BAGS.find((bag) => bag.sampleId === sampleId);
}
