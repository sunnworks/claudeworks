import type {
  CancerExam,
  ModuleDefinition,
  QuestionnaireDefinition,
  ScenarioDefinition,
} from '../domain/types';
import { SUPPORT_QUESTIONS } from './modules/support';
import { GENERAL_QUESTIONS } from './modules/general';
import { CANCER_QUESTIONS } from './modules/cancer';
import { ORAL_QUESTIONS } from './modules/oral';
import { OLDER_QUESTIONS } from './modules/older';
import { KDSQ_QUESTIONS } from './modules/kdsq';
import { PHQ9_QUESTIONS } from './modules/phq9';
import { CAPE15_QUESTIONS } from './modules/cape15';
import { LIFESTYLE_QUESTIONS } from './modules/lifestyle';

const ALL_EXAMS: CancerExam[] = ['STOMACH', 'COLON', 'LIVER', 'LUNG', 'BREAST', 'CERVIX'];

export const MODULES: ModuleDefinition[] = [
  {
    moduleId: 'SUPPORT',
    title: '검진지원',
    description: '병원에서 필요한 동행·의사소통 지원을 미리 알려 줍니다.',
    eligibility: { type: 'always' },
    questions: SUPPORT_QUESTIONS,
    purposeNotice:
      '이 문항은 국가건강검진 공식 문진표가 아닙니다. 장애친화 건강검진 사전 체크리스트를 참고한 확장 문항으로, 검진기관이 방문 전에 수어통역·동행 허용·보조인력 배치를 준비하도록 돕는 데에만 사용합니다. 답변은 확인표의 검진기관 준비사항으로 정리됩니다.',
  },
  {
    moduleId: 'GENERAL',
    title: '일반 건강검진',
    description: '과거 질환력, 가족력, 흡연, 음주, 신체활동을 확인합니다.',
    eligibility: { type: 'always' },
    questions: GENERAL_QUESTIONS,
  },
  {
    moduleId: 'CANCER',
    title: '암검진',
    description: '검진 대상으로 지정된 암종의 문항만 나옵니다.',
    eligibility: { type: 'exam', exams: ALL_EXAMS },
    questions: CANCER_QUESTIONS,
  },
  {
    moduleId: 'ORAL',
    title: '구강검진',
    description: '치아와 잇몸 상태, 구강 관리 습관을 확인합니다.',
    eligibility: { type: 'flag', flag: 'oralEligible' },
    questions: ORAL_QUESTIONS,
  },
  {
    moduleId: 'OLDER',
    title: '노인신체기능·예방접종',
    description: '예방접종과 일상생활 수행 능력을 확인합니다.',
    eligibility: { type: 'flag', flag: 'olderFunctionEligible' },
    questions: OLDER_QUESTIONS,
  },
  {
    moduleId: 'KDSQ',
    title: '인지기능검사 (KDSQ-C)',
    description: '기억력과 일상 수행의 변화를 확인하는 검증형 도구입니다.',
    eligibility: { type: 'flag', flag: 'cognitiveEligible' },
    questions: KDSQ_QUESTIONS,
    instrumentNotice:
      '검증형 평가도구이므로 공식 문구를 그대로 표시합니다. 쉬운 설명은 임상·도구 저작 검수 전에는 제공하지 않습니다.',
  },
  {
    moduleId: 'PHQ9',
    title: '정신건강검사 (PHQ-9)',
    description: '지난 2주 동안의 상태를 묻는 검증형 도구입니다.',
    eligibility: { type: 'flag', flag: 'phq9Eligible' },
    questions: PHQ9_QUESTIONS,
    instrumentNotice:
      '지난 2주 동안 얼마나 자주 그런 문제를 겪었는지 선택합니다. 검증형 도구이므로 공식 문구를 그대로 표시합니다.',
  },
  {
    moduleId: 'CAPE15',
    title: '정신건강검사 (CAPE-15)',
    description: '경험의 빈도와 그때의 괴로움을 두 단계로 묻는 검증형 도구입니다.',
    eligibility: { type: 'flag', flag: 'cape15Eligible' },
    questions: CAPE15_QUESTIONS,
    instrumentNotice:
      '먼저 얼마나 자주 그런지 선택하고, 없음이 아니면 그때 얼마나 괴로운지 선택합니다. 검증형 도구이므로 공식 문구를 그대로 표시합니다.',
  },
  {
    moduleId: 'LIFESTYLE',
    title: '생활습관 후속평가 (담배사용)',
    description: '검진의사 요청이 있을 때 수행하는 후속평가입니다.',
    eligibility: { type: 'flag', flag: 'lifestyleRequested' },
    questions: LIFESTYLE_QUESTIONS,
  },
];

export const QUESTIONNAIRE: QuestionnaireDefinition = {
  formId: 'nhis-adult-pre-questionnaire-demo',
  officialVersion: '2026 성인 국가건강검진 사전문진 데모 v1.0',
  effectiveDate: '2026-01-07',
  modules: MODULES,
};

/**
 * 데모 시나리오. 실서비스에서는 병원 또는 공단의 검진대상 정보를 받아 채운다.
 * eligibleExams 와 flags 는 공식 자격조회 결과가 아니라 데모 가정값이다.
 */
export const SCENARIOS: ScenarioDefinition[] = [
  {
    scenarioId: 'A',
    title: 'A 시나리오',
    personLabel: '45세 남성',
    purpose: '흡연·음주·암검진 분기를 확인합니다.',
    eligibleExams: ['STOMACH', 'LIVER'],
    flags: {
      oralEligible: false,
      olderFunctionEligible: false,
      cognitiveEligible: false,
      phq9Eligible: false,
      cape15Eligible: false,
      lifestyleRequested: false,
    },
    assumptionNote: '데모 가정: 위암·간암(고위험군) 검진 대상으로 지정되었습니다.',
    defaultProxyWriting: false,
  },
  {
    scenarioId: 'B',
    title: 'B 시나리오',
    personLabel: '50세 여성',
    purpose: '여성 암문항과 검사력, 구강검진을 확인합니다.',
    eligibleExams: ['STOMACH', 'COLON', 'BREAST', 'CERVIX'],
    flags: {
      oralEligible: true,
      olderFunctionEligible: false,
      cognitiveEligible: false,
      phq9Eligible: false,
      cape15Eligible: false,
      lifestyleRequested: false,
    },
    assumptionNote: '데모 가정: 위암·대장암·유방암·자궁경부암 검진과 구강검진 대상으로 지정되었습니다.',
    defaultProxyWriting: false,
  },
  {
    scenarioId: 'C',
    title: 'C 시나리오',
    personLabel: '28세 성인',
    purpose: '정신건강 척도와 안전 플로우를 확인합니다.',
    eligibleExams: [],
    flags: {
      oralEligible: false,
      olderFunctionEligible: false,
      cognitiveEligible: false,
      phq9Eligible: true,
      cape15Eligible: true,
      lifestyleRequested: false,
    },
    assumptionNote: '데모 가정: 정신건강검사(PHQ-9)와 정신건강검사(CAPE-15) 대상으로 지정되었습니다.',
    defaultProxyWriting: false,
  },
  {
    scenarioId: 'D',
    title: 'D 시나리오',
    personLabel: '70세 성인',
    purpose: '대리작성과 인지기능 평가를 확인합니다.',
    eligibleExams: [],
    flags: {
      oralEligible: false,
      olderFunctionEligible: true,
      cognitiveEligible: true,
      phq9Eligible: false,
      cape15Eligible: false,
      lifestyleRequested: false,
    },
    assumptionNote: '데모 가정: 노인신체기능검사와 인지기능검사(KDSQ-C) 대상으로 지정되었습니다.',
    defaultProxyWriting: true,
  },
];

export const ALL_QUESTIONS = MODULES.flatMap((module) => module.questions);
