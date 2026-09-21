/**
 * 약봉투 OCR 기반 농인 대상 수어 복약지도 서비스 — 데모 도메인 타입
 * 설계서 11 복약지도 표준 데이터 구조 / 부록 C 7 데이터 모델 기준.
 */

/** 설계서 11 2 상태값 */
export const SESSION_STATUSES = [
  'CAPTURED',
  'OCR_COMPLETE',
  'NEEDS_REVIEW',
  'VERIFIED',
  'COMPOSED',
  'APPROVED',
  'PLAYING',
  'QUESTION',
  'COMPLETED',
  'QR_ACTIVE',
  'QR_EXPIRED',
  'CANCELLED',
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** 환자 화면으로 복약정보 전송이 허용되는 상태 (설계서 11 2 "환자 전송" 열) */
export const PATIENT_VISIBLE_STATUSES: readonly SessionStatus[] = [
  'APPROVED',
  'PLAYING',
  'QUESTION',
  'COMPLETED',
];

/** 설계서 5 서비스 설계 원칙 — 근거 출처 표시 */
export type SourceType = 'BAG_OCR' | 'PHARMACIST_INPUT' | 'REVIEWED_PHRASE_DB';

/** 설계서 10 1 품질검사 / 부록 C 4 이미지 품질 상태 */
export type ImageQualityStatus = 'PASS' | 'REVIEW' | 'RETAKE';

export interface ImageQuality {
  status: ImageQualityStatus;
  /** 0에 가까울수록 선명 */
  blur: number;
  /** 0에 가까울수록 반사 없음 */
  glare: number;
  cropped: boolean;
  rotationDeg: number;
  /** 사용자에게 보여줄 재촬영 안내 (설계서 부록 B 화면 문구) */
  messages: string[];
}

/** 복용시점 코드 — 약봉투에 명시된 표현만 매핑한다. 없는 값은 추정하지 않는다. */
export const TIMING_CODES = [
  'AFTER_MEAL_30',
  'AFTER_MEAL',
  'WITH_MEAL',
  'BEFORE_MEAL_30',
  'BEFORE_MEAL',
  'BEDTIME',
  'EMPTY_STOMACH',
  'AS_NEEDED',
] as const;
export type TimingCode = (typeof TIMING_CODES)[number];

export const TIMING_LABELS: Record<TimingCode, string> = {
  AFTER_MEAL_30: '식후 30분',
  AFTER_MEAL: '식후',
  WITH_MEAL: '식사와 함께',
  BEFORE_MEAL_30: '식전 30분',
  BEFORE_MEAL: '식전',
  BEDTIME: '취침 전',
  EMPTY_STOMACH: '공복',
  AS_NEEDED: '필요할 때',
};

/** 검수 문구DB의 주의사항 ID (설계서 12 2 표준 문장 모듈) */
export const CAUTION_IDS = [
  'DROWSINESS',
  'DRIVING',
  'ALCOHOL',
  'STORAGE_ROOM_TEMP',
  'STORAGE_REFRIGERATED',
  'ADVERSE_REACTION',
  'SEPARATE_FROM_OTHER_DRUGS',
  'FINISH_ALL',
  'MIN_INTERVAL',
  'EXTERNAL_USE',
] as const;
export type CautionId = (typeof CAUTION_IDS)[number];

/** 설계서 10 3 신뢰도와 검증 규칙 */
export type ConfidenceLevel = 'HIGH' | 'REVIEW' | 'LOW';

/** 원문 이미지에서의 위치 (0~1 정규화 좌표) — 필드 선택 시 원문 영역 강조에 사용 */
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** OCR이 추출한 개별 필드. 원문값과 정규화값을 함께 보관한다. */
export interface OCRField<T = string | number | boolean | null> {
  value: T;
  /** 0에서 1 */
  confidence: number;
  /** OCR 원문 (예: 식후 삼십분) */
  originalText: string;
  /** 정규화값 (예: 식후 30분) */
  normalizedText: string;
  bbox: BBox | null;
  sourceType: SourceType;
  /** 약사가 확인 또는 수정했는지 */
  verified: boolean;
}

export type MedicationFieldKey =
  | 'medicineName'
  | 'doseAmount'
  | 'doseUnit'
  | 'frequencyPerDay'
  | 'durationDays'
  | 'timingCode'
  | 'asNeeded';

/** 설계서 11 표준 필드 — 하나의 복용그룹 */
export interface MedicationGroup {
  groupId: string;
  bagId: string;
  /** 약품명은 조건부 필수. 없으면 복용법 중심 모드로 전환한다. */
  medicineName: OCRField<string | null>;
  doseAmount: OCRField<number | null>;
  doseUnit: OCRField<string | null>;
  frequencyPerDay: OCRField<number | null>;
  durationDays: OCRField<number | null>;
  timingCode: OCRField<TimingCode | null>;
  asNeeded: OCRField<boolean>;
  /** 필요시약의 증상 표현 (예: 통증) */
  symptomText: string | null;
  cautionIds: CautionId[];
  /** 약사 자유입력 주의사항 — 약사 책임 표시가 붙는다 */
  pharmacistNote: string | null;
  /** 같은 약봉투 안의 다른 그룹과 중복 의심 */
  duplicateSuspect: boolean;
}

/** 약봉투 1장 */
export interface MedicationBag {
  bagId: string;
  label: string;
  /** 데모용 이미지 경로 또는 업로드 이미지의 data URL (서버에 영구 저장하지 않음) */
  imageRef: string;
  imageQuality: ImageQuality;
  rawText: string;
  /** 필요시약 봉투 여부 — 정규 복용약과 분리해 안내한다 */
  asNeededBag: boolean;
  /**
   * 복용시점 후보 (설계서 10 4 아이콘·체크 기반).
   * 실제 약봉투는 복용시점을 인쇄된 보기 중 체크·기입으로 표시하므로 값을 추정하지 않고
   * 후보만 제시해 약사가 선택하게 한다.
   */
  timingCandidates: TimingCode[];
  groups: MedicationGroup[];
  provider: string;
  capturedAt: string;
}

export type IssueCode =
  | 'MISSING_REQUIRED'
  | 'LOW_CONFIDENCE'
  | 'NEEDS_REVIEW_CONFIDENCE'
  | 'CONFLICT'
  | 'DUPLICATE_SUSPECT'
  | 'IMAGE_QUALITY'
  | 'NO_MEDICINE_NAME';

export type IssueSeverity = 'BLOCKING' | 'WARNING';

export interface ValidationIssue {
  code: IssueCode;
  severity: IssueSeverity;
  bagId: string | null;
  groupId: string | null;
  field: MedicationFieldKey | null;
  message: string;
}

/** 설계서 12 2 표준 문장 모듈 */
export const CARD_TYPES = [
  'INTRO',
  'DOSING',
  'FREQUENCY',
  'TIMING',
  'DURATION',
  'AS_NEEDED',
  'CAUTION',
  'STORAGE',
  'ADVERSE_REACTION',
  'PHARMACIST_NOTE',
  'CLOSING',
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export interface SignPayload {
  templateId: string;
  slots: Record<string, string | number | boolean | null>;
  /** 수어 글로스 시퀀스 — 검수된 표현만 사용한다 */
  gloss: string[];
}

/** 설계서 11 1 안내카드 데이터 */
export interface GuidanceCard {
  cardId: string;
  type: CardType;
  sourceType: SourceType;
  required: boolean;
  selected: boolean;
  pharmacistVerified: boolean;
  /** 환자 자막에 표시되는 최종 문장 */
  displayText: string;
  signPayload: SignPayload;
  groupId: string | null;
  bagId: string | null;
  /** 약사 자유입력 문장에 붙는 책임 표시 */
  pharmacistAuthored: boolean;
  order: number;
}

export type AvatarJobStatus = 'QUEUED' | 'RENDERING' | 'READY' | 'FAILED';

/** 설계서 14 5 아바타 연동 계약 초안 */
export interface AvatarJob {
  jobId: string;
  sessionId: string;
  contentVersion: string;
  language: 'KSL';
  status: AvatarJobStatus;
  playbackType: 'sequence' | 'video' | 'placeholder';
  playbackUrl: string | null;
  /** 문장별 재생 길이(ms)와 재생 자산 — 자막 동기화에 사용 */
  segments: {
    cardId: string;
    durationMs: number;
    gloss: string[];
    /** 문장별 재생 영상. 샘플 모드에서는 데모용 샘플 수어 영상이 배정된다. */
    playbackUrl: string | null;
  }[];
  provider: string;
  cached: boolean;
  createdAt: string;
  readyAt: string | null;
  error: string | null;
}

export type ReactionType =
  | 'UNDERSTOOD'
  | 'REPLAY'
  | 'SLOW'
  | 'QUESTION'
  | 'PLAY_STARTED'
  | 'PLAY_COMPLETED';

/** 설계서 8 6 질문 유형 — 정해진 버튼만 사용한다 (C 2 권장 데모안) */
export const QUESTION_TYPES = [
  'WHEN_TO_TAKE',
  'HOW_MANY',
  'WHAT_IS_THIS',
  'DROWSY',
  'SIDE_EFFECT',
  'OTHER',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_LABELS: Record<QuestionType, string> = {
  WHEN_TO_TAKE: '언제 먹나요',
  HOW_MANY: '몇 개 먹나요',
  WHAT_IS_THIS: '이 약은 무엇인가요',
  DROWSY: '졸리나요',
  SIDE_EFFECT: '부작용이 있으면 어떻게 하나요',
  OTHER: '기타',
};

export interface PatientReaction {
  reactionId: string;
  type: ReactionType;
  questionType: QuestionType | null;
  cardId: string | null;
  createdAt: string;
  /** 약사가 대응 완료 처리했는지 */
  resolved: boolean;
}

/** 설계서 11 3 QR 재열람 데이터 */
export type ShareStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'PURGE_PENDING' | 'PURGED';

export interface ShareLink {
  shareId: string;
  /** 토큰 원문은 저장하지 않고 sha256 해시만 보관한다 (부록 C 5 안전 규칙) */
  tokenHash: string;
  contentVersion: string;
  issuedAt: string;
  expiresAt: string;
  status: ShareStatus;
  pharmacistApproved: true;
  /** 환자 식별정보는 항상 null */
  patientIdentifiers: null;
  /** 약봉투 원본 이미지는 저장하지 않는다 */
  sourceImageStored: false;
  sessionId: string;
  /** 만료 시 파기되는 재생용 스냅샷 */
  content: SharedContent | null;
  purgedAt: string | null;
  accessCount: number;
}

/** QR로 재생하는 승인본 스냅샷 — 승인된 자막과 수어 페이로드만 담는다 */
export interface SharedContent {
  contentVersion: string;
  pharmacyName: string;
  approvedAt: string;
  cards: Pick<GuidanceCard, 'cardId' | 'type' | 'displayText' | 'signPayload' | 'order'>[];
  avatar: Pick<AvatarJob, 'jobId' | 'playbackType' | 'playbackUrl' | 'segments'> | null;
}

export interface ApprovalRecord {
  /** 설계서 15 2 약사 확인 체크 */
  checks: {
    ocrMatchesBag: boolean;
    missingFieldsChecked: boolean;
    cautionsAppropriate: boolean;
    subtitlesChecked: boolean;
    finalApproval: boolean;
  };
  pharmacistId: string;
  approvedAt: string;
  contentVersion: string;
}

export interface Session {
  sessionId: string;
  status: SessionStatus;
  pharmacyName: string;
  pharmacistId: string;
  /** 환자 태블릿을 별도 기기로 연결할 때 사용하는 6자리 코드 */
  deviceCode: string;
  bags: MedicationBag[];
  cards: GuidanceCard[];
  issues: ValidationIssue[];
  approval: ApprovalRecord | null;
  avatarJob: AvatarJob | null;
  reactions: PatientReaction[];
  shareId: string | null;
  contentVersion: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** 세션 종료 시 약봉투 이미지 폐기 완료 여부 */
  imagesPurged: boolean;
  /** 환자 재생 속도 (1 = 기본, 0.7 = 천천히) */
  playbackRate: number;
  /** 약사가 질문에 대응해 다시 전송한 카드 */
  focusCardId: string | null;
}

/** 환자 태블릿과 QR 화면에 전달되는 승인 콘텐츠 응답 */
export interface PatientPayload {
  sessionId: string;
  status: SessionStatus;
  /** 약사 승인 전에는 항상 false이며 cards는 비어 있다 */
  approved: boolean;
  pharmacyName: string;
  contentVersion: string;
  cards: SharedContent['cards'];
  avatar: SharedContent['avatar'];
  playbackRate: number;
  focusCardId: string | null;
  share: { expiresAt: string; issuedAt: string; url: string } | null;
  message: string;
}
