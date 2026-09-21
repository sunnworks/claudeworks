/**
 * 데모용 수어 아바타 샘플 영상.
 *
 * 주의: 이 영상들은 서비스 느낌을 보여주기 위한 샘플이며 자막 내용과 일치하지 않는다.
 * 실제 서비스에서는 KLcube 아바타 API가 승인 문장과 슬롯에 맞는 수어를 생성한다
 * (설계서 12 3 / 13 4 아바타 API 모드).
 */

export interface SampleSignClip {
  clipId: string;
  url: string;
  durationMs: number;
}

/** durationMs는 파일의 mvhd 재생시간에서 읽은 실제 길이다. */
export const SAMPLE_SIGN_CLIPS: SampleSignClip[] = [
  { clipId: 'SIGN_SAMPLE_1', url: '/avatar-samples/sign-1.mp4', durationMs: 10_230 },
  { clipId: 'SIGN_SAMPLE_2', url: '/avatar-samples/sign-2.mp4', durationMs: 9_500 },
  { clipId: 'SIGN_SAMPLE_3', url: '/avatar-samples/sign-3.mp4', durationMs: 8_170 },
  { clipId: 'SIGN_SAMPLE_4', url: '/avatar-samples/sign-4.mp4', durationMs: 9_800 },
  { clipId: 'SIGN_SAMPLE_5', url: '/avatar-samples/sign-5.mp4', durationMs: 10_670 },
];

/** 환자에게 보여줄 안내 문구 — 샘플 영상임을 화면에 명시한다 */
export const SAMPLE_CLIP_NOTICE =
  '※ 이 수어 영상은 데모용 샘플입니다. 자막 내용과 일치하지 않습니다.';

/**
 * 문장마다 샘플 영상을 무작위로 배정한다.
 * 같은 문장이 연속으로 같은 영상을 쓰지 않도록 직전 클립을 피한다.
 */
export function assignSampleClips(count: number): SampleSignClip[] {
  const clips: SampleSignClip[] = [];
  let previousIndex = -1;
  for (let index = 0; index < count; index += 1) {
    let pick = Math.floor(Math.random() * SAMPLE_SIGN_CLIPS.length);
    if (SAMPLE_SIGN_CLIPS.length > 1 && pick === previousIndex) {
      pick = (pick + 1) % SAMPLE_SIGN_CLIPS.length;
    }
    previousIndex = pick;
    clips.push(SAMPLE_SIGN_CLIPS[pick]!);
  }
  return clips;
}
