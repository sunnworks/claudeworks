import { describe, expect, it } from 'vitest';
import { ALL_QUESTIONS } from '../data/questionnaire.v2026';
import { buildFilmingScript } from '../tools/signFilmingScript';

const rows = buildFilmingScript();

describe('수어 촬영 대본 추출', () => {
  it('같은 문장은 한 번만 나온다', () => {
    const texts = rows.map((row) => row.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('촬영 ID 는 겹치지 않는다', () => {
    const ids = rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('빈 문장이 없다', () => {
    expect(rows.filter((row) => row.text.trim() === '')).toEqual([]);
  });

  it('모든 문항의 공식문구가 들어 있다', () => {
    const texts = new Set(rows.filter((row) => row.category === '문항').map((row) => row.text));
    const missing = ALL_QUESTIONS.filter((question) => !texts.has(question.officialText));
    expect(missing).toEqual([]);
  });

  it('같은 문장을 쓰는 문항은 사용 위치에 모두 적힌다', () => {
    const yesNo = rows.find((row) => row.category === '선택지' && row.text === '예');
    expect(yesNo?.usedIn).toContain('SUP-01');
    expect((yesNo?.usedIn.length ?? 0)).toBeGreaterThan(5);
  });

  it('객관식은 고르는 방법을 문장으로 만들어 준다', () => {
    const guide = rows.find(
      (row) =>
        row.category === '응답안내' &&
        row.text === "'진단받음', '현재 약물치료 중' 중에서 해당하는 것을 모두 골라 체크해 주세요.",
    );
    expect(guide).toBeDefined();
    expect(guide?.usedIn).toContain('GEN-HX-01');
  });

  it('조사를 받침에 맞게 붙인다', () => {
    const texts = rows.map((row) => row.text);
    expect(texts).toContain(
      "'주 단위로 마심'을 골랐으면 일주일에 몇 회인지 숫자로 적어 주세요. 1회부터 7회까지 적을 수 있습니다.",
    );
    expect(texts.some((text) => text.startsWith("'간초음파'는"))).toBe(true);
    expect(texts.some((text) => text.includes("'폐경'를"))).toBe(false);
    expect(texts.some((text) => text.includes('을을') || text.includes('를를'))).toBe(false);
  });

  it('구분별로 빠짐없이 뽑는다', () => {
    const categories = new Set(rows.map((row) => row.category));
    for (const category of ['문항', '쉬운설명', '도움말', '응답안내', '선택지', '표항목', '화면안내', '버튼', '안전안내']) {
      expect(categories).toContain(category);
    }
  });
});
