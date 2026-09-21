/**
 * 샘플 모드 OCR — 등록된 약봉투 이미지와 고정 OCR JSON을 사용한다.
 * 설계서 13 4 샘플 모드: 발표와 제안 시 안정적 시연을 보장한다.
 */

import { SAMPLE_BAGS, findSampleBag } from '@/lib/fixtures/bags';
import { parseBagText } from '@/lib/parser';
import type { ImageQuality } from '@/lib/types';
import type { OCRGroupResult, OCRProvider, OCRRequest, OCRResult } from './provider';

const PASS_QUALITY: ImageQuality = {
  status: 'PASS',
  blur: 0.11,
  glare: 0.06,
  cropped: false,
  rotationDeg: 0,
  messages: [],
};

/**
 * 업로드 이미지에 대한 샘플 모드 동작.
 * 실제 문자 인식을 수행하지 않으므로 값을 만들어내지 않고 빈 필드로 반환해
 * 약사 직접입력을 요구한다 (부록 C 5: 약봉투에 없는 정보는 생성하지 않는다).
 */
function emptyGroupFromUpload(): OCRGroupResult {
  const empty = { confidence: 0, originalText: '', normalizedText: '', bbox: null };
  return {
    medicineName: { value: null, ...empty },
    doseAmount: { value: null, ...empty },
    doseUnit: { value: null, ...empty },
    frequencyPerDay: { value: null, ...empty },
    durationDays: { value: null, ...empty },
    timingCode: { value: null, ...empty },
    asNeeded: { value: false, ...empty, confidence: 0.9, normalizedText: '상시 복용' },
    symptomText: null,
    cautionIds: [],
  };
}

export class MockOCRProvider implements OCRProvider {
  readonly name = 'mock';

  async recognize(request: OCRRequest): Promise<OCRResult> {
    // 샘플 OCR 목표: 1초 이내 (설계서 13 5). 시연 체감을 위해 짧은 지연만 둔다.
    await new Promise((resolve) => setTimeout(resolve, 250));

    const sample = request.sampleId !== undefined ? findSampleBag(request.sampleId) : undefined;
    if (sample !== undefined) {
      return {
        provider: this.name,
        imageQuality: sample.imageQuality,
        rawText: sample.rawText,
        asNeededBag: sample.asNeededBag,
        timingCandidates: sample.timingCandidates,
        groups: sample.groups.map((group) => ({ ...group })),
        notes: sample.imageQuality.messages,
      };
    }

    // 샘플 ID 없이 업로드된 이미지: 텍스트를 만들지 않고 약사 입력을 요구한다.
    return {
      provider: this.name,
      imageQuality: PASS_QUALITY,
      rawText: '',
      asNeededBag: false,
      timingCandidates: [],
      groups: [emptyGroupFromUpload()],
      notes: [
        '샘플 모드에서는 업로드 이미지의 문자를 인식하지 않습니다. 복약정보를 직접 입력하거나 라이브 OCR 모드로 전환해 주세요.',
      ],
    };
  }
}

/** 라이브 OCR 응답의 rawText만 있을 때 사용하는 공통 파서 진입점 */
export function groupsFromRawText(rawText: string, baseConfidence: number): OCRGroupResult[] {
  const parsed = parseBagText(rawText);
  const conf = (present: boolean): number => (present ? baseConfidence : 0);
  const names = parsed.medicineNames.join(', ');

  return [
    {
      medicineName: {
        value: names === '' ? null : names,
        confidence: conf(names !== ''),
        originalText: names,
        normalizedText: names,
        bbox: null,
      },
      doseAmount: {
        value: parsed.doseAmount?.value.amount ?? null,
        confidence: conf(parsed.doseAmount !== null),
        originalText: parsed.doseAmount?.originalText ?? '',
        normalizedText: parsed.doseAmount?.normalizedText ?? '',
        bbox: null,
      },
      doseUnit: {
        value: parsed.doseAmount?.value.unit ?? null,
        confidence: conf(parsed.doseAmount !== null),
        originalText: parsed.doseAmount?.originalText ?? '',
        normalizedText: parsed.doseAmount?.value.unit ?? '',
        bbox: null,
      },
      frequencyPerDay: {
        value: parsed.frequencyPerDay?.value ?? null,
        confidence: conf(parsed.frequencyPerDay !== null),
        originalText: parsed.frequencyPerDay?.originalText ?? '',
        normalizedText: parsed.frequencyPerDay?.normalizedText ?? '',
        bbox: null,
      },
      durationDays: {
        value: parsed.durationDays?.value ?? null,
        confidence: conf(parsed.durationDays !== null),
        originalText: parsed.durationDays?.originalText ?? '',
        normalizedText: parsed.durationDays?.normalizedText ?? '',
        bbox: null,
      },
      timingCode: {
        value: parsed.timing?.value ?? null,
        confidence: conf(parsed.timing !== null),
        originalText: parsed.timing?.originalText ?? '',
        normalizedText: parsed.timing?.normalizedText ?? '',
        bbox: null,
      },
      asNeeded: {
        value: parsed.asNeeded?.value.asNeeded ?? false,
        confidence: baseConfidence,
        originalText: parsed.asNeeded?.originalText ?? '',
        normalizedText: parsed.asNeeded?.normalizedText ?? '상시 복용',
        bbox: null,
      },
      symptomText: parsed.asNeeded?.value.symptom ?? null,
      cautionIds: parsed.cautionIds,
    },
  ];
}

export const SAMPLE_BAG_LIST = SAMPLE_BAGS.map((bag) => ({
  sampleId: bag.sampleId,
  label: bag.label,
  caseTag: bag.caseTag,
  description: bag.description,
  imageRef: bag.imageRef,
  asNeededBag: bag.asNeededBag,
  qualityStatus: bag.imageQuality.status,
}));
