/**
 * 아바타 Provider 인터페이스 — 설계서 14 5 아바타 연동 계약 초안.
 */

import type { AvatarJob, GuidanceCard } from '@/lib/types';

export interface AvatarRequestCard {
  cardId: string;
  templateId: string;
  slots: Record<string, string | number | boolean | null>;
  gloss: string[];
  subtitle: string;
}

export interface AvatarRequest {
  sessionId: string;
  contentVersion: string;
  language: 'KSL';
  cards: AvatarRequestCard[];
}

export interface AvatarProvider {
  readonly name: string;
  /** 캐시된 수어 문장이 있으면 즉시 반환하고 없으면 생성 작업을 만든다 */
  createJob(request: AvatarRequest): Promise<AvatarJob>;
  getJob(jobId: string): Promise<AvatarJob | null>;
}

export function toAvatarCards(cards: GuidanceCard[]): AvatarRequestCard[] {
  return cards
    .filter((card) => card.selected)
    .sort((a, b) => a.order - b.order)
    .map((card) => ({
      cardId: card.cardId,
      templateId: card.signPayload.templateId,
      slots: card.signPayload.slots,
      gloss: card.signPayload.gloss,
      subtitle: card.displayText,
    }));
}
