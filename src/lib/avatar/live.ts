/**
 * KLcube 아바타 API 어댑터 — 설계서 14 5 / 부록 C 9.
 *
 * 실제 연동에 필요한 작업을 이 파일 한 곳에 모아 둔다.
 *
 * TODO(KLcube 아바타 연동):
 *   1. 엔드포인트와 인증 방식 확정 (AVATAR_API_URL / AVATAR_API_KEY)
 *   2. 출력 형식 확정: 영상(mp4) / 애니메이션 시퀀스 / GLB — playbackType에 매핑 (부록 C 2)
 *   3. 글로스·슬롯 스키마를 KLcube 엔진 규격에 맞춰 변환
 *   4. 문장 단위 타임코드(segments)를 응답에서 받아 자막 동기화에 사용
 *   5. 생성 실패 시 자막만 자동 재생하지 않고 약사에게 실패를 알린다 (설계서 12 3)
 */

import { nowIso } from '@/lib/clock';
import { serverConfig } from '@/lib/config';
import { nextId } from '@/lib/store';
import type { AvatarJob, AvatarJobStatus } from '@/lib/types';
import type { AvatarProvider, AvatarRequest } from './provider';

interface LiveAvatarResponse {
  jobId?: string;
  status?: AvatarJobStatus;
  playbackType?: 'sequence' | 'video';
  playbackUrl?: string;
  segments?: { cardId: string; durationMs: number; gloss?: string[]; playbackUrl?: string }[];
}

export class LiveAvatarProvider implements AvatarProvider {
  readonly name = 'klcube-live';

  async createJob(request: AvatarRequest): Promise<AvatarJob> {
    if (serverConfig.avatarApiUrl === '') {
      throw new Error('AVATAR_API_URL이 설정되지 않았습니다. 아바타 샘플 모드로 시연해 주세요.');
    }

    const response = await fetch(`${serverConfig.avatarApiUrl.replace(/\/$/, '')}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(serverConfig.avatarApiKey === '' ? {} : { Authorization: `Bearer ${serverConfig.avatarApiKey}` }),
      },
      body: JSON.stringify({
        contentVersion: request.contentVersion,
        language: request.language,
        cards: request.cards.map((card) => ({
          templateId: card.templateId,
          slots: card.slots,
          gloss: card.gloss,
          subtitle: card.subtitle,
        })),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`아바타 생성 서비스 오류 (${response.status})`);
    }

    const payload = (await response.json()) as LiveAvatarResponse;
    return {
      jobId: payload.jobId ?? nextId('AVATAR_JOB'),
      sessionId: request.sessionId,
      contentVersion: request.contentVersion,
      language: request.language,
      status: payload.status ?? 'RENDERING',
      playbackType: payload.playbackType ?? 'video',
      playbackUrl: payload.playbackUrl ?? null,
      segments: (payload.segments ?? []).map((segment) => ({
        cardId: segment.cardId,
        durationMs: segment.durationMs,
        gloss: segment.gloss ?? [],
        playbackUrl: segment.playbackUrl ?? null,
      })),
      provider: this.name,
      cached: false,
      createdAt: nowIso(),
      readyAt: payload.status === 'READY' ? nowIso() : null,
      error: null,
    };
  }

  async getJob(jobId: string): Promise<AvatarJob | null> {
    if (serverConfig.avatarApiUrl === '') return null;
    const response = await fetch(`${serverConfig.avatarApiUrl.replace(/\/$/, '')}/jobs/${jobId}`, {
      headers: serverConfig.avatarApiKey === '' ? {} : { Authorization: `Bearer ${serverConfig.avatarApiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as LiveAvatarResponse;
    return {
      jobId,
      sessionId: '',
      contentVersion: '',
      language: 'KSL',
      status: payload.status ?? 'RENDERING',
      playbackType: payload.playbackType ?? 'video',
      playbackUrl: payload.playbackUrl ?? null,
      segments: (payload.segments ?? []).map((segment) => ({
        cardId: segment.cardId,
        durationMs: segment.durationMs,
        gloss: segment.gloss ?? [],
        playbackUrl: segment.playbackUrl ?? null,
      })),
      provider: this.name,
      cached: false,
      createdAt: nowIso(),
      readyAt: payload.status === 'READY' ? nowIso() : null,
      error: null,
    };
  }
}
