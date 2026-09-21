import { serverConfig } from '@/lib/config';
import { LiveOCRProvider } from './live';
import { MockOCRProvider } from './mock';
import type { OCRProvider } from './provider';

/** 환경변수로 Mock OCR과 실제 OCR을 전환한다 (부록 C 10 수용기준 18) */
export function getOcrProvider(override?: 'mock' | 'live'): OCRProvider {
  const mode = override ?? serverConfig.ocrProvider;
  return mode === 'live' ? new LiveOCRProvider() : new MockOCRProvider();
}

export * from './provider';
export { SAMPLE_BAG_LIST } from './mock';
