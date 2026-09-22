import { CAPE15_QUESTIONS, CAPE_DISTRESS_OPTIONS, CAPE_DISTRESS_ROW, CAPE_FREQUENCY_OPTIONS, CAPE_FREQUENCY_ROW } from '../data/modules/cape15';
import { KDSQ_OPTIONS, KDSQ_QUESTIONS } from '../data/modules/kdsq';
import { PHQ9_OPTIONS, PHQ9_QUESTIONS, PHQ9_SELF_HARM_QUESTION_ID } from '../data/modules/phq9';
import type { AnswerMap, OptionDef } from './types';

export interface InstrumentScore {
  instrument: 'PHQ-9' | 'CAPE-15' | 'KDSQ-C';
  /** 모든 문항에 답했는가 */
  complete: boolean;
  /** 의료진 확인 플래그. 진단이 아니다. */
  medicalReview: boolean;
  reasons: string[];
}

export interface Phq9Score extends InstrumentScore {
  instrument: 'PHQ-9';
  total: number;
  maxTotal: 27;
  /** 9번 문항 점수 (자해·죽음 관련 생각) */
  selfHarmScore: number;
}

export interface Cape15Score extends InstrumentScore {
  instrument: 'CAPE-15';
  frequencyTotal: number;
  distressTotal: number;
  maxTotal: 45;
}

export interface KdsqScore extends InstrumentScore {
  instrument: 'KDSQ-C';
  total: number;
  maxTotal: 30;
}

function scoreOf(options: OptionDef[], value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  return options.find((option) => option.value === value)?.score;
}

function choiceValue(answers: AnswerMap, questionId: string): string | undefined {
  const answer = answers[questionId];
  return answer && answer.kind === 'choice' ? answer.value : undefined;
}

/** PHQ-9: 9문항 각 0~3, 총 0~27. 총점 10 이상 또는 9번 문항 1 이상이면 의료진 확인 플래그. */
export function scorePhq9(answers: AnswerMap): Phq9Score {
  let total = 0;
  let answered = 0;
  for (const question of PHQ9_QUESTIONS) {
    const score = scoreOf(PHQ9_OPTIONS, choiceValue(answers, question.questionId));
    if (score === undefined) continue;
    total += score;
    answered += 1;
  }
  const selfHarmScore = scoreOf(PHQ9_OPTIONS, choiceValue(answers, PHQ9_SELF_HARM_QUESTION_ID)) ?? 0;
  const reasons: string[] = [];
  if (total >= 10) reasons.push('총점 10점 이상');
  if (selfHarmScore >= 1) reasons.push('9번 문항 1점 이상');
  return {
    instrument: 'PHQ-9',
    total,
    maxTotal: 27,
    selfHarmScore,
    complete: answered === PHQ9_QUESTIONS.length,
    medicalReview: reasons.length > 0,
    reasons,
  };
}

/** PHQ-9 9번 문항에 1점 이상 답했는가. 즉시 안전안내 표시 조건. */
export function isSelfHarmResponse(answers: AnswerMap): boolean {
  return (scoreOf(PHQ9_OPTIONS, choiceValue(answers, PHQ9_SELF_HARM_QUESTION_ID)) ?? 0) >= 1;
}

/** CAPE-15: 빈도와 고통을 각각 0~3으로 합산(각 0~45). 둘 중 한 합계가 6 이상이면 플래그. */
export function scoreCape15(answers: AnswerMap): Cape15Score {
  let frequencyTotal = 0;
  let distressTotal = 0;
  let answered = 0;

  for (const question of CAPE15_QUESTIONS) {
    const answer = answers[question.questionId];
    if (!answer || answer.kind !== 'matrix') continue;
    const frequency = scoreOf(CAPE_FREQUENCY_OPTIONS, answer.rows[CAPE_FREQUENCY_ROW]?.choice);
    if (frequency === undefined) continue;
    frequencyTotal += frequency;
    // 빈도가 없음(0)이면 고통은 묻지 않으며 0으로 계산한다.
    const distress = frequency === 0 ? 0 : scoreOf(CAPE_DISTRESS_OPTIONS, answer.rows[CAPE_DISTRESS_ROW]?.choice);
    if (distress === undefined) continue;
    distressTotal += distress;
    answered += 1;
  }

  const reasons: string[] = [];
  if (frequencyTotal >= 6) reasons.push('빈도 총점 6점 이상');
  if (distressTotal >= 6) reasons.push('고통 총점 6점 이상');

  return {
    instrument: 'CAPE-15',
    frequencyTotal,
    distressTotal,
    maxTotal: 45,
    complete: answered === CAPE15_QUESTIONS.length,
    medicalReview: reasons.length > 0,
    reasons,
  };
}

/** KDSQ-C: 15문항 각 0~2, 총 0~30. 총점 6 이상이면 플래그. */
export function scoreKdsqC(answers: AnswerMap): KdsqScore {
  let total = 0;
  let answered = 0;
  for (const question of KDSQ_QUESTIONS) {
    const score = scoreOf(KDSQ_OPTIONS, choiceValue(answers, question.questionId));
    if (score === undefined) continue;
    total += score;
    answered += 1;
  }
  const reasons = total >= 6 ? ['총점 6점 이상'] : [];
  return {
    instrument: 'KDSQ-C',
    total,
    maxTotal: 30,
    complete: answered === KDSQ_QUESTIONS.length,
    medicalReview: total >= 6,
    reasons,
  };
}

export type AnyScore = Phq9Score | Cape15Score | KdsqScore;

/** 적용된 척도만 계산한다. */
export function scoreInstruments(answers: AnswerMap, moduleIds: string[]): AnyScore[] {
  const scores: AnyScore[] = [];
  if (moduleIds.includes('PHQ9')) scores.push(scorePhq9(answers));
  if (moduleIds.includes('CAPE15')) scores.push(scoreCape15(answers));
  if (moduleIds.includes('KDSQ')) scores.push(scoreKdsqC(answers));
  return scores;
}
