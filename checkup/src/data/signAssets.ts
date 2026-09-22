/**
 * 수어영상 자산.
 *
 * 현재 데모에는 문항별로 검수 완료된 한국수어 영상이 없다. 그러므로
 * 실제 촬영된 샘플 수어영상 3편을 무작위로 재생하고, 화면에는 항상
 * '샘플 수어영상 · 이 문항의 번역본이 아님' 배지를 함께 표시한다.
 * 가짜 수어영상을 생성하지 않는다는 설계 원칙(부록 I)을 지키기 위한 처리다.
 */
export interface SignSample {
  id: string;
  fileName: string;
  label: string;
  /** <source type> 에 넣을 미디어 유형 */
  mimeType: 'video/mp4' | 'video/webm';
}

/**
 * 샘플영상 목록. 문항·선택지·안내문을 열 때마다 이 중 하나를 무작위로 재생한다.
 * mp4(H.264)와 webm(VP9)이 섞여 있어도 브라우저가 알아서 재생한다.
 */
export const SIGN_SAMPLES: SignSample[] = [
  { id: 'sample-01', fileName: 'ksl-sample-01.mp4', label: '샘플 수어영상 1', mimeType: 'video/mp4' },
  { id: 'sample-02', fileName: 'ksl-sample-02.mp4', label: '샘플 수어영상 2', mimeType: 'video/mp4' },
  { id: 'sample-03', fileName: 'ksl-sample-03.mp4', label: '샘플 수어영상 3', mimeType: 'video/mp4' },
  { id: 'sample-04', fileName: 'ksl-sample-04.webm', label: '샘플 수어영상 4', mimeType: 'video/webm' },
  { id: 'sample-05', fileName: 'ksl-sample-05.webm', label: '샘플 수어영상 5', mimeType: 'video/webm' },
  { id: 'sample-06', fileName: 'ksl-sample-06.webm', label: '샘플 수어영상 6', mimeType: 'video/webm' },
  { id: 'sample-07', fileName: 'ksl-sample-07.webm', label: '샘플 수어영상 7', mimeType: 'video/webm' },
  { id: 'sample-08', fileName: 'ksl-sample-08.webm', label: '샘플 수어영상 8', mimeType: 'video/webm' },
];

/** 파일 확장자로 미디어 유형을 정한다. */
export function mimeTypeOf(fileName: string): 'video/mp4' | 'video/webm' {
  return fileName.endsWith('.webm') ? 'video/webm' : 'video/mp4';
}

/** 문항별 승인 완료 영상이 생기면 이 표에 questionId → fileName 으로 등록한다. */
export const APPROVED_SIGN_ASSETS: Record<string, string> = {};

declare global {
  interface Window {
    /** 단일 index.html 빌드가 주입하는 base64 영상. 파일명 → data URL */
    __KSL_EMBEDDED_VIDEOS__?: Record<string, string>;
  }
}

const objectUrlCache = new Map<string, string>();

/**
 * 영상 주소를 만든다.
 * 1) 단일 index.html 빌드에서는 base64 를 Blob 주소로 바꿔 쓴다(모바일 브라우저가 거대한 data: URL 재생에 실패하는 문제 회피).
 * 2) 일반 빌드·개발 서버에서는 public 경로를 그대로 쓴다.
 */
export function resolveSignVideoUrl(fileName: string): string {
  const embedded = typeof window !== 'undefined' ? window.__KSL_EMBEDDED_VIDEOS__?.[fileName] : undefined;
  if (embedded) {
    const cached = objectUrlCache.get(fileName);
    if (cached) return cached;
    try {
      const [meta, base64] = embedded.split(',');
      const mime = meta.slice(meta.indexOf(':') + 1, meta.indexOf(';'));
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: mime || mimeTypeOf(fileName) }));
      objectUrlCache.set(fileName, url);
      return url;
    } catch {
      return embedded;
    }
  }
  const base = import.meta.env.BASE_URL ?? './';
  return `${base}${base.endsWith('/') ? '' : '/'}sign-samples/${fileName}`;
}

/** 샘플 풀에서 무작위로 한 편을 고른다. 같은 영상이 연속되지 않도록 직전 영상은 제외한다. */
export function pickRandomSample(excludeId?: string): SignSample {
  const pool = SIGN_SAMPLES.filter((sample) => sample.id !== excludeId);
  const candidates = pool.length > 0 ? pool : SIGN_SAMPLES;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
