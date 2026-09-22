import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/questionnaire.v2026';
import { findQuestion } from '../domain/questionnaireEngine';
import { validateAnswer } from '../domain/validation';
import type { Answer, SessionContext } from '../domain/types';

const scenarioB = SCENARIOS.find((item) => item.scenarioId === 'B')!;
const session: SessionContext = { scenario: scenarioB, proxyWriting: false, preferredCommunication: [] };
const context = { session, answers: {} };

const check = (questionId: string, answer: Answer | undefined) =>
  validateAnswer(findQuestion(questionId)!, answer, context);

describe('필수와 범위 검사', () => {
  it('필수문항을 비우면 완료되지 않는다', () => {
    expect(check('SUP-01', undefined).complete).toBe(false);
  });

  it('필수가 아닌 자유입력은 비워도 된다', () => {
    expect(check('ORAL-15', undefined).complete).toBe(true);
  });

  it('흡연 기간은 0~100 범위만 허용한다', () => {
    expect(check('GEN-SMK-03', { kind: 'numbers', values: { years: 20, perDay: 10 } }).complete).toBe(true);
    expect(check('GEN-SMK-03', { kind: 'numbers', values: { years: 101, perDay: 10 } }).complete).toBe(false);
    expect(check('GEN-SMK-03', { kind: 'numbers', values: { years: -1, perDay: 10 } }).complete).toBe(false);
    expect(check('GEN-SMK-03', { kind: 'numbers', values: { years: 20 } }).complete).toBe(false);
  });

  it('신체활동 시간은 분이 0~59 이고 0시간 0분은 저장하지 않는다', () => {
    expect(check('GEN-PA-02', { kind: 'duration', hours: 1, minutes: 30 }).complete).toBe(true);
    expect(check('GEN-PA-02', { kind: 'duration', hours: 1, minutes: 60 }).complete).toBe(false);
    expect(check('GEN-PA-02', { kind: 'duration', hours: 0, minutes: 0 }).complete).toBe(false);
  });

  it('칫솔질 횟수는 0~20 회만 허용한다', () => {
    expect(check('ORAL-09', { kind: 'numbers', values: { count: 3 } }).complete).toBe(true);
    expect(check('ORAL-09', { kind: 'numbers', values: { count: 21 } }).complete).toBe(false);
  });
});

describe('해당 없음과 개별 선택의 동시 저장 금지', () => {
  it('과거력에서 해당 없음과 진단받음을 함께 선택할 수 없다', () => {
    expect(check('GEN-HX-01', { kind: 'choices', values: ['NONE'] }).complete).toBe(true);
    expect(check('GEN-HX-01', { kind: 'choices', values: ['DIAGNOSED', 'MEDICATION'] }).complete).toBe(true);
    const both = check('GEN-HX-01', { kind: 'choices', values: ['NONE', 'DIAGNOSED'] });
    expect(both.complete).toBe(false);
    expect(both.errors[0]).toContain('해당 없음');
  });
});

describe('선택지에 딸린 입력칸', () => {
  it('직접 입력을 고르면 숫자칸을 채워야 한다', () => {
    expect(check('CA-COM-02', { kind: 'choice', value: 'CUSTOM' }).complete).toBe(false);
    expect(check('CA-COM-02', { kind: 'choice', value: 'CUSTOM', numbers: { kg: 8 } }).complete).toBe(true);
    expect(check('CA-COM-02', { kind: 'choice', value: 'N' }).complete).toBe(true);
  });

  it('증상 있음을 고르면 증상을 적어야 한다', () => {
    expect(check('CA-COM-01', { kind: 'choice', value: 'Y' }).complete).toBe(false);
    expect(check('CA-COM-01', { kind: 'choice', value: 'Y', text: '배가 자주 아픔' }).complete).toBe(true);
  });

  it('음주 횟수 단위를 고르면 횟수를 입력해야 한다', () => {
    expect(check('GEN-ALC-01', { kind: 'choice', value: 'WEEK' }).complete).toBe(false);
    expect(check('GEN-ALC-01', { kind: 'choice', value: 'WEEK', numbers: { count: 2 } }).complete).toBe(true);
    expect(check('GEN-ALC-01', { kind: 'choice', value: 'WEEK', numbers: { count: 9 } }).complete).toBe(false);
    expect(check('GEN-ALC-01', { kind: 'choice', value: 'NONE' }).complete).toBe(true);
  });
});

describe('행렬형 문항', () => {
  it('음주량은 한 가지 이상 수량과 단위를 채워야 한다', () => {
    expect(check('GEN-ALC-02', { kind: 'matrix', rows: {} }).complete).toBe(false);
    expect(check('GEN-ALC-02', { kind: 'matrix', rows: { SOJU: { amount: 2 } } }).complete).toBe(false);
    expect(check('GEN-ALC-02', { kind: 'matrix', rows: { SOJU: { amount: 2, unit: 'GLASS' } } }).complete).toBe(true);
  });

  it('암 가족력은 없음·모름을 고르면 완료된다', () => {
    expect(check('CA-COM-03', { kind: 'matrix', rows: {}, exclusive: 'NONE' }).complete).toBe(true);
    expect(check('CA-COM-03', { kind: 'matrix', rows: {} }).complete).toBe(false);
    expect(
      check('CA-COM-03', { kind: 'matrix', rows: { STOMACH: { checks: ['PARENT'] } } }).complete,
    ).toBe(true);
  });

  it('검사 이력은 대상 암종의 모든 검사를 선택해야 한다', () => {
    // B 시나리오 대상 검사: 위내시경·위장조영·대장내시경·분변잠혈·유방촬영·자궁경부세포검사
    const partial = check('CA-COM-04', { kind: 'matrix', rows: { GASTROSCOPY: { choice: 'LT_1Y' } } });
    expect(partial.complete).toBe(false);
    const full = check('CA-COM-04', {
      kind: 'matrix',
      rows: {
        GASTROSCOPY: { choice: 'LT_1Y' },
        UGI: { choice: 'GTE_10Y_OR_NONE' },
        COLONOSCOPY: { choice: 'Y1_2' },
        FOBT: { choice: 'LT_1Y' },
        MAMMOGRAPHY: { choice: 'Y2_10' },
        PAP: { choice: 'LT_1Y' },
      },
    });
    expect(full.complete).toBe(true);
  });

  it('CAPE-15 는 빈도가 없음이면 고통을 묻지 않는다', () => {
    expect(check('CAPE-01', { kind: 'matrix', rows: { frequency: { choice: 'NEVER' } } }).complete).toBe(true);
    expect(check('CAPE-01', { kind: 'matrix', rows: { frequency: { choice: 'SOMETIMES' } } }).complete).toBe(false);
    expect(
      check('CAPE-01', { kind: 'matrix', rows: { frequency: { choice: 'SOMETIMES' }, distress: { choice: 'A_LITTLE' } } })
        .complete,
    ).toBe(true);
  });
});
