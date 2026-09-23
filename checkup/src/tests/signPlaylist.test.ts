import { describe, expect, it } from 'vitest';
import { findQuestion } from '../domain/questionnaireEngine';
import { buildQuestionPlaylist } from '../domain/signPlaylist';

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
