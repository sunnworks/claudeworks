'use client';

/** 데모 API 클라이언트 — 모든 OCR·아바타 호출은 서버 라우트를 경유한다. */

import type { AvatarJob, PatientPayload, Session, ValidationIssue } from '@/lib/types';
import type { OCRResult } from '@/lib/ocr/provider';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `요청이 실패했습니다 (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export interface SessionResponse {
  session: Session;
  issues?: ValidationIssue[];
  step?: string;
}

export const api = {
  createSession: () => request<Session>('/api/sessions', { method: 'POST', body: '{}' }),

  listSessions: () =>
    request<{
      sessions: {
        sessionId: string;
        status: Session['status'];
        pharmacyName: string;
        createdAt: string;
        updatedAt: string;
        bagCount: number;
        deviceCode: string;
      }[];
    }>('/api/sessions'),

  getSession: (id: string) => request<SessionResponse>(`/api/sessions/${id}`),

  samples: () =>
    request<{
      samples: {
        sampleId: string;
        label: string;
        caseTag: string;
        description: string;
        imageRef: string;
        asNeededBag: boolean;
        qualityStatus: 'PASS' | 'REVIEW' | 'RETAKE';
      }[];
      mode: {
        demoMode: boolean;
        ocrProvider: 'mock' | 'live';
        avatarProvider: 'mock' | 'live';
        qrTtlHours: number;
        sessionImagePersist: boolean;
      };
    }>('/api/samples'),

  ocr: (body: {
    sampleId?: string;
    image?: string;
    mimeType?: string;
    sizeBytes?: number;
    provider?: 'mock' | 'live';
  }) =>
    request<OCRResult & { mode: string; demoMode: boolean }>('/api/ocr', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  addBag: (id: string, body: { ocr: OCRResult; imageRef: string; label?: string }) =>
    request<SessionResponse>(`/api/sessions/${id}/bags`, { method: 'POST', body: JSON.stringify(body) }),

  patchMedications: (
    id: string,
    body: {
      updates?: { groupId: string; field: string; value: string | number | boolean | null }[];
      notes?: { groupId: string; note: string | null }[];
      cautions?: { groupId: string; cautionIds: string[] }[];
      verify?: { groupId: string; fields: string[] }[];
      finalizeReview?: boolean;
    },
  ) =>
    request<SessionResponse>(`/api/sessions/${id}/medications`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  compose: (id: string) => request<SessionResponse>(`/api/sessions/${id}/compose`, { method: 'POST' }),

  patchCards: (
    id: string,
    body: {
      changes?: { cardId: string; selected?: boolean; order?: number; displayText?: string }[];
      addText?: string;
    },
  ) => request<SessionResponse>(`/api/sessions/${id}/cards`, { method: 'PATCH', body: JSON.stringify(body) }),

  approve: (id: string, checks: Record<string, boolean>) =>
    request<{ session: Session; avatarJob: AvatarJob | null }>(`/api/sessions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ checks }),
    }),

  revokeApproval: (id: string) =>
    request<SessionResponse>(`/api/sessions/${id}/approve`, { method: 'DELETE' }),

  patient: (id: string) => request<PatientPayload>(`/api/sessions/${id}/patient`),

  reaction: (
    id: string,
    body: { type: string; questionType?: string | null; cardId?: string | null; playbackRate?: number },
  ) => request<SessionResponse>(`/api/sessions/${id}/reactions`, { method: 'POST', body: JSON.stringify(body) }),

  resolveQuestion: (id: string, body: { reactionId: string; cardId: string | null }) =>
    request<SessionResponse>(`/api/sessions/${id}/reactions`, { method: 'PATCH', body: JSON.stringify(body) }),

  complete: (id: string) =>
    request<{
      session: Session;
      token: string;
      shareUrl: string;
      issuedAt: string;
      expiresAt: string;
      expiryLabel: string;
    }>(`/api/sessions/${id}/complete`, { method: 'POST' }),

  shareStatus: (shareId: string) =>
    request<{
      shareId: string;
      status: string;
      issuedAt: string;
      expiresAt: string;
      accessCount: number;
      purgedAt: string | null;
      contentPurged: boolean;
      sourceImageStored: boolean;
      patientIdentifiers: null;
    }>(`/api/shares/${shareId}`),

  revokeShare: (shareId: string) =>
    request<{ revoked: boolean; purged: string[] }>(`/api/shares/${shareId}`, { method: 'DELETE' }),

  advanceClock: (hours: number) =>
    request<{ enabled: boolean; offsetHours: number; purged?: string[] }>('/api/demo/clock', {
      method: 'POST',
      body: JSON.stringify({ advanceHours: hours }),
    }),

  resetClock: () =>
    request<{ enabled: boolean; offsetHours: number }>('/api/demo/clock', {
      method: 'POST',
      body: JSON.stringify({ reset: true }),
    }),

  clock: () => request<{ enabled: boolean; offsetHours: number }>('/api/demo/clock'),
};
