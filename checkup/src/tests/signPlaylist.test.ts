import { describe, expect, it } from 'vitest';
import { findQuestion } from '../domain/questionnaireEngine';
import { SHORT_ITEM_MAX_MS, buildQuestionPlaylist, isShortChoice } from '../domain/signPlaylist';

describe('문항별 수어 재생 순서', () => {
  it('질문 → 쉬운 설명 → 선택지 순서로 만든다', () => {
    const items = buildQuestionPlaylist(findQuestion('SUP-01')!);
    expect(items.map((item) => item.caption)).toEqual([
      '건강검진기관 방문 시 조력인과 동행하십니까?',
      '가족이나 활동지원사와 같이 병원에 가나요?',
      '예',
      '아니요',
    ]);
    expect(items[0].kind).toBe('문항');
    expect(items[2].kind).toBe('선택지');
  });

  it('검증형 척도는 쉬운 설명이 없으므로 질문 다음 바로 선택지다', () => {
    const items = buildQuestionPlaylist(findQuestion('PHQ9-01')!);
    expect(items[0].kind).toBe('문항');
    expect(items[1].caption).toBe('전혀 아니다');
  });

  it('같은 문구가 두 번 들어가지 않는다', () => {
    const items = buildQuestionPlaylist(findQuestion('CA-COM-03')!);
    const captions = items.map((item) => item.caption);
    expect(new Set(captions).size).toBe(captions.length);
  });

  it('표 문항은 줄 이름과 고르는 값을 모두 넣는다', () => {
    const captions = buildQuestionPlaylist(findQuestion('CA-COM-03')!).map((item) => item.caption);
    expect(captions).toContain('위암');
    expect(captions).toContain('부모');
    expect(captions).toContain('없음');
  });

  it('숫자 입력 문항은 질문과 쉬운 설명만 있다', () => {
    const items = buildQuestionPlaylist(findQuestion('GEN-SMK-03')!);
    expect(items).toHaveLength(2);
  });
});

describe('짧은 선택지만 시간 제한', () => {
  it('단어 수준의 선택지는 끊어도 된다', () => {
    for (const word of ['예', '아니요', '기타', '안내견', '가족·친인척', '활동지원사', '진단받음']) {
      expect(isShortChoice('선택지', word)).toBe(true);
    }
  });

  it('질문과 안내 문장은 길이와 상관없이 끊지 않는다', () => {
    expect(isShortChoice('문항', '건강검진기관 방문 시 조력인과 동행하십니까?')).toBe(false);
    expect(isShortChoice('문항', '예')).toBe(false);
    expect(isShortChoice('안내', '가족이나 활동지원사와 같이 병원에 가나요?')).toBe(false);
  });

  it('12자를 넘는 선택지 문구는 끊지 않는다', () => {
    expect(isShortChoice('선택지', '10년 이상 또는 받은 적 없음')).toBe(false);
    expect(isShortChoice('선택지', '내 자신이 나쁜 사람이라는 느낌')).toBe(false);
    // 12자 이하인 짧은 구절은 끊는다
    expect(isShortChoice('선택지', '과거에 피웠으나 끊음')).toBe(true);
  });

  it('제한 시간은 5초다', () => {
    expect(SHORT_ITEM_MAX_MS).toBe(5000);
  });
});
