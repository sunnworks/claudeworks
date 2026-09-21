/**
 * 약봉투 OCR 원문 → 표준 복약필드 정규화.
 * 설계서 10 2 OCR 인식 대상 / 10 4 약봉투 양식 차이 대응 기준.
 *
 * 규칙: 약봉투에 없는 값은 절대 생성하지 않는다. 인식하지 못하면 null을 반환하고
 * 약사 직접입력을 요구한다 (설계서 12 1 생성 원칙 1·2).
 */

import type { CautionId, TimingCode } from './types';

/** 한글 고유어 수사 */
const NATIVE_NUMERALS: Record<string, number> = {
  한: 1,
  하나: 1,
  두: 2,
  둘: 2,
  세: 3,
  셋: 3,
  네: 4,
  넷: 4,
  다섯: 5,
  여섯: 6,
  일곱: 7,
  여덟: 8,
  아홉: 9,
  열: 10,
};

/** 한자어 수사 */
const SINO_DIGITS: Record<string, number> = {
  일: 1,
  이: 2,
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
  구: 9,
};

/**
 * 한글 수사를 숫자로 변환한다. 1~99 범위만 지원하며 그 밖은 null.
 * 예: 삼십 → 30, 삼십분의 삼십 → 30, 한 → 1, 열 → 10
 */
export function koreanToNumber(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;

  const native = NATIVE_NUMERALS[text];
  if (native !== undefined) return native;

  // 한자어 십 단위 조합: 십, N십, 십M, N십M
  const sino = /^([일이삼사오육칠팔구])?십([일이삼사오육칠팔구])?$/.exec(text);
  if (sino) {
    const tens = sino[1] ? (SINO_DIGITS[sino[1]] ?? 0) : 1;
    const ones = sino[2] ? (SINO_DIGITS[sino[2]] ?? 0) : 0;
    return tens * 10 + ones;
  }

  const digit = SINO_DIGITS[text];
  if (digit !== undefined) return digit;

  return null;
}

/**
 * 아라비아 숫자 또는 한글 수사를 숫자로 변환.
 * 실제 약봉투의 표 기반 표기(1.00, 0.50)를 위해 소수를 지원한다.
 */
export function toNumber(raw: string): number | null {
  const text = raw.trim();
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
  }
  return koreanToNumber(text);
}

const UNIT_ALIASES: Record<string, string> = {
  정: '정',
  알: '정',
  캡슐: '캡슐',
  캅셀: '캡슐',
  포: '포',
  팩: '포',
  ml: 'mL',
  mL: 'mL',
  밀리리터: 'mL',
  스푼: '스푼',
  방울: '방울',
  매: '매',
  장: '매',
  개: '개',
  병: '병',
  회분: '포',
};

const UNIT_PATTERN = Object.keys(UNIT_ALIASES)
  .sort((a, b) => b.length - a.length)
  .join('|');

const NUMBER_TOKEN =
  '\\d+|[일이삼사오육칠팔구]?십[일이삼사오육칠팔구]?|하나|둘|셋|넷|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|[일이삼사오육칠팔구]';

export interface ParsedValue<T> {
  value: T;
  originalText: string;
  normalizedText: string;
}

/**
 * 1회 복용량 추출. 예: "1회 1포", "한번에 한알", "1포씩"
 * 단위 변환(알 → 정)은 정규화값으로만 제시하고 약사가 확인한다.
 */
export function parseDoseAmount(
  text: string,
): ParsedValue<{ amount: number; unit: string }> | null {
  const patterns = [
    new RegExp(`(?:1회|한\\s*번에|1번에|회당)\\s*(${NUMBER_TOKEN})\\s*(${UNIT_PATTERN})`, 'i'),
    new RegExp(`(${NUMBER_TOKEN})\\s*(${UNIT_PATTERN})\\s*씩`, 'i'),
    new RegExp(`(${NUMBER_TOKEN})\\s*(${UNIT_PATTERN})(?=\\s|$|/|,)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const amount = toNumber(match[1] ?? '');
    const unitRaw = match[2] ?? '';
    const unit = UNIT_ALIASES[unitRaw] ?? UNIT_ALIASES[unitRaw.toLowerCase()];
    if (amount === null || amount <= 0 || unit === undefined) continue;
    return {
      value: { amount, unit },
      originalText: match[0].trim(),
      normalizedText: `1회 ${amount}${unit}`,
    };
  }
  return null;
}

/**
 * 1일 복용횟수 추출. 예: "1일 3회", "하루 세 번", "아침 점심 저녁"
 * 아침·점심·저녁 표기는 끼니 수를 세어 환산한다 (설계서 10 2 빈도).
 */
export function parseFrequencyPerDay(text: string): ParsedValue<number> | null {
  const explicit = new RegExp(`(?:1일|하루|일일)\\s*(${NUMBER_TOKEN})\\s*(?:회|번)`, 'i').exec(text);
  if (explicit) {
    const value = toNumber(explicit[1] ?? '');
    if (value !== null && value > 0) {
      return { value, originalText: explicit[0].trim(), normalizedText: `1일 ${value}회` };
    }
  }

  const mealTokens = ['아침', '점심', '저녁'];
  const found = mealTokens.filter((token) => text.includes(token));
  if (found.length > 0) {
    return {
      value: found.length,
      originalText: found.join(' '),
      normalizedText: `1일 ${found.length}회`,
    };
  }

  const trailing = new RegExp(`(${NUMBER_TOKEN})\\s*(?:회|번)\\s*\\/\\s*(?:일|day)`, 'i').exec(text);
  if (trailing) {
    const value = toNumber(trailing[1] ?? '');
    if (value !== null && value > 0) {
      return { value, originalText: trailing[0].trim(), normalizedText: `1일 ${value}회` };
    }
  }
  return null;
}

/**
 * 복용기간 추출. 예: "3일분", "삼일분", "3일간"
 * 조제일(2026 09 21, 2026년 9월 21일)은 기간으로 읽지 않는다 (설계서 10 2 기간 비고).
 */
export function parseDurationDays(text: string): ParsedValue<number> | null {
  const withSuffix = new RegExp(`(${NUMBER_TOKEN})\\s*일\\s*(?:분|간|치|동안)`, 'i').exec(text);
  if (withSuffix) {
    const value = toNumber(withSuffix[1] ?? '');
    if (value !== null && value > 0) {
      return { value, originalText: withSuffix[0].trim(), normalizedText: `${value}일` };
    }
  }

  // "3일" 단독 표기. 조제일 같은 날짜 표기와 "1일 3회" 같은 빈도 표기는 제외한다.
  const bare = new RegExp(`(${NUMBER_TOKEN})\\s*일(?![\\d분간치동])(?!\\s*\\d*\\s*(?:회|번))`, 'gi');
  for (const match of text.matchAll(bare)) {
    const before = text.slice(0, match.index);
    // 2026년 9월 21일 / 9월 21일 형태의 날짜는 복용기간이 아니다.
    if (/(?:\d{4}\s*년?|월)\s*\d*\s*$/.test(before)) continue;
    const value = toNumber(match[1] ?? '');
    if (value !== null && value > 0 && value <= 365) {
      return { value, originalText: match[0].trim(), normalizedText: `${value}일` };
    }
  }
  return null;
}

/** 복용시점 추출. 없는 값은 추정하지 않는다 (설계서 10 2 식사 기준 비고). */
export function parseTimingCode(text: string): ParsedValue<TimingCode> | null {
  const minuteToken = new RegExp(`(?:식후|식전)\\s*(${NUMBER_TOKEN})\\s*분`, 'i').exec(text);
  if (minuteToken) {
    const minutes = toNumber(minuteToken[1] ?? '');
    const isAfter = minuteToken[0].includes('식후');
    if (minutes === 30) {
      return {
        value: isAfter ? 'AFTER_MEAL_30' : 'BEFORE_MEAL_30',
        originalText: minuteToken[0].trim(),
        normalizedText: isAfter ? '식후 30분' : '식전 30분',
      };
    }
    if (minutes !== null) {
      return {
        value: isAfter ? 'AFTER_MEAL' : 'BEFORE_MEAL',
        originalText: minuteToken[0].trim(),
        normalizedText: isAfter ? `식후 ${minutes}분` : `식전 ${minutes}분`,
      };
    }
  }

  const table: { pattern: RegExp; code: TimingCode; label: string }[] = [
    { pattern: /취침\s*전|자기\s*전|잠자기\s*전/, code: 'BEDTIME', label: '취침 전' },
    { pattern: /공복|빈\s*속/, code: 'EMPTY_STOMACH', label: '공복' },
    { pattern: /식사\s*(?:와|중|하면서)|식사와\s*함께/, code: 'WITH_MEAL', label: '식사와 함께' },
    { pattern: /식후/, code: 'AFTER_MEAL', label: '식후' },
    { pattern: /식전/, code: 'BEFORE_MEAL', label: '식전' },
  ];

  for (const row of table) {
    const match = row.pattern.exec(text);
    if (match) {
      return { value: row.code, originalText: match[0].trim(), normalizedText: row.label };
    }
  }
  return null;
}

/** 필요시 복용 여부와 증상 표현. 상시약과 분리한다 (설계서 10 2 필요시). */
export function parseAsNeeded(text: string): ParsedValue<{ asNeeded: boolean; symptom: string | null }> | null {
  const symptomMatch = /([가-힣]{2,6})\s*(?:이|가)?\s*(?:있을\s*때|심할\s*때|날\s*때|시)(?:만)?/.exec(text);
  const generic = /필요\s*시|필요할\s*때|증상\s*(?:이)?\s*있을\s*때/.exec(text);

  if (generic) {
    const symptom = symptomMatch && !/필요|증상/.test(symptomMatch[1] ?? '') ? (symptomMatch[1] ?? null) : null;
    return {
      value: { asNeeded: true, symptom },
      originalText: generic[0].trim(),
      normalizedText: '필요시 복용',
    };
  }
  if (symptomMatch) {
    return {
      value: { asNeeded: true, symptom: symptomMatch[1] ?? null },
      originalText: symptomMatch[0].trim(),
      normalizedText: '필요시 복용',
    };
  }
  return null;
}

/** 약품명 추출 — 라벨이 명시된 경우만 사용하고 추정하지 않는다. */
export function parseMedicineNames(text: string): string[] {
  const names = new Set<string>();
  const labelled = /(?:약품명|제품명|약명)\s*[:：]?\s*(.+)/g;
  let match = labelled.exec(text);
  while (match !== null) {
    for (const part of (match[1] ?? '').split(/[,/·]|\s{2,}/)) {
      const name = part.trim();
      if (name !== '') names.add(name);
    }
    match = labelled.exec(text);
  }
  // 시연용 가상 의약품 표기 (부록 A 3)
  const demoNames = text.match(/시연용\s*[A-Z][가-힣A-Za-z]*/g) ?? [];
  for (const name of demoNames) names.add(name.replace(/\s+/g, ' ').trim());
  return [...names];
}

const CAUTION_PATTERNS: { pattern: RegExp; id: CautionId }[] = [
  { pattern: /졸음|졸릴|졸리/, id: 'DROWSINESS' },
  { pattern: /운전|기계\s*조작/, id: 'DRIVING' },
  { pattern: /음주|술/, id: 'ALCOHOL' },
  { pattern: /냉장|서늘한\s*곳/, id: 'STORAGE_REFRIGERATED' },
  { pattern: /실온|직사광선/, id: 'STORAGE_ROOM_TEMP' },
  { pattern: /이상반응|발진|두드러기|부작용/, id: 'ADVERSE_REACTION' },
  { pattern: /다른\s*약과\s*(?:분리|간격)/, id: 'SEPARATE_FROM_OTHER_DRUGS' },
  { pattern: /끝까지|남기지\s*말고/, id: 'FINISH_ALL' },
  { pattern: /최소\s*\d+\s*시간|간격을\s*두고/, id: 'MIN_INTERVAL' },
  { pattern: /바르는|외용|도포/, id: 'EXTERNAL_USE' },
];

/** 주의문구를 검수 문구ID로 연결한다. 매칭되지 않는 문장은 만들지 않는다. */
export function detectCautionIds(text: string): CautionId[] {
  const ids = new Set<CautionId>();
  for (const row of CAUTION_PATTERNS) {
    if (row.pattern.test(text)) ids.add(row.id);
  }
  return [...ids];
}

/** 표 기반 약봉투의 한 행 */
export interface ParsedTableRow {
  medicineName: string | null;
  doseAmount: number;
  doseUnit: string;
  frequencyPerDay: number;
  durationDays: number;
  cautionIds: CautionId[];
  originalText: string;
}

const COMPACT_UNIT = '정|포|캡슐|캅셀|알|매|mL|ml|스푼';

/**
 * 조제약 복약안내표의 압축 표기를 해석한다.
 * 예: "1정씩3회3일분", "0.5정씩 3회 3일분", "2포씩2회5일분"
 * (설계서 10 4 표 기반 / 문장 기반 대응)
 */
export function parseCompactDosage(
  text: string,
): { amount: number; unit: string; frequencyPerDay: number; durationDays: number; matched: string } | null {
  const pattern = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(${COMPACT_UNIT})\\s*씩?\\s*(\\d+)\\s*(?:회|번)\\s*(\\d+)\\s*일\\s*분?`,
    'i',
  );
  const match = pattern.exec(text);
  if (match === null) return null;

  const amount = toNumber(match[1] ?? '');
  const unitRaw = match[2] ?? '';
  const unit = UNIT_ALIASES[unitRaw] ?? UNIT_ALIASES[unitRaw.toLowerCase()];
  const frequencyPerDay = toNumber(match[3] ?? '');
  const durationDays = toNumber(match[4] ?? '');

  if (amount === null || frequencyPerDay === null || durationDays === null || unit === undefined) return null;
  if (amount <= 0 || frequencyPerDay <= 0 || durationDays <= 0) return null;

  return { amount, unit, frequencyPerDay, durationDays, matched: match[0].trim() };
}

/**
 * 표 기반 약봉투를 행 단위로 해석한다.
 * 지원 형태
 *   1) 약품명 + 압축 표기      : "알비스정  1정씩3회3일분  밀폐용기, 실온보관"
 *   2) 약품명 + 숫자 열 3개    : "시연용 A정  1.00  3  3"
 * 단위가 없는 숫자 열 형태는 단위를 만들어내지 않고 null로 남겨 약사 확인을 요구한다.
 */
export function parseTableRows(rawText: string): ParsedTableRow[] {
  const rows: ParsedTableRow[] = [];

  for (const line of rawText.split(/\n/)) {
    const text = line.trim();
    if (text === '') continue;
    // 표 머리글은 건너뛴다.
    if (/의약품명|약품명|복약안내|투여량|투약일수|주의사항|약품사진/.test(text)) continue;

    const compact = parseCompactDosage(text);
    if (compact !== null) {
      const name = text.slice(0, text.indexOf(compact.matched)).trim().replace(/\s{2,}/g, ' ');
      rows.push({
        medicineName: name === '' ? null : name,
        doseAmount: compact.amount,
        doseUnit: compact.unit,
        frequencyPerDay: compact.frequencyPerDay,
        durationDays: compact.durationDays,
        cautionIds: detectCautionIds(text),
        originalText: text,
      });
      continue;
    }

    // 숫자 열 3개 형태: 이름 + 1회량 + 1일횟수 + 일수
    const columns = /^(.*?)[\s|]+(\d+(?:\.\d+)?)[\s|]+(\d+)[\s|]+(\d+)\s*(?:일|일분)?$/.exec(text);
    if (columns !== null) {
      const amount = toNumber(columns[2] ?? '');
      const frequencyPerDay = toNumber(columns[3] ?? '');
      const durationDays = toNumber(columns[4] ?? '');
      const name = (columns[1] ?? '').trim();
      if (amount !== null && frequencyPerDay !== null && durationDays !== null && amount > 0) {
        // 단위는 열에 없으므로 추정하지 않고 빈 값으로 두어 약사 확인을 요구한다.
        rows.push({
          medicineName: name === '' ? null : name,
          doseAmount: amount,
          doseUnit: '',
          frequencyPerDay,
          durationDays,
          cautionIds: detectCautionIds(text),
          originalText: text,
        });
      }
    }
  }

  return rows;
}

/** 실제 약봉투 하단의 복용시점 체크 항목 */
const TIMING_CHECKBOX_OPTIONS: { pattern: RegExp; code: TimingCode }[] = [
  { pattern: /식후\s*30\s*분/, code: 'AFTER_MEAL_30' },
  { pattern: /식전\s*30\s*분/, code: 'BEFORE_MEAL_30' },
  { pattern: /식후\s*즉시/, code: 'AFTER_MEAL' },
  { pattern: /식전\s*즉시/, code: 'BEFORE_MEAL' },
  { pattern: /공복\s*시/, code: 'EMPTY_STOMACH' },
  { pattern: /취침\s*전/, code: 'BEDTIME' },
];

/**
 * 복용시점 체크 항목의 후보를 추출한다.
 *
 * 실제 약봉투는 복용시점을 인쇄된 보기 중 하나에 체크·도장으로 표시하는 경우가 많고
 * 어떤 항목이 선택됐는지는 OCR로 판별하기 어렵다. 따라서 값을 추정하지 않고
 * 후보만 돌려주어 약사가 선택하게 한다 (설계서 10 4 아이콘 기반 / 12 1 원칙 2).
 */
export function parseTimingCandidates(rawText: string): TimingCode[] {
  const found: TimingCode[] = [];
  for (const option of TIMING_CHECKBOX_OPTIONS) {
    if (option.pattern.test(rawText) && !found.includes(option.code)) found.push(option.code);
  }
  return found;
}

/** 인쇄된 보기 목록인지 판단한다. 보기가 2개 이상이면 체크 양식으로 본다. */
export function hasTimingCheckboxes(rawText: string): boolean {
  return parseTimingCandidates(rawText).length >= 2;
}

export interface ParsedBagText {
  doseAmount: ParsedValue<{ amount: number; unit: string }> | null;
  frequencyPerDay: ParsedValue<number> | null;
  durationDays: ParsedValue<number> | null
  timing: ParsedValue<TimingCode> | null;
  asNeeded: ParsedValue<{ asNeeded: boolean; symptom: string | null }> | null;
  medicineNames: string[];
  cautionIds: CautionId[];
  /** 표 기반 약봉투의 행 (설계서 10 4) */
  tableRows: ParsedTableRow[];
  /** 복용시점 체크 양식의 후보 — 값이 있으면 약사가 선택한다 */
  timingCandidates: TimingCode[];
}

/** 라이브 OCR의 rawText를 구조화한다. 실패한 필드는 null로 남겨 약사 입력을 요구한다. */
export function parseBagText(rawText: string): ParsedBagText {
  const text = rawText.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const tableRows = parseTableRows(text);
  const timingCandidates = parseTimingCandidates(text);
  const checkboxForm = hasTimingCheckboxes(text);

  return {
    doseAmount: parseDoseAmount(text),
    frequencyPerDay: parseFrequencyPerDay(text),
    durationDays: parseDurationDays(text),
    // 보기 목록만 인쇄된 체크 양식에서는 복용시점을 단정하지 않는다.
    timing: checkboxForm ? null : parseTimingCode(text),
    asNeeded: parseAsNeeded(text),
    medicineNames: parseMedicineNames(text),
    cautionIds: detectCautionIds(text),
    tableRows,
    timingCandidates,
  };
}
