import type { OptionDef, QuestionDefinition } from '../../domain/types';

/** PHQ-9 공식 응답값 (지난 2주 기준) */
export const PHQ9_OPTIONS: OptionDef[] = [
  { value: 'NONE', label: '전혀 아니다', score: 0 },
  { value: 'SEVERAL_DAYS', label: '여러 날', score: 1 },
  { value: 'MORE_THAN_WEEK', label: '일주일 이상', score: 2 },
  { value: 'NEARLY_EVERY_DAY', label: '거의 매일', score: 3 },
];

const officialTexts = [
  '일을 하는 것에 대한 흥미나 재미가 거의 없음',
  '가라앉은 느낌, 우울감 혹은 절망감',
  '잠들기 어렵거나 자꾸 깨어남, 혹은 너무 많이 잠',
  '피곤함, 기력이 저하됨',
  '식욕 저하 혹은 과식',
  '내 자신이 나쁜 사람이라는 느낌 또는 실패자라고 느끼거나 나 때문에 나 자신이나 가족이 불행해졌다는 느낌',
  '신문을 읽거나 TV를 볼 때 집중하기 어려움',
  '남들이 알아챌 정도로 거동이나 말이 느림 또는 너무 초조하고 안절부절못해 평소보다 많이 움직임',
  '차라리 죽는 것이 낫겠다는 생각 또는 어떤 식으로든 스스로를 자해하는 생각',
];

/** 부록 G PHQ-9. 검증형 도구이므로 easyText 를 제공하지 않는다. */
export const PHQ9_QUESTIONS: QuestionDefinition[] = officialTexts.map((text, index) => {
  const no = String(index + 1).padStart(2, '0');
  return {
    questionId: `PHQ9-${no}`,
    moduleId: 'PHQ9',
    officialText: text,
    type: 'single_choice',
    options: PHQ9_OPTIONS,
    required: true,
    signAssetId: `ksl-phq9-${no}-v1`,
    section: 'PHQ-9',
  };
});

/** 안전 플로우 판정에 사용하는 문항 ID */
export const PHQ9_SELF_HARM_QUESTION_ID = 'PHQ9-09';
