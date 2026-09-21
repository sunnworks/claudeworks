import { describe, expect, it } from 'vitest';
import {
  detectCautionIds,
  koreanToNumber,
  parseAsNeeded,
  parseBagText,
  parseDoseAmount,
  parseDurationDays,
  parseFrequencyPerDay,
  parseMedicineNames,
  parseTimingCode,
} from './parser';

describe('koreanToNumber', () => {
  it('고유어 수사를 변환한다', () => {
    expect(koreanToNumber('한')).toBe(1);
    expect(koreanToNumber('세')).toBe(3);
    expect(koreanToNumber('열')).toBe(10);
  });

  it('한자어 십 단위를 변환한다', () => {
    expect(koreanToNumber('삼십')).toBe(30);
    expect(koreanToNumber('십')).toBe(10);
    expect(koreanToNumber('이십일')).toBe(21);
    expect(koreanToNumber('삼')).toBe(3);
  });

  it('인식할 수 없으면 null을 반환한다', () => {
    expect(koreanToNumber('백이십')).toBeNull();
    expect(koreanToNumber('')).toBeNull();
    expect(koreanToNumber('가나다')).toBeNull();
  });
});

describe('parseDoseAmount', () => {
  it('설계서 10 2 예시: 한번에 한알 → 1회 1정', () => {
    const result = parseDoseAmount('한번에 한알');
    expect(result?.value).toEqual({ amount: 1, unit: '정' });
    expect(result?.normalizedText).toBe('1회 1정');
    expect(result?.originalText).toBe('한번에 한알');
  });

  it('1회 1포 표기를 읽는다', () => {
    expect(parseDoseAmount('1회 1포 / 1일 3회')?.value).toEqual({ amount: 1, unit: '포' });
  });

  it('씩 표기를 읽는다', () => {
    expect(parseDoseAmount('식후 30분에 1포씩 복용')?.value).toEqual({ amount: 1, unit: '포' });
  });

  it('용량이 없으면 null', () => {
    expect(parseDoseAmount('식후 30분')).toBeNull();
  });
});

describe('parseFrequencyPerDay', () => {
  it('1일 3회를 읽는다', () => {
    expect(parseFrequencyPerDay('1일 3회')?.value).toBe(3);
  });

  it('하루 세 번을 읽는다', () => {
    expect(parseFrequencyPerDay('하루 세 번 복용')?.value).toBe(3);
  });

  it('설계서 10 2 예시: 아침 점심 저녁 → 1일 3회', () => {
    const result = parseFrequencyPerDay('아침 점심 저녁');
    expect(result?.value).toBe(3);
    expect(result?.normalizedText).toBe('1일 3회');
  });

  it('아침 저녁은 1일 2회', () => {
    expect(parseFrequencyPerDay('아침 저녁 식후')?.value).toBe(2);
  });

  it('횟수가 없으면 null', () => {
    expect(parseFrequencyPerDay('식후 30분')).toBeNull();
  });
});

describe('parseDurationDays', () => {
  it('설계서 10 2 예시: 삼일분 → 3일', () => {
    const result = parseDurationDays('삼일분');
    expect(result?.value).toBe(3);
    expect(result?.normalizedText).toBe('3일');
  });

  it('3일분을 읽는다', () => {
    expect(parseDurationDays('1일 3회 3일분')?.value).toBe(3);
  });

  it('단독 3일 표기를 읽는다', () => {
    expect(parseDurationDays('복용기간 3일')?.value).toBe(3);
  });

  it('조제일을 복용기간으로 읽지 않는다', () => {
    expect(parseDurationDays('조제일 2026년 9월 21일')).toBeNull();
    expect(parseDurationDays('2026-09-21')).toBeNull();
  });
});

describe('parseTimingCode', () => {
  it('설계서 10 2 예시: 식후 삼십분 → AFTER_MEAL_30', () => {
    const result = parseTimingCode('식후 삼십분');
    expect(result?.value).toBe('AFTER_MEAL_30');
    expect(result?.normalizedText).toBe('식후 30분');
  });

  it('식후 30분을 읽는다', () => {
    expect(parseTimingCode('식후 30분')?.value).toBe('AFTER_MEAL_30');
  });

  it('취침 전을 읽는다', () => {
    expect(parseTimingCode('취침 전 1정')?.value).toBe('BEDTIME');
  });

  it('식전 30분을 읽는다', () => {
    expect(parseTimingCode('식전 30분')?.value).toBe('BEFORE_MEAL_30');
  });

  it('복용시점이 없으면 추정하지 않는다', () => {
    expect(parseTimingCode('1일 3회 3일분')).toBeNull();
  });
});

describe('parseAsNeeded', () => {
  it('설계서 10 2 예시: 통증 시 → 필요시 복용', () => {
    const result = parseAsNeeded('통증 시 1정');
    expect(result?.value.asNeeded).toBe(true);
    expect(result?.value.symptom).toBe('통증');
    expect(result?.normalizedText).toBe('필요시 복용');
  });

  it('증상이 있을 때를 읽는다', () => {
    expect(parseAsNeeded('증상이 있을 때 1회 1정')?.value.asNeeded).toBe(true);
  });

  it('상시약은 null', () => {
    expect(parseAsNeeded('1일 3회 식후 30분')).toBeNull();
  });
});

describe('parseMedicineNames / detectCautionIds', () => {
  it('시연용 가상 약품명을 추출한다', () => {
    expect(parseMedicineNames('시연용 A정 시연용 B캡슐')).toEqual(['시연용 A정', '시연용 B캡슐']);
  });

  it('약품명 라벨을 읽는다', () => {
    expect(parseMedicineNames('약품명: 데모정')).toContain('데모정');
  });

  it('주의문구를 검수 문구ID로 연결한다', () => {
    expect(detectCautionIds('졸음이 올 수 있음')).toEqual(['DROWSINESS']);
    expect(detectCautionIds('운전 주의, 음주 금지')).toEqual(['DRIVING', 'ALCOHOL']);
  });

  it('매칭되지 않는 문장에는 문구ID를 만들지 않는다', () => {
    expect(detectCautionIds('본 데이터는 데모용입니다')).toEqual([]);
  });
});

describe('parseBagText', () => {
  it('설계서 14 4 rawText 예시를 구조화한다', () => {
    const parsed = parseBagText('1회 1포 / 1일 3회 / 3일 / 식후 30분');
    expect(parsed.doseAmount?.value).toEqual({ amount: 1, unit: '포' });
    expect(parsed.frequencyPerDay?.value).toBe(3);
    expect(parsed.durationDays?.value).toBe(3);
    expect(parsed.timing?.value).toBe('AFTER_MEAL_30');
    expect(parsed.asNeeded).toBeNull();
  });

  it('필요시약 봉투를 구조화한다', () => {
    const parsed = parseBagText('시연용 D정 / 증상이 있을 때 1회 1정');
    expect(parsed.asNeeded?.value.asNeeded).toBe(true);
    expect(parsed.doseAmount?.value).toEqual({ amount: 1, unit: '정' });
    expect(parsed.frequencyPerDay).toBeNull();
    expect(parsed.medicineNames).toContain('시연용 D정');
  });
});
