import type { QuestionDefinition } from '../../domain/types';

const yesNo = [
  { value: 'Y', label: '예' },
  { value: 'N', label: '아니요' },
];

const items: Array<{ official: string; easy: string; section: string }> = [
  { official: '인플루엔자 예방접종을 매년 하십니까?', easy: '독감 예방주사를 매년 맞나요?', section: '예방접종' },
  { official: '폐렴 예방접종을 받으셨습니까?', easy: '폐렴 예방주사를 맞은 적이 있나요?', section: '예방접종' },
  { official: '음식을 차려주면 남의 도움 없이 혼자서 식사하십니까?', easy: '음식을 준비해 주면 혼자 먹을 수 있나요?', section: '일상생활 수행' },
  { official: '옷을 챙겨 입을 때 남의 도움 없이 혼자서 하십니까?', easy: '다른 사람 도움 없이 혼자 옷을 입을 수 있나요?', section: '일상생활 수행' },
  { official: '화장실 출입을 남의 도움 없이 혼자서 하십니까?', easy: '다른 사람 도움 없이 화장실을 이용할 수 있나요?', section: '일상생활 수행' },
  { official: '목욕할 때 남의 도움 없이 혼자서 하십니까?', easy: '다른 사람 도움 없이 혼자 목욕할 수 있나요?', section: '일상생활 수행' },
  { official: '식사 준비를 다른 사람의 도움 없이 혼자서 하십니까?', easy: '다른 사람 도움 없이 혼자 식사를 준비할 수 있나요?', section: '일상생활 수행' },
  { official: '걸어서 갈 수 있는 곳의 외출을 다른 사람의 도움 없이 혼자서 하십니까?', easy: '가까운 상점, 병원, 관공서에 혼자 다녀올 수 있나요?', section: '일상생활 수행' },
  { official: '지난 6개월간 넘어진 적이 있습니까?', easy: '지난 6개월 동안 넘어지거나 쓰러진 적이 있나요?', section: '낙상·배뇨' },
  { official: '소변을 보는 데 장애가 있거나 소변을 지릴 때가 있습니까?', easy: '소변을 보기 어렵거나 참지 못해 새는 경우가 있나요?', section: '낙상·배뇨' },
];

/** 부록 E 노인기능 문항 */
export const OLDER_QUESTIONS: QuestionDefinition[] = items.map((item, index) => {
  const no = String(index + 1).padStart(2, '0');
  return {
    questionId: `OLD-${no}`,
    moduleId: 'OLDER',
    officialText: item.official,
    easyText: item.easy,
    type: 'single_choice',
    options: yesNo,
    required: true,
    signAssetId: `ksl-old-${no}-v1`,
    section: item.section,
  };
});
