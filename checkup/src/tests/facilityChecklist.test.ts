import { describe, expect, it } from 'vitest';
import { buildFacilityChecklist } from '../domain/facilityChecklist';
import type { Answer, AnswerMap } from '../domain/types';

const choice = (value: string): Answer => ({ kind: 'choice', value });

describe('검진기관 준비사항 생성', () => {
  it('지원 요청이 없으면 준비할 일도 없다', () => {
    const answers: AnswerMap = {
      'SUP-01': choice('N'),
      'SUP-04': choice('N'),
      'SUP-05': choice('N'),
      'SUP-07': choice('N'),
      'SUP-08': choice('N'),
      'SUP-09': choice('N'),
    };
    expect(buildFacilityChecklist(answers)).toEqual([]);
  });

  it('동행·의사소통 요청을 준비사항으로 바꾼다', () => {
    const answers: AnswerMap = {
      'SUP-01': choice('Y'),
      'SUP-02': choice('ASSISTANT'),
      'SUP-03': choice('Y'),
      'SUP-05': choice('Y'),
      'SUP-06': choice('KSL'),
      'SUP-09': choice('Y'),
    };
    const tasks = buildFacilityChecklist(answers);
    expect(tasks.map((task) => task.title)).toEqual(['조력인 동행 허용', '의사소통 지원 준비', '결과 수어 안내']);
    expect(tasks[0].detail).toContain('활동지원사');
    expect(tasks[0].detail).toContain('검진과정 전반 동행 요청');
    expect(tasks[1].detail).toContain('수어통역');
  });
});
