import { serverConfig } from '@/lib/config';
import { LiveAvatarProvider } from './live';
import { MockAvatarProvider } from './mock';
import type { AvatarProvider } from './provider';

/** 환경변수로 Mock Avatar와 KLcube Avatar API를 전환한다 (부록 C 10 수용기준 19) */
export function getAvatarProvider(override?: 'mock' | 'live'): AvatarProvider {
  const mode = override ?? serverConfig.avatarProvider;
  return mode === 'live' ? new LiveAvatarProvider() : new MockAvatarProvider();
}

export * from './provider';
