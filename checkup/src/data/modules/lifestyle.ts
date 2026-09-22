import type { QuestionDefinition } from '../../domain/types';

const yesNo = [
  { value: 'Y', label: '예' },
  { value: 'N', label: '아니요' },
];

/**
 * 부록 H 생활습관 후속평가 중 담배사용 평가 8문항.
 * 전원 필수항목이 아니라 검진의사 요청 또는 위험요인에 따른 후속평가다.
 */
export const LIFESTYLE_QUESTIONS: QuestionDefinition[] = [
  {
    questionId: 'LS-SMK-01',
    moduleId: 'LIFESTYLE',
    officialText: '앞으로 1개월 이내 금연 계획',
    easyText: '언제 담배를 끊을 생각인가요?',
    type: 'single_choice',
    options: [
      { value: 'M1', label: '1개월 이내' },
      { value: 'M6', label: '6개월 이내' },
      { value: 'SOMEDAY', label: '언젠가' },
      { value: 'NONE', label: '없음' },
    ],
    required: true,
    signAssetId: 'ksl-ls-smk-01-v1',
    section: '담배사용 평가',
  },
  {
    questionId: 'LS-SMK-02',
    moduleId: 'LIFESTYLE',
    officialText: '오늘 금연할 경우 성공 확신',
    easyText: '오늘부터 끊는다면 성공할 자신이 얼마나 있나요?',
    type: 'scale',
    scale: { min: 0, max: 7, minLabel: '전혀 자신 없음 (0)', maxLabel: '매우 자신 있음 (7)' },
    required: true,
    signAssetId: 'ksl-ls-smk-02-v1',
    section: '담배사용 평가',
  },
  {
    questionId: 'LS-SMK-03',
    moduleId: 'LIFESTYLE',
    officialText: '기상 후 첫 담배까지 시간',
    easyText: '아침에 일어나서 몇 분 뒤에 첫 담배를 피우나요?',
    type: 'single_choice',
    options: [
      { value: 'LTE_5M', label: '5분 이내' },
      { value: 'M6_30', label: '6~30분' },
      { value: 'M31_60', label: '31~60분' },
      { value: 'GT_60M', label: '60분 이후' },
    ],
    required: true,
    signAssetId: 'ksl-ls-smk-03-v1',
    section: '담배사용 평가',
  },
  {
    questionId: 'LS-SMK-04',
    moduleId: 'LIFESTYLE',
    officialText: '금연구역에서 참기 어려움',
    easyText: '담배를 피울 수 없는 곳에서 참기 어렵나요?',
    type: 'single_choice',
    options: yesNo,
    required: true,
    signAssetId: 'ksl-ls-smk-04-v1',
    section: '담배사용 평가',
  },
  {
    questionId: 'LS-SMK-05',
    moduleId: 'LIFESTYLE',
    officialText: '가장 포기하기 싫은 담배',
    easyText: '하루 중 가장 끊기 싫은 담배는 언제 피우는 담배인가요?',
    type: 'single_choice',
    options: [
      { value: 'FIRST_MORNING', label: '아침 첫 담배' },
      { value: 'OTHERS', label: '나머지' },
    ],
    required: true,
    signAssetId: 'ksl-ls-smk-05-v1',
    section: '담배사용 평가',
  },
  {
    questionId: 'LS-SMK-06',
    moduleId: 'LIFESTYLE',
    officialText: '하루 흡연 개비',
    easyText: '하루에 담배를 몇 개비 피우나요?',
    type: 'single_choice',
    options: [
      { value: 'LTE_10', label: '10개비 이하' },
      { value: 'N11_20', label: '11~20개비' },
      { value: 'N21_30', label: '21~30개비' },
      { value: 'GTE_31', label: '31개비 이상' },
    ],
    required: true,
    signAssetId: 'ksl-ls-smk-06-v1',
    section: '담배사용 평가',
  },
  {
    questionId: 'LS-SMK-07',
    moduleId: 'LIFESTYLE',
    officialText: '아침 첫 몇 시간에 더 자주 흡연',
    easyText: '아침에 일어난 뒤 몇 시간 동안 더 자주 피우나요?',
    type: 'single_choice',
    options: yesNo,
    required: true,
    signAssetId: 'ksl-ls-smk-07-v1',
    section: '담배사용 평가',
  },
  {
    questionId: 'LS-SMK-08',
    moduleId: 'LIFESTYLE',
    officialText: '몹시 아파 누워 있어도 흡연',
    easyText: '몸이 아파 하루 종일 누워 있을 때에도 담배를 피우나요?',
    type: 'single_choice',
    options: yesNo,
    required: true,
    signAssetId: 'ksl-ls-smk-08-v1',
    section: '담배사용 평가',
  },
];
