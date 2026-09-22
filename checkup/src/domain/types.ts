/**
 * 공식 서식 문항을 표현하기 위한 타입 정의.
 * 화면(UI)·규칙엔진·점수계산은 이 타입만 공유하고 서로를 직접 참조하지 않는다.
 */

export type ModuleId =
  | 'SUPPORT'
  | 'GENERAL'
  | 'CANCER'
  | 'ORAL'
  | 'OLDER'
  | 'KDSQ'
  | 'PHQ9'
  | 'CAPE15'
  | 'LIFESTYLE';

export type QuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'number'
  | 'duration'
  | 'matrix'
  | 'text'
  | 'scale';

/** 국가암검진 암종. 시나리오의 eligibleExams 에 담긴 암종 문항만 조립한다. */
export type CancerExam = 'STOMACH' | 'COLON' | 'LIVER' | 'LUNG' | 'BREAST' | 'CERVIX';

export type EligibilityFlag =
  | 'oralEligible'
  | 'olderFunctionEligible'
  | 'cognitiveEligible'
  | 'phq9Eligible'
  | 'cape15Eligible'
  | 'lifestyleRequested';

export interface NumberFieldDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  /** 화면 아래 회색 도움말 */
  hint?: string;
}

export interface TextFieldDef {
  key: string;
  label: string;
  maxLength: number;
  placeholder?: string;
}

export interface OptionDef {
  value: string;
  label: string;
  /** 검증형 척도의 공식 점수. 점수계산 모듈만 사용한다. */
  score?: number;
  /** 선택 시 다른 선택을 모두 지우는 배타 선택지 (해당 없음 / 모름 등) */
  exclusive?: boolean;
  /** 이 선택지를 고르면 함께 입력해야 하는 숫자칸 (예: 폐경 나이) */
  numberField?: NumberFieldDef;
  /** 이 선택지를 고르면 함께 입력해야 하는 자유입력칸 (예: 증상) */
  textField?: TextFieldDef;
  /** 화면 보조 설명 */
  hint?: string;
}

export interface MatrixRowDef {
  key: string;
  label: string;
  hint?: string;
  /** 행별로 선택지가 다를 때 (예: CAPE-15 빈도/고통) */
  options?: OptionDef[];
  /** 앞선 행의 응답에 따라 이 행을 노출 (예: 빈도가 '없음'이면 고통은 묻지 않음) */
  visibleWhen?: { row: string; notIn: string[] };
  /** 대상 암종 등 자격조건에 따라 이 행을 노출 */
  eligibility?: Rule;
}

export interface MatrixDef {
  /** choice: 행마다 하나 선택 · checks: 행마다 복수 선택 · amount: 행마다 수량+단위 */
  mode: 'choice' | 'checks' | 'amount';
  rows: MatrixRowDef[];
  /** mode=checks 일 때 열 (예: 본인·부모·형제자매·자녀) */
  columns?: OptionDef[];
  /** mode=amount 일 때 단위 (예: 잔·병·캔·cc) */
  units?: OptionDef[];
  /** 모든 행을 한 번에 비우는 배타 선택지 (예: 없음 / 모름) */
  exclusiveOptions?: OptionDef[];
  /** mode=amount 일 때 수량 범위 */
  amount?: { min: number; max: number };
  /** 행을 최소 몇 개 채워야 하는가. 기본은 전체 행. */
  requireRows?: 'all' | 'atLeastOne';
}

export interface ScaleDef {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

export type Rule =
  | { type: 'always' }
  | { type: 'flag'; flag: EligibilityFlag }
  | { type: 'exam'; exams: CancerExam[] }
  | { type: 'answerEquals'; questionId: string; value: string }
  | { type: 'answerIn'; questionId: string; values: string[] }
  | { type: 'answerNotIn'; questionId: string; values: string[] }
  | { type: 'answered'; questionId: string }
  | { type: 'all'; rules: Rule[] }
  | { type: 'any'; rules: Rule[] }
  | { type: 'not'; rule: Rule };

export interface QuestionDefinition {
  questionId: string;
  moduleId: ModuleId;
  /** 공식 서식 문구. 임의로 바꾸지 않는다. */
  officialText: string;
  /** 쉬운 한국어 설명. 검증형 척도(PHQ-9·CAPE-15·KDSQ-C)는 제공하지 않는다. */
  easyText?: string;
  /** 문항 도움말(기간·단위·용어 설명) */
  helpText?: string;
  type: QuestionType;
  options?: OptionDef[];
  numberFields?: NumberFieldDef[];
  textField?: TextFieldDef;
  matrix?: MatrixDef;
  scale?: ScaleDef;
  required: boolean;
  /** 이 문항이 대상자에게 보이는 조건 */
  eligibility?: Rule;
  /** 수어영상 자산 ID. 실제 문항별 영상이 없으면 샘플영상 + 안내배지로 표시한다. */
  signAssetId?: string;
  /** 같은 그룹 문항을 한 번에 '해당 없음'으로 표시하는 일괄 처리 그룹 */
  bulkNoneGroup?: string;
  /** 검토화면에서 묶어 보여줄 소제목 */
  section?: string;
}

export interface ModuleDefinition {
  moduleId: ModuleId;
  title: string;
  description: string;
  eligibility: Rule;
  questions: QuestionDefinition[];
  /** 검증형 척도 안내 문구 */
  instrumentNotice?: string;
}

export interface QuestionnaireDefinition {
  formId: string;
  officialVersion: string;
  effectiveDate: string;
  modules: ModuleDefinition[];
}

export type MatrixCell = {
  choice?: string;
  checks?: string[];
  amount?: number;
  unit?: string;
};

export type Answer =
  | { kind: 'choice'; value: string; numbers?: Record<string, number>; text?: string }
  | { kind: 'choices'; values: string[] }
  | { kind: 'numbers'; values: Record<string, number> }
  | { kind: 'duration'; hours: number; minutes: number }
  | { kind: 'matrix'; rows: Record<string, MatrixCell>; exclusive?: string }
  | { kind: 'text'; value: string }
  | { kind: 'scale'; value: number };

export type AnswerMap = Record<string, Answer | undefined>;

export interface ScenarioDefinition {
  scenarioId: 'A' | 'B' | 'C' | 'D';
  title: string;
  personLabel: string;
  purpose: string;
  eligibleExams: CancerExam[];
  flags: Record<EligibilityFlag, boolean>;
  /** 데모 가정임을 화면에 그대로 노출한다. */
  assumptionNote: string;
  defaultProxyWriting: boolean;
}

export interface SessionContext {
  scenario: ScenarioDefinition;
  proxyWriting: boolean;
  preferredCommunication: string[];
}
