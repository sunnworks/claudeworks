import { describe, expect, it } from 'vitest';
import {
  detectCautionIds,
  hasTimingCheckboxes,
  koreanToNumber,
  parseCompactDosage,
  parseTableRows,
  parseTimingCandidates,
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

describe('실제 약봉투 양식 대응 (설계서 10 4)', () => {
  it('조제약 복약안내표의 압축 표기를 해석한다', () => {
    const result = parseCompactDosage('1정씩3회3일분');
    expect(result).toEqual({
      amount: 1,
      unit: '정',
      frequencyPerDay: 3,
      durationDays: 3,
      matched: '1정씩3회3일분',
    });
  });

  it('공백이 있는 압축 표기와 소수 표기를 해석한다', () => {
    expect(parseCompactDosage('0.5정씩 3회 3일분')?.amount).toBe(0.5);
    expect(parseCompactDosage('2포씩2회5일분')).toMatchObject({
      amount: 2,
      unit: '포',
      frequencyPerDay: 2,
      durationDays: 5,
    });
  });

  it('압축 표기가 아니면 null', () => {
    expect(parseCompactDosage('밀폐용기, 실온보관')).toBeNull();
    expect(parseCompactDosage('1정씩')).toBeNull();
  });

  it('약품명과 압축 표기가 한 행에 있는 표를 해석한다', () => {
    const rows = parseTableRows(
      [
        '약품사진  약품명  복약안내(투약량/횟수/일수)  주의사항',
        '알비스정  1정씩3회3일분  밀폐용기, 실온보관',
        '모리트린정  1정씩3회3일분',
      ].join('\n'),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      medicineName: '알비스정',
      doseAmount: 1,
      doseUnit: '정',
      frequencyPerDay: 3,
      durationDays: 3,
    });
    expect(rows[0]?.cautionIds).toContain('STORAGE_ROOM_TEMP');
    expect(rows[1]?.medicineName).toBe('모리트린정');
  });

  it('숫자 열이 분리된 표에서는 단위를 만들어내지 않는다', () => {
    const rows = parseTableRows(
      ['의약품명  1회 투여량  1일 투여횟수  총 투약일수', '시연용 A정  1.00  3  3', '시연용 C정  0.50  3  3'].join(
        '\n',
      ),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ medicineName: '시연용 A정', doseAmount: 1, doseUnit: '', frequencyPerDay: 3 });
    expect(rows[1]?.doseAmount).toBe(0.5);
  });

  it('표 머리글은 행으로 읽지 않는다', () => {
    expect(parseTableRows('의약품명  1회 투여량  1일 투여횟수  총 투약일수')).toHaveLength(0);
  });

  it('복용시점 체크 보기를 후보로만 추출한다', () => {
    const bag = [
      '조 제 약   1일   회   일분',
      '매   시간마다   포(정)씩 복용',
      '○ 식후30분   ○ 공복시   ○ 식전30분',
      '○ 식전즉시   ○ 식후즉시   ○ 취침전',
    ].join('\n');
    const candidates = parseTimingCandidates(bag);
    expect(candidates).toEqual([
      'AFTER_MEAL_30',
      'BEFORE_MEAL_30',
      'AFTER_MEAL',
      'BEFORE_MEAL',
      'EMPTY_STOMACH',
      'BEDTIME',
    ]);
    expect(hasTimingCheckboxes(bag)).toBe(true);
  });

  it('체크 양식에서는 복용시점을 단정하지 않는다', () => {
    const bag = ['알비스정  1정씩3회3일분', '○ 식후30분   ○ 공복시   ○ 취침전'].join('\n');
    const parsed = parseBagText(bag);
    // 보기가 여러 개 인쇄된 양식이므로 값을 만들지 않고 약사 선택을 요구한다.
    expect(parsed.timing).toBeNull();
    expect(parsed.timingCandidates).toContain('AFTER_MEAL_30');
    expect(parsed.tableRows).toHaveLength(1);
  });

  it('보기가 하나뿐인 인쇄 문구는 그대로 읽는다', () => {
    const parsed = parseBagText('1회 1포 / 1일 3회 / 3일분 / 식후 30분');
    expect(parsed.timing?.value).toBe('AFTER_MEAL_30');
  });
});
