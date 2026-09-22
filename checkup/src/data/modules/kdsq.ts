import type { OptionDef, QuestionDefinition } from '../../domain/types';

/** KDSQ-C 공식 응답값. 점수는 scoring 모듈만 사용한다. */
export const KDSQ_OPTIONS: OptionDef[] = [
  { value: 'NO', label: '아니다', score: 0 },
  { value: 'SOMETIMES', label: '가끔·조금 그렇다', score: 1 },
  { value: 'OFTEN', label: '자주·많이 그렇다', score: 2 },
];

const officialTexts = [
  '오늘이 몇 월이고 무슨 요일인지 잘 모른다',
  '자기가 놔둔 물건을 찾지 못한다',
  '같은 질문을 반복해서 한다',
  '약속을 하고서 잊어버린다',
  '물건을 가지러 갔다가 잊어버리고 그냥 온다',
  '물건이나 사람의 이름을 대기 힘들어 머뭇거린다',
  '대화 중 내용이 이해되지 않아 반복해서 물어본다',
  '길을 잃거나 헤맨 적이 있다',
  '예전에 비해 계산능력이 떨어졌다',
  '예전에 비해 성격이 변했다',
  '이전에 잘 다루던 기구의 사용이 서툴러졌다',
  '예전에 비해 방이나 집안 정리정돈을 하지 못한다',
  '상황에 맞게 스스로 옷을 선택해 입지 못한다',
  '신체적 문제를 제외하고 혼자 대중교통으로 목적지에 가기 힘들다',
  '내복이나 옷이 더러워져도 갈아입지 않으려고 한다',
];

/**
 * 부록 F 인지기능 평가(KDSQ-C).
 * 검증형 도구이므로 easyText 를 제공하지 않는다(공식 문구 그대로 표시).
 */
export const KDSQ_QUESTIONS: QuestionDefinition[] = officialTexts.map((text, index) => {
  const no = String(index + 1).padStart(2, '0');
  return {
    questionId: `KDSQ-${no}`,
    moduleId: 'KDSQ',
    officialText: text,
    type: 'single_choice',
    options: KDSQ_OPTIONS,
    required: true,
    signAssetId: `ksl-kdsq-${no}-v1`,
    section: 'KDSQ-C',
  };
});
