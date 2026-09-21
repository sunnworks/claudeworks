/**
 * 환경변수 — 설계서 14 6 기준.
 * OCR·아바타 키는 서버에서만 읽으며 클라이언트 번들로 내려보내지 않는다.
 */

function num(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

/** QR 유효기간은 데모와 운영 모두 48시간으로 고정한다 (설계서 8 8, 부록 C 4) */
export const QR_TTL_HOURS = 48;

export const serverConfig = {
  demoMode: bool(process.env.DEMO_MODE, true),
  ocrProvider: (process.env.OCR_PROVIDER ?? 'mock') as 'mock' | 'live',
  ocrApiUrl: process.env.OCR_API_URL ?? '',
  ocrApiKey: process.env.OCR_API_KEY ?? '',
  avatarProvider: (process.env.AVATAR_PROVIDER ?? 'mock') as 'mock' | 'live',
  avatarApiUrl: process.env.AVATAR_API_URL ?? '',
  avatarApiKey: process.env.AVATAR_API_KEY ?? '',
  /** 실제 환자정보와 약봉투 이미지를 영구 저장하지 않는다 */
  sessionImagePersist: bool(process.env.SESSION_IMAGE_PERSIST, false),
  qrTtlHours: QR_TTL_HOURS,
  qrTokenSecret: process.env.QR_TOKEN_SECRET ?? 'demo-only-not-for-production',
  qrCleanupIntervalMinutes: num(process.env.QR_CLEANUP_INTERVAL_MINUTES, 15),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? '',
} as const;

/**
 * 신뢰도 임계값 — 설계서 10 3의 작업 가설.
 * OCR 사업자별 산출방식이 다르므로 운영 전 조정할 수 있도록 환경변수로 노출한다.
 */
export const confidenceThresholds = {
  high: num(process.env.CONFIDENCE_HIGH, 0.9),
  review: num(process.env.CONFIDENCE_REVIEW, 0.75),
} as const;

/** 클라이언트에서도 사용하는 값만 별도로 노출한다 */
export const publicConfig = {
  qrTtlHours: QR_TTL_HOURS,
  confidenceHigh: confidenceThresholds.high,
  confidenceReview: confidenceThresholds.review,
} as const;
