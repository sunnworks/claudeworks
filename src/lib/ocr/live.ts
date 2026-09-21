/**
 * 라이브 OCR 어댑터 — 설계서 13 4 라이브 OCR 모드.
 *
 * 실제 OCR 사업자 연동 지점은 이 파일 한 곳에 모아 둔다.
 * API 키는 서버 환경변수에서만 읽고 클라이언트로 내려보내지 않는다.
 *
 * TODO(OCR 연동): 사업자 선정 후 아래 3가지를 사업자 규격에 맞게 교체한다.
 *   1. 요청 본문 형식 (base64 / multipart / presigned URL)
 *   2. 응답의 블록·좌표·신뢰도 필드 매핑
 *   3. 국외이전·보관정책에 따른 전송 데이터 최소화 (설계서 15 OCR API 전송)
 */

import { serverConfig } from '@/lib/config';
import { parseTimingCandidates } from '@/lib/parser';
import type { ImageQuality } from '@/lib/types';
import { groupsFromRawText } from './mock';
import type { OCRProvider, OCRRequest, OCRResult } from './provider';

interface LiveOcrResponse {
  text?: string;
  rawText?: string;
  confidence?: number;
  quality?: Partial<ImageQuality>;
}

const DEFAULT_QUALITY: ImageQuality = {
  status: 'PASS',
  blur: 0,
  glare: 0,
  cropped: false,
  rotationDeg: 0,
  messages: [],
};

export class LiveOCRProvider implements OCRProvider {
  readonly name = 'live';

  async recognize(request: OCRRequest): Promise<OCRResult> {
    if (serverConfig.ocrApiUrl === '') {
      throw new Error('OCR_API_URL이 설정되지 않았습니다. 샘플 모드로 시연하거나 환경변수를 설정해 주세요.');
    }

    const response = await fetch(serverConfig.ocrApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(serverConfig.ocrApiKey === '' ? {} : { Authorization: `Bearer ${serverConfig.ocrApiKey}` }),
      },
      body: JSON.stringify({ image: request.image, mimeType: request.mimeType }),
      // 라이브 OCR 목표 5초 (설계서 13 5)
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`OCR 서비스 오류 (${response.status})`);
    }

    const payload = (await response.json()) as LiveOcrResponse;
    const rawText = payload.rawText ?? payload.text ?? '';
    const baseConfidence = payload.confidence ?? 0.8;

    return {
      provider: this.name,
      imageQuality: { ...DEFAULT_QUALITY, ...payload.quality },
      rawText,
      asNeededBag: /필요\s*시|증상\s*있을\s*때/.test(rawText),
      // 복용시점 보기가 여러 개 인쇄된 양식이면 값을 만들지 않고 후보만 전달한다.
      timingCandidates: parseTimingCandidates(rawText),
      groups: groupsFromRawText(rawText, baseConfidence),
      notes: rawText === '' ? ['문자를 인식하지 못했습니다. 다시 촬영하거나 직접 입력해 주세요.'] : [],
    };
  }
}
