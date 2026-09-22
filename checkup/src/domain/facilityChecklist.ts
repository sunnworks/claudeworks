import { SUPPORT_QUESTIONS } from '../data/modules/support';
import type { AnswerMap } from './types';

/** 검진지원 문항 답변을 검진기관이 준비할 일 목록으로 바꾼다. */
export interface FacilityTask {
  title: string;
  detail: string;
}

function choice(answers: AnswerMap, questionId: string): string | undefined {
  const answer = answers[questionId];
  return answer && answer.kind === 'choice' ? answer.value : undefined;
}

function labelOf(questionId: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  const question = SUPPORT_QUESTIONS.find((item) => item.questionId === questionId);
  return question?.options?.find((option) => option.value === value)?.label;
}

export function buildFacilityChecklist(answers: AnswerMap): FacilityTask[] {
  const tasks: FacilityTask[] = [];

  if (choice(answers, 'SUP-01') === 'Y') {
    tasks.push({
      title: '조력인 동행 허용',
      detail: `동행자: ${labelOf('SUP-02', choice(answers, 'SUP-02')) ?? '미선택'}${
        choice(answers, 'SUP-03') === 'Y' ? ' · 검진과정 전반 동행 요청' : ''
      }`,
    });
  }
  if (choice(answers, 'SUP-04') === 'Y') {
    tasks.push({ title: '보조인력 배치', detail: '검사 장소까지 안내할 의료기관 보조인력이 필요합니다.' });
  }
  if (choice(answers, 'SUP-05') === 'Y') {
    tasks.push({
      title: '의사소통 지원 준비',
      detail: `선호 방법: ${labelOf('SUP-06', choice(answers, 'SUP-06')) ?? '미선택'}`,
    });
  }
  if (choice(answers, 'SUP-07') === 'Y') {
    tasks.push({ title: '서류 작성 지원', detail: '문진표 등 서류 작성에 도움이 필요합니다.' });
  }
  if (choice(answers, 'SUP-08') === 'Y') {
    tasks.push({ title: '결과 직접 상담', detail: '검진 결과를 의료진에게 직접 설명받기를 원합니다.' });
  }
  if (choice(answers, 'SUP-09') === 'Y') {
    tasks.push({ title: '결과 수어 안내', detail: '검진 결과 설명을 수어로 제공받기를 원합니다.' });
  }

  return tasks;
}
