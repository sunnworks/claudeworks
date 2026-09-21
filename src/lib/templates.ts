/**
 * 표준 문장 모듈과 검수 문구DB — 설계서 12 2 / 12 3 기준.
 *
 * 모든 환자 자막은 이 모듈의 템플릿에서만 생성한다.
 * 자유 생성형 문장(LLM 등)은 사용하지 않는다 (부록 C 5 안전 규칙).
 */

import type { CardType, CautionId, TimingCode } from './types';
import { TIMING_LABELS } from './types';

export interface SentenceTemplate {
  templateId: string;
  type: CardType;
  /** 필수 슬롯 — 하나라도 없으면 문장을 만들지 않는다 */
  requiredSlots: string[];
  /** 자막 문장 생성기 */
  render: (slots: Record<string, string | number | boolean | null>) => string;
  /** 수어 글로스 시퀀스 (검수된 표현) */
  gloss: (slots: Record<string, string | number | boolean | null>) => string[];
}

/**
 * 1회 복용량 표기.
 * 실제 약봉투의 0.50 표기는 반 알로 안내해 농인 환자가 오해하지 않게 한다.
 */
export function formatAmount(amount: number, unit: string): string {
  if (amount === 0.5) return unit === '정' || unit === '알' ? '반 알' : `반 ${unit}`;
  return `${amount}${unit}`;
}

function amountText(slots: Record<string, string | number | boolean | null>): string {
  if (typeof slots.amountText === 'string' && slots.amountText !== '') return slots.amountText;
  return `${slots.amount}${slots.unit}`;
}

const timingGloss: Record<TimingCode, string[]> = {
  AFTER_MEAL_30: ['밥', '먹다', '끝', '30분', '지나다'],
  AFTER_MEAL: ['밥', '먹다', '후'],
  WITH_MEAL: ['밥', '함께'],
  BEFORE_MEAL_30: ['밥', '먹다', '전', '30분'],
  BEFORE_MEAL: ['밥', '먹다', '전'],
  BEDTIME: ['잠', '자다', '전'],
  EMPTY_STOMACH: ['배', '비다', '때'],
  AS_NEEDED: ['필요', '있다', '때'],
};

export const SENTENCE_TEMPLATES: Record<string, SentenceTemplate> = {
  INTRO_V1: {
    templateId: 'INTRO_V1',
    type: 'INTRO',
    requiredSlots: [],
    render: () => '지금부터 약을 먹는 방법을 안내하겠습니다.',
    gloss: () => ['지금', '약', '먹다', '방법', '설명'],
  },
  DOSING_STANDARD_V1: {
    templateId: 'DOSING_STANDARD_V1',
    type: 'DOSING',
    requiredSlots: ['times', 'amount', 'unit', 'days'],
    render: (s) => `하루 ${s.times}번, 한 번에 ${amountText(s)}씩, ${s.days}일 동안 드세요.`,
    gloss: (s) => ['하루', `${s.times}번`, '한번', amountText(s), `${s.days}일`, '먹다'],
  },
  /** 약품별 복용법이 다른 표 기반 약봉투에서 사용한다 (설계서 10 4 표 기반) */
  DOSING_NAMED_V1: {
    templateId: 'DOSING_NAMED_V1',
    type: 'DOSING',
    requiredSlots: ['names', 'times', 'amount', 'unit', 'days'],
    render: (s) => `${s.names}은 하루 ${s.times}번, 한 번에 ${amountText(s)}씩, ${s.days}일 동안 드세요.`,
    gloss: (s) => [`${s.names}`, '하루', `${s.times}번`, '한번', amountText(s), `${s.days}일`, '먹다'],
  },
  DOSE_AMOUNT_V1: {
    templateId: 'DOSE_AMOUNT_V1',
    type: 'DOSING',
    requiredSlots: ['amount', 'unit'],
    render: (s) => `한 번에 ${amountText(s)}만큼 드세요.`,
    gloss: (s) => ['한번', amountText(s), '먹다'],
  },
  FREQUENCY_V1: {
    templateId: 'FREQUENCY_V1',
    type: 'FREQUENCY',
    requiredSlots: ['times'],
    render: (s) => `하루에 ${s.times}번 드세요.`,
    gloss: (s) => ['하루', `${s.times}번`, '먹다'],
  },
  DURATION_V1: {
    templateId: 'DURATION_V1',
    type: 'DURATION',
    requiredSlots: ['days'],
    render: (s) => `이 약은 ${s.days}일 동안 드세요.`,
    gloss: (s) => ['이', '약', `${s.days}일`, '동안', '먹다'],
  },
  TIMING_V1: {
    templateId: 'TIMING_V1',
    type: 'TIMING',
    requiredSlots: ['timing'],
    render: (s) => `${s.timing}에 드세요.`,
    gloss: (s) => timingGloss[(s.timingCode as TimingCode) ?? 'AFTER_MEAL'] ?? ['밥', '먹다', '후'],
  },
  TIMING_MEALS_V1: {
    templateId: 'TIMING_MEALS_V1',
    type: 'TIMING',
    requiredSlots: ['timing', 'meals'],
    render: (s) => `${s.meals} 식사 후 ${s.minutes}분에 드세요.`,
    gloss: (s) => ['아침', '점심', '저녁', '밥', '먹다', `${s.minutes}분`, '지나다', '먹다'],
  },
  AS_NEEDED_V1: {
    templateId: 'AS_NEEDED_V1',
    type: 'AS_NEEDED',
    requiredSlots: ['symptom', 'amount', 'unit'],
    render: (s) => `따로 포장된 약은 ${s.symptom}이 있을 때만 한 번에 ${amountText(s)} 드세요.`,
    gloss: (s) => ['따로', '약', `${s.symptom}`, '있다', '때', amountText(s), '먹다'],
  },
  CLOSING_V1: {
    templateId: 'CLOSING_V1',
    type: 'CLOSING',
    requiredSlots: [],
    render: () => '궁금한 점이 있으면 약사에게 질문해 주세요.',
    gloss: () => ['궁금하다', '있다', '약사', '질문', '하다'],
  },
  PHARMACIST_NOTE_V1: {
    templateId: 'PHARMACIST_NOTE_V1',
    type: 'PHARMACIST_NOTE',
    requiredSlots: ['text'],
    render: (s) => String(s.text ?? ''),
    gloss: () => ['약사', '설명', '추가'],
  },
};

/** 검수 문구DB — 문구ID로만 사용하며 임의 생성하지 않는다 (설계서 12 1 원칙 5) */
export interface ReviewedCaution {
  cautionId: CautionId;
  type: CardType;
  label: string;
  displayText: string;
  gloss: string[];
  /** 약봉투 또는 검수된 약품정보에 명시된 경우에만 추천한다 */
  recommendOnlyWhenPrinted: boolean;
}

export const REVIEWED_CAUTIONS: Record<CautionId, ReviewedCaution> = {
  DROWSINESS: {
    cautionId: 'DROWSINESS',
    type: 'CAUTION',
    label: '졸림 주의',
    displayText: '이 약은 졸릴 수 있습니다.',
    gloss: ['이', '약', '졸리다', '가능'],
    recommendOnlyWhenPrinted: true,
  },
  DRIVING: {
    cautionId: 'DRIVING',
    type: 'CAUTION',
    label: '운전·기계조작 주의',
    displayText: '운전이나 위험한 기계 조작을 주의하세요.',
    gloss: ['운전', '기계', '위험', '조심'],
    recommendOnlyWhenPrinted: true,
  },
  ALCOHOL: {
    cautionId: 'ALCOHOL',
    type: 'CAUTION',
    label: '음주 주의',
    displayText: '약을 먹는 동안 술은 마시지 마세요.',
    gloss: ['약', '먹다', '동안', '술', '안되다'],
    recommendOnlyWhenPrinted: true,
  },
  STORAGE_ROOM_TEMP: {
    cautionId: 'STORAGE_ROOM_TEMP',
    type: 'STORAGE',
    label: '실온 보관',
    displayText: '직사광선을 피해 실온에 보관하세요.',
    gloss: ['햇빛', '피하다', '실온', '보관'],
    recommendOnlyWhenPrinted: false,
  },
  STORAGE_REFRIGERATED: {
    cautionId: 'STORAGE_REFRIGERATED',
    type: 'STORAGE',
    label: '냉장 보관',
    displayText: '이 약은 냉장고에 보관하세요.',
    gloss: ['이', '약', '냉장고', '보관'],
    recommendOnlyWhenPrinted: true,
  },
  ADVERSE_REACTION: {
    cautionId: 'ADVERSE_REACTION',
    type: 'ADVERSE_REACTION',
    label: '이상반응 대응',
    displayText: '발진이나 이상반응이 나타나면 복용을 중단하고 약사 또는 의료기관에 문의하세요.',
    gloss: ['발진', '이상', '나타나다', '먹다', '중단', '약사', '병원', '문의'],
    recommendOnlyWhenPrinted: false,
  },
  SEPARATE_FROM_OTHER_DRUGS: {
    cautionId: 'SEPARATE_FROM_OTHER_DRUGS',
    type: 'CAUTION',
    label: '다른 약과 분리',
    displayText: '다른 약과 시간 간격을 두고 드세요.',
    gloss: ['다른', '약', '시간', '간격', '두다'],
    recommendOnlyWhenPrinted: true,
  },
  FINISH_ALL: {
    cautionId: 'FINISH_ALL',
    type: 'CAUTION',
    label: '끝까지 복용',
    displayText: '증상이 좋아져도 약은 끝까지 드세요.',
    gloss: ['증상', '좋다', '되다', '약', '끝', '먹다'],
    recommendOnlyWhenPrinted: true,
  },
  MIN_INTERVAL: {
    cautionId: 'MIN_INTERVAL',
    type: 'CAUTION',
    label: '최소 복용간격',
    displayText: '다시 먹을 때는 최소 4시간 이상 간격을 두세요.',
    gloss: ['다시', '먹다', '최소', '4시간', '간격'],
    recommendOnlyWhenPrinted: true,
  },
  EXTERNAL_USE: {
    cautionId: 'EXTERNAL_USE',
    type: 'CAUTION',
    label: '외용 사용법',
    displayText: '이 약은 먹지 말고 바르는 약입니다.',
    gloss: ['이', '약', '먹다', '안되다', '바르다'],
    recommendOnlyWhenPrinted: true,
  },
};

/** 복용시점 코드를 환자 자막 표현으로 변환 */
export function timingLabel(code: TimingCode): string {
  return TIMING_LABELS[code];
}

/** 하루 복용횟수에 따른 끼니 표현 — 1일 3회일 때만 아침·점심·저녁으로 표기한다 */
export function mealsLabel(frequencyPerDay: number): string | null {
  if (frequencyPerDay === 3) return '아침, 점심, 저녁';
  if (frequencyPerDay === 2) return '아침, 저녁';
  if (frequencyPerDay === 1) return '하루 한 번';
  return null;
}
