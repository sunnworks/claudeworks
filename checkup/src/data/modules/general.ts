import type { OptionDef, QuestionDefinition } from '../../domain/types';

const yesNo: OptionDef[] = [
  { value: 'Y', label: '예' },
  { value: 'N', label: '아니요' },
];

const yesNoUnknown: OptionDef[] = [
  { value: 'Y', label: '예' },
  { value: 'N', label: '아니요' },
  { value: 'UNKNOWN', label: '모름' },
];

const familyHistoryOptions: OptionDef[] = [
  { value: 'YES', label: '있음' },
  { value: 'NO', label: '없음' },
  { value: 'UNKNOWN', label: '모름' },
];

/** 과거력 문항: 진단받음·약물치료 중을 각각 표시하고, 해당 없음은 배타 선택이다. */
const historyOptions: OptionDef[] = [
  { value: 'DIAGNOSED', label: '진단받음' },
  { value: 'MEDICATION', label: '현재 약물치료 중' },
  { value: 'NONE', label: '해당 없음', exclusive: true },
];

/** 일주일 중 며칠 유형. 공식 응답값은 없음 / 1~6일 / 매일 이다. */
const daysPerWeekOptions: OptionDef[] = [
  { value: 'NONE', label: '없음' },
  { value: 'D1', label: '1일' },
  { value: 'D2', label: '2일' },
  { value: 'D3', label: '3일' },
  { value: 'D4', label: '4일' },
  { value: 'D5', label: '5일' },
  { value: 'D6', label: '6일' },
  { value: 'EVERYDAY', label: '매일' },
];

const drinkRows = [
  { key: 'SOJU', label: '소주' },
  { key: 'BEER', label: '맥주' },
  { key: 'LIQUOR', label: '양주' },
  { key: 'MAKGEOLLI', label: '막걸리' },
  { key: 'WINE', label: '와인' },
];

const drinkUnits: OptionDef[] = [
  { value: 'GLASS', label: '잔' },
  { value: 'BOTTLE', label: '병' },
  { value: 'CAN', label: '캔' },
  { value: 'CC', label: 'cc' },
];

function historyQuestion(index: number, disease: string, assetSuffix: string): QuestionDefinition {
  const id = `GEN-HX-${String(index).padStart(2, '0')}`;
  return {
    questionId: id,
    moduleId: 'GENERAL',
    officialText: `${disease}으로 진단을 받았거나 현재 약물치료 중이십니까?`,
    easyText: `병원에서 ${disease}이라고 진단받은 적이 있나요? 지금 약으로 치료하고 있나요?`,
    type: 'multi_choice',
    options: historyOptions,
    required: true,
    bulkNoneGroup: 'GEN-HX',
    signAssetId: `ksl-gen-hx-${assetSuffix}-v1`,
    section: '과거 질환력',
  };
}

function familyQuestion(index: number, disease: string): QuestionDefinition {
  const id = `GEN-FH-${String(index).padStart(2, '0')}`;
  return {
    questionId: id,
    moduleId: 'GENERAL',
    officialText: `부모, 형제, 자매 중 ${disease}을 앓았거나 해당 질환으로 사망한 경우가 있습니까?`,
    easyText: `부모님이나 형제·자매 중 ${disease}을 앓은 사람이 있나요?`,
    helpText: '가족은 부모, 형제, 자매만 해당합니다. 배우자나 사촌은 포함하지 않습니다.',
    type: 'single_choice',
    options: familyHistoryOptions,
    required: true,
    signAssetId: `ksl-gen-fh-${String(index).padStart(2, '0')}-v1`,
    section: '가족력',
  };
}

/** 부록 B 일반 건강검진 문항 */
export const GENERAL_QUESTIONS: QuestionDefinition[] = [
  historyQuestion(1, '뇌졸중 또는 중풍', '01'),
  historyQuestion(2, '심근경색 또는 협심증', '02'),
  historyQuestion(3, '고혈압', '03'),
  historyQuestion(4, '당뇨병', '04'),
  historyQuestion(5, '이상지질혈증 또는 고지혈증', '05'),
  historyQuestion(6, '폐결핵', '06'),
  historyQuestion(7, '우울증', '07'),
  historyQuestion(8, '조기정신증', '08'),
  historyQuestion(9, 'C형간염', '09'),
  historyQuestion(10, '만성폐쇄성폐질환', '10'),
  historyQuestion(11, '기타 질환 또는 암', '11'),

  familyQuestion(1, '뇌졸중 또는 중풍'),
  familyQuestion(2, '심근경색 또는 협심증'),
  familyQuestion(3, '고혈압'),
  familyQuestion(4, '당뇨병'),
  familyQuestion(5, '기타 질환 또는 암'),

  {
    questionId: 'GEN-HBV-01',
    moduleId: 'GENERAL',
    officialText: 'B형간염 바이러스 보유자입니까?',
    easyText: '병원에서 B형간염 바이러스가 있다고 들은 적이 있나요?',
    helpText: 'B형간염 예방접종을 맞은 것과 B형간염 바이러스를 가지고 있는 것은 다릅니다.',
    type: 'single_choice',
    options: yesNoUnknown,
    required: true,
    signAssetId: 'ksl-gen-hbv-01-v1',
    section: 'B형간염',
  },

  {
    questionId: 'GEN-SMK-01',
    moduleId: 'GENERAL',
    officialText: '평생 총 5갑 100개비 이상의 일반담배를 피운 적이 있습니까?',
    easyText: '지금까지 일반담배를 모두 합해 5갑 이상 피운 적이 있나요?',
    helpText: '1갑은 20개비입니다. 5갑은 100개비입니다. 지금까지 피운 담배를 모두 더해서 생각하세요.',
    type: 'single_choice',
    options: yesNo,
    required: true,
    signAssetId: 'ksl-gen-smk-01-v1',
    section: '일반담배',
  },
  {
    questionId: 'GEN-SMK-02',
    moduleId: 'GENERAL',
    officialText: '현재 일반담배를 피우십니까?',
    easyText: '지금도 일반담배를 피우나요?',
    type: 'single_choice',
    options: [
      { value: 'CURRENT', label: '현재 피움' },
      { value: 'FORMER', label: '과거에 피웠으나 끊음' },
    ],
    required: true,
    eligibility: { type: 'answerEquals', questionId: 'GEN-SMK-01', value: 'Y' },
    signAssetId: 'ksl-gen-smk-02-v1',
    section: '일반담배',
  },
  {
    questionId: 'GEN-SMK-03',
    moduleId: 'GENERAL',
    officialText: '일반담배 총 사용기간과 하루 평균 개비 수',
    easyText: '담배를 몇 년 피웠고 하루에 보통 몇 개비 피웠나요?',
    type: 'number',
    numberFields: [
      { key: 'years', label: '총 사용기간', unit: '년', min: 0, max: 100 },
      { key: 'perDay', label: '하루 평균', unit: '개비', min: 0, max: 100 },
    ],
    required: true,
    eligibility: { type: 'answered', questionId: 'GEN-SMK-02' },
    signAssetId: 'ksl-gen-smk-03-v1',
    section: '일반담배',
  },
  {
    questionId: 'GEN-SMK-04',
    moduleId: 'GENERAL',
    officialText: '끊은 지 몇 년입니까?',
    easyText: '담배를 끊은 지 몇 년 되었나요?',
    type: 'number',
    numberFields: [{ key: 'years', label: '끊은 기간', unit: '년', min: 0, max: 100 }],
    required: true,
    eligibility: { type: 'answerEquals', questionId: 'GEN-SMK-02', value: 'FORMER' },
    signAssetId: 'ksl-gen-smk-04-v1',
    section: '일반담배',
  },

  {
    questionId: 'GEN-HTP-01',
    moduleId: 'GENERAL',
    officialText: '궐련형 전자담배를 사용한 적이 있습니까?',
    easyText: '아이코스, 글로, 릴 같은 가열담배를 사용한 적이 있나요?',
    type: 'single_choice',
    options: yesNo,
    required: true,
    signAssetId: 'ksl-gen-htp-01-v1',
    section: '궐련형 전자담배',
  },
  {
    questionId: 'GEN-HTP-02',
    moduleId: 'GENERAL',
    officialText: '현재 궐련형 전자담배를 사용하십니까?',
    easyText: '지금도 가열담배를 사용하나요?',
    type: 'single_choice',
    options: [
      { value: 'CURRENT', label: '현재 사용' },
      { value: 'FORMER', label: '과거 사용 후 중단' },
    ],
    required: true,
    eligibility: { type: 'answerEquals', questionId: 'GEN-HTP-01', value: 'Y' },
    signAssetId: 'ksl-gen-htp-02-v1',
    section: '궐련형 전자담배',
  },
  {
    questionId: 'GEN-HTP-03',
    moduleId: 'GENERAL',
    officialText: '총 사용기간과 하루 평균 개비 수',
    easyText: '몇 년 사용했고 하루에 보통 몇 개비 사용했나요?',
    type: 'number',
    numberFields: [
      { key: 'years', label: '총 사용기간', unit: '년', min: 0, max: 100 },
      { key: 'perDay', label: '하루 평균', unit: '개비', min: 0, max: 100 },
    ],
    required: true,
    eligibility: { type: 'answered', questionId: 'GEN-HTP-02' },
    signAssetId: 'ksl-gen-htp-03-v1',
    section: '궐련형 전자담배',
  },
  {
    questionId: 'GEN-HTP-04',
    moduleId: 'GENERAL',
    officialText: '끊은 지 몇 년입니까?',
    easyText: '가열담배를 끊은 지 몇 년 되었나요?',
    type: 'number',
    numberFields: [{ key: 'years', label: '끊은 기간', unit: '년', min: 0, max: 100 }],
    required: true,
    eligibility: { type: 'answerEquals', questionId: 'GEN-HTP-02', value: 'FORMER' },
    signAssetId: 'ksl-gen-htp-04-v1',
    section: '궐련형 전자담배',
  },

  {
    questionId: 'GEN-VAPE-01',
    moduleId: 'GENERAL',
    officialText: '액상형 전자담배를 사용한 경험이 있습니까?',
    easyText: '액상형 전자담배를 사용한 적이 있나요?',
    type: 'single_choice',
    options: yesNo,
    required: true,
    signAssetId: 'ksl-gen-vape-01-v1',
    section: '액상형 전자담배',
  },
  {
    questionId: 'GEN-VAPE-02',
    moduleId: 'GENERAL',
    officialText: '최근 한 달 동안 액상형 전자담배를 사용한 경험이 있습니까?',
    easyText: '지난 한 달 동안 며칠 사용했나요?',
    type: 'single_choice',
    options: [
      { value: 'NO', label: '아니요' },
      { value: 'D1_2', label: '1~2일' },
      { value: 'D3_9', label: '3~9일' },
      { value: 'D10_29', label: '10~29일' },
      { value: 'EVERYDAY', label: '매일' },
    ],
    required: true,
    eligibility: { type: 'answerEquals', questionId: 'GEN-VAPE-01', value: 'Y' },
    signAssetId: 'ksl-gen-vape-02-v1',
    section: '액상형 전자담배',
  },

  {
    questionId: 'GEN-ALC-01',
    moduleId: 'GENERAL',
    officialText: '지난 1년 동안 술을 마시는 횟수는 어느 정도입니까?',
    easyText: '지난 1년 동안 술을 얼마나 자주 마셨나요?',
    helpText: '주·월·연 중 한 가지 단위만 선택해 횟수를 적습니다.',
    type: 'single_choice',
    options: [
      {
        value: 'WEEK',
        label: '주 단위로 마심',
        numberField: { key: 'count', label: '일주일에', unit: '회', min: 1, max: 7 },
      },
      {
        value: 'MONTH',
        label: '월 단위로 마심',
        numberField: { key: 'count', label: '한 달에', unit: '회', min: 1, max: 30 },
      },
      {
        value: 'YEAR',
        label: '연 단위로 마심',
        numberField: { key: 'count', label: '1년에', unit: '회', min: 1, max: 365 },
      },
      { value: 'NONE', label: '마시지 않음' },
    ],
    required: true,
    signAssetId: 'ksl-gen-alc-01-v1',
    section: '음주',
  },
  {
    questionId: 'GEN-ALC-02',
    moduleId: 'GENERAL',
    officialText: '술을 마시는 날 하루 평균 음주량',
    easyText: '평소 술을 마시는 날에 종류별로 얼마나 마셨나요?',
    helpText: '마신 술 종류만 적습니다. 마시지 않는 술은 비워 둡니다.',
    type: 'matrix',
    matrix: {
      mode: 'amount',
      rows: drinkRows,
      units: drinkUnits,
      amount: { min: 0, max: 100 },
      requireRows: 'atLeastOne',
    },
    required: true,
    eligibility: { type: 'answerNotIn', questionId: 'GEN-ALC-01', values: ['NONE'] },
    signAssetId: 'ksl-gen-alc-02-v1',
    section: '음주',
  },
  {
    questionId: 'GEN-ALC-03',
    moduleId: 'GENERAL',
    officialText: '가장 많이 마셨던 하루 음주량',
    easyText: '지난 1년 중 술을 가장 많이 마신 하루의 양은 얼마였나요?',
    type: 'matrix',
    matrix: {
      mode: 'amount',
      rows: drinkRows,
      units: drinkUnits,
      amount: { min: 0, max: 100 },
      requireRows: 'atLeastOne',
    },
    required: true,
    eligibility: { type: 'answerNotIn', questionId: 'GEN-ALC-01', values: ['NONE'] },
    signAssetId: 'ksl-gen-alc-03-v1',
    section: '음주',
  },

  {
    questionId: 'GEN-PA-01',
    moduleId: 'GENERAL',
    officialText: '고강도 신체활동 일수',
    easyText: '숨이 많이 차는 운동이나 일을 일주일에 며칠 하나요?',
    helpText: '고강도는 달리기, 등산, 빠른 속도로 자전거 타기처럼 숨이 많이 차는 활동입니다.',
    type: 'single_choice',
    options: daysPerWeekOptions,
    required: true,
    signAssetId: 'ksl-gen-pa-01-v1',
    section: '신체활동',
  },
  {
    questionId: 'GEN-PA-02',
    moduleId: 'GENERAL',
    officialText: '고강도 신체활동 하루 평균 시간',
    easyText: '그 활동을 하는 날에는 하루에 몇 시간 몇 분 하나요?',
    type: 'duration',
    required: true,
    eligibility: { type: 'answerNotIn', questionId: 'GEN-PA-01', values: ['NONE'] },
    signAssetId: 'ksl-gen-pa-02-v1',
    section: '신체활동',
  },
  {
    questionId: 'GEN-PA-03',
    moduleId: 'GENERAL',
    officialText: '중강도 신체활동 일수',
    easyText: '고강도 활동을 빼고, 숨이 조금 차는 운동이나 일을 일주일에 며칠 하나요?',
    helpText: '중강도는 빠르게 걷기, 복식 테니스, 청소처럼 숨이 조금 차는 활동입니다.',
    type: 'single_choice',
    options: daysPerWeekOptions,
    required: true,
    signAssetId: 'ksl-gen-pa-03-v1',
    section: '신체활동',
  },
  {
    questionId: 'GEN-PA-04',
    moduleId: 'GENERAL',
    officialText: '중강도 신체활동 하루 평균 시간',
    easyText: '그 활동을 하는 날에는 하루에 몇 시간 몇 분 하나요?',
    type: 'duration',
    required: true,
    eligibility: { type: 'answerNotIn', questionId: 'GEN-PA-03', values: ['NONE'] },
    signAssetId: 'ksl-gen-pa-04-v1',
    section: '신체활동',
  },
  {
    questionId: 'GEN-PA-05',
    moduleId: 'GENERAL',
    officialText: '최근 1주일 근력운동 일수',
    easyText: '지난 일주일 동안 팔굽혀펴기, 아령 같은 근력운동을 며칠 했나요?',
    type: 'single_choice',
    options: daysPerWeekOptions,
    required: true,
    signAssetId: 'ksl-gen-pa-05-v1',
    section: '신체활동',
  },
];
