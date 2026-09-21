/**
 * 아바타 샘플 모드 — 설계서 13 4 "검수된 샘플 영상 또는 로컬 애니메이션을 재생".
 *
 * 샘플 MP4가 제공되지 않은 상태이므로 playbackType은 placeholder로 두고,
 * 클라이언트의 SignAvatarPlayer가 문장별 글로스와 자막을 동기 재생한다.
 */

import { nowIso } from '@/lib/clock';
import { nextId } from '@/lib/store';
import type { AvatarJob } from '@/lib/types';
import { assignSampleClips } from './samples';
import type { AvatarProvider, AvatarRequest } from './provider';

/** 캐시된 표준 문장 모듈 — 캐시 재생은 승인 후 3초 이내 시작이 목표다 (설계서 13 5) */
const CACHED_TEMPLATES = new Set([
  'INTRO_V1',
  'DOSING_STANDARD_V1',
  'DOSE_AMOUNT_V1',
  'FREQUENCY_V1',
  'DURATION_V1',
  'TIMING_V1',
  'TIMING_MEALS_V1',
  'AS_NEEDED_V1',
  'CLOSING_V1',
]);

const jobs = new Map<string, AvatarJob>();

export class MockAvatarProvider implements AvatarProvider {
  readonly name = 'mock';

  async createJob(request: AvatarRequest): Promise<AvatarJob> {
    const allCached = request.cards.every((card) => CACHED_TEMPLATES.has(card.templateId));
    // 문장마다 데모용 샘플 수어 영상을 무작위로 배정한다.
    // 승인본에 그대로 저장되므로 환자 화면과 QR 재열람이 같은 영상 순서를 재생한다.
    const clips = assignSampleClips(request.cards.length);
    const job: AvatarJob = {
      jobId: nextId('AVATAR_JOB'),
      sessionId: request.sessionId,
      contentVersion: request.contentVersion,
      language: request.language,
      status: 'READY',
      playbackType: 'video',
      playbackUrl: clips[0]?.url ?? null,
      segments: request.cards.map((card, index) => {
        const clip = clips[index];
        return {
          cardId: card.cardId,
          durationMs: clip?.durationMs ?? 3200,
          gloss: card.gloss,
          playbackUrl: clip?.url ?? null,
        };
      }),
      provider: this.name,
      cached: allCached,
      createdAt: nowIso(),
      readyAt: nowIso(),
      error: null,
    };
    jobs.set(job.jobId, job);
    return job;
  }

  async getJob(jobId: string): Promise<AvatarJob | null> {
    return jobs.get(jobId) ?? null;
  }
}
