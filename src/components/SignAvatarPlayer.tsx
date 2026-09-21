'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SAMPLE_CLIP_NOTICE } from '@/lib/avatar/samples';
import { SubtitleText } from './SubtitleText';

export interface PlayerCard {
  cardId: string;
  displayText: string;
  gloss: string[];
}

export interface PlayerSegment {
  cardId: string;
  durationMs: number;
  playbackUrl?: string | null;
}

interface Props {
  cards: PlayerCard[];
  segments: PlayerSegment[];
  /** 'video' = 샘플 영상 또는 KLcube 생성 결과, 'placeholder' = 도형 플레이어 */
  playbackType: 'placeholder' | 'video' | 'sequence';
  playbackUrl: string | null;
  playbackRate: number;
  autoStart?: boolean;
  focusCardId?: string | null;
  /** 샘플 영상 안내 문구 표시 여부 */
  showSampleNotice?: boolean;
  /** 재생 제어 줄에 함께 배치할 추가 버튼 */
  extraControls?: React.ReactNode;
  onEvent?: (event: 'PLAY_STARTED' | 'PLAY_COMPLETED') => void;
}

const DEFAULT_DURATION_MS = 3200;
const TICK_MS = 100;

/** 글로스 문자열에서 결정적으로 손 위치를 만든다 (도형 플레이어용) */
function handPose(gloss: string, index: number): { x: number; y: number; r: number } {
  let hash = 0;
  for (const char of `${gloss}${index}`) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return {
    x: ((hash % 13) - 6) * 4,
    y: ((Math.floor(hash / 13) % 11) - 5) * 4,
    r: ((hash % 7) - 3) * 5,
  };
}

/**
 * 수어 아바타 플레이어.
 *
 * 문장 단위로 배정된 수어 영상을 순서대로 재생하고 자막을 동기화한다.
 * 데모에서는 샘플 영상이므로 화면에 샘플 안내 문구를 함께 표시한다 (설계서 13 4).
 * KLcube 아바타 API가 연결되면 같은 인터페이스로 생성 결과를 재생한다.
 */
export function SignAvatarPlayer({
  cards,
  segments,
  playbackType,
  playbackUrl,
  playbackRate,
  autoStart = false,
  focusCardId = null,
  showSampleNotice = true,
  extraControls,
  onEvent,
}: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoStart);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** 브라우저가 샘플 영상 코덱을 지원하지 않는 경우 도형 플레이어로 대체한다 */
  const [brokenClips, setBrokenClips] = useState<string[]>([]);

  const segmentMap = useMemo(() => new Map(segments.map((segment) => [segment.cardId, segment])), [segments]);
  const durations = useMemo(
    () => cards.map((card) => segmentMap.get(card.cardId)?.durationMs ?? DEFAULT_DURATION_MS),
    [cards, segmentMap],
  );

  const current = cards[index];
  const rate = Math.max(0.1, playbackRate);
  const duration = (durations[index] ?? DEFAULT_DURATION_MS) / rate;
  const totalMs = durations.reduce((sum, value) => sum + value, 0) / rate;
  const elapsedTotal = durations.slice(0, index).reduce((sum, value) => sum + value, 0) / rate + elapsed;

  const currentClipUrl =
    current === undefined ? null : (segmentMap.get(current.cardId)?.playbackUrl ?? playbackUrl);
  const videoBroken = currentClipUrl !== null && brokenClips.includes(currentClipUrl);
  const useVideo = playbackType === 'video' && currentClipUrl !== null && !videoBroken;

  const goNext = useCallback(() => {
    setIndex((value) => {
      if (value < cards.length - 1) {
        setElapsed(0);
        return value + 1;
      }
      setPlaying(false);
      onEvent?.('PLAY_COMPLETED');
      return value;
    });
  }, [cards.length, onEvent]);

  // 약사가 특정 문장만 다시 전송하면 해당 문장으로 이동한다 (부록 A 2 10번).
  useEffect(() => {
    if (focusCardId === null) return;
    const target = cards.findIndex((card) => card.cardId === focusCardId);
    if (target >= 0) {
      setIndex(target);
      setElapsed(0);
      setPlaying(true);
    }
  }, [focusCardId, cards]);

  // 진행률과 자막 동기화용 타이머
  useEffect(() => {
    if (!playing) return;
    if (!startedRef.current) {
      startedRef.current = true;
      onEvent?.('PLAY_STARTED');
    }
    const timer = setInterval(() => setElapsed((value) => value + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [playing, onEvent]);

  /**
   * 영상 모드에서는 영상 종료(onEnded)가 다음 문장 전환을 결정한다.
   * 영상이 멈추거나 종료 이벤트가 오지 않는 경우를 대비해 2초 여유의 안전망 타이머를 둔다.
   */
  useEffect(() => {
    if (!playing) return;
    const limit = useVideo ? duration + 2000 : duration;
    if (elapsed < limit) return;
    goNext();
  }, [useVideo, playing, elapsed, duration, goNext]);

  // 영상 재생 속도와 재생·정지 상태를 동기화한다 (천천히 보기 = 0.7배).
  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.playbackRate = rate;
    if (playing) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [playing, rate, index, currentClipUrl]);

  const restart = useCallback(() => {
    setIndex(0);
    setElapsed(0);
    setPlaying(true);
    const video = videoRef.current;
    if (video !== null) video.currentTime = 0;
  }, []);

  const glossIndex =
    current === undefined || current.gloss.length === 0
      ? 0
      : Math.min(current.gloss.length - 1, Math.floor((elapsed / duration) * current.gloss.length));
  const activeGloss = current?.gloss[glossIndex] ?? '';
  const pose = handPose(activeGloss, glossIndex);
  const finished = !playing && index === cards.length - 1 && elapsed >= duration;

  if (current === undefined) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl bg-patient-panel p-8 text-center text-xl text-white">
        승인된 안내 문장이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* 아바타 영역 — 화면의 60퍼센트 이상 (설계서 9 2) */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-patient-panel">
        {useVideo ? (
          <video
            ref={videoRef}
            key={`${current.cardId}-${currentClipUrl}`}
            src={currentClipUrl ?? undefined}
            autoPlay={playing}
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-contain"
            onEnded={() => {
              if (playing) goNext();
            }}
            onError={() => {
              if (currentClipUrl !== null) {
                setBrokenClips((value) => (value.includes(currentClipUrl) ? value : [...value, currentClipUrl]));
              }
            }}
          />
        ) : (
          <AvatarFigure pose={pose} playing={playing} durationMs={duration / Math.max(1, current.gloss.length)} />
        )}

        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <span className="chip bg-white/15 text-white">
            <span aria-hidden>🤟</span> 한국수어 안내
          </span>
          <span className="chip bg-white/15 text-white/80">
            {useVideo ? '샘플 수어영상' : '도형 플레이어'} · KLcube 아바타 연동 전
          </span>
          {videoBroken && (
            <span className="chip bg-warn-soft text-warn">
              <span aria-hidden>!</span> 이 기기에서 영상 코덱을 지원하지 않아 도형으로 표시합니다
            </span>
          )}
        </div>

        {!useVideo && (
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-1.5">
            {current.gloss.map((gloss, position) => (
              <span
                key={`${gloss}-${position}`}
                className={[
                  'rounded-lg px-2.5 py-1 text-sm font-bold transition',
                  position === glossIndex ? 'bg-white text-ink' : 'bg-white/15 text-white/70',
                ].join(' ')}
              >
                {gloss}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 샘플 영상 안내 — 실제 안내 내용과 일치하지 않음을 명시한다 */}
      {showSampleNotice && (
        <p className="flex-none px-1 text-xs leading-5 text-white/45">{SAMPLE_CLIP_NOTICE}</p>
      )}

      {/* 자막 — 하단 고정영역, 한 화면에 한 문장 (설계서 8 6) */}
      <div className="flex-none rounded-2xl bg-black/60 px-6 py-4">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-white/60">
          <span>
            {index + 1} / {cards.length} 문장
          </span>
          <span>{playing ? '재생 중' : finished ? '재생 완료' : '일시정지'}</span>
        </div>
        <SubtitleText text={current.displayText} className="text-2xl font-bold leading-relaxed text-white md:text-3xl" />
      </div>

      {/* 진행률 */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="재생 진행률">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${Math.min(100, (elapsedTotal / Math.max(1, totalMs)) * 100)}%` }}
        />
      </div>

      {/* 재생 제어 (설계서 8 6) */}
      <div className="flex flex-none flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-patient bg-white text-ink hover:bg-white/90"
          onClick={() => setPlaying((value) => !value)}
        >
          <span aria-hidden>{playing ? '⏸' : '▶'}</span>
          {playing ? '일시정지' : '재생'}
        </button>
        <button type="button" className="btn-patient bg-white/15 text-white hover:bg-white/25" onClick={restart}>
          <span aria-hidden>⏮</span> 처음부터
        </button>
        <button
          type="button"
          className="btn-patient bg-white/15 text-white hover:bg-white/25 disabled:opacity-40"
          disabled={index === 0}
          onClick={() => {
            setIndex(Math.max(0, index - 1));
            setElapsed(0);
          }}
        >
          <span aria-hidden>◀</span> 이전 문장
        </button>
        <button
          type="button"
          className="btn-patient bg-white/15 text-white hover:bg-white/25 disabled:opacity-40"
          disabled={index >= cards.length - 1}
          onClick={() => {
            setIndex(Math.min(cards.length - 1, index + 1));
            setElapsed(0);
          }}
        >
          다음 문장 <span aria-hidden>▶</span>
        </button>
        {extraControls}
      </div>
    </div>
  );
}

/** 수어 아바타 도형 플레이어 — 샘플 영상이 없을 때의 대체 표시 */
function AvatarFigure({
  pose,
  playing,
  durationMs,
}: {
  pose: { x: number; y: number; r: number };
  playing: boolean;
  durationMs: number;
}) {
  return (
    <svg viewBox="0 0 320 320" className="h-full w-full" role="img" aria-label="수어 아바타">
      <path d="M80 300 C80 235 115 205 160 205 C205 205 240 235 240 300 Z" fill="#3c5a92" />
      <rect x="148" y="150" width="24" height="30" rx="10" fill="#e8c9a8" />
      <circle cx="160" cy="118" r="44" fill="#f0d3b2" />
      <circle cx="145" cy="112" r="4.5" fill="#22303f" />
      <circle cx="175" cy="112" r="4.5" fill="#22303f" />
      <path d="M148 138 Q160 146 172 138" stroke="#22303f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <g
        className={playing ? 'sign-hand' : undefined}
        style={
          {
            '--hand-x': `${pose.x}px`,
            '--hand-y': `${pose.y}px`,
            '--hand-r': `${pose.r}deg`,
            '--hand-duration': `${Math.max(400, durationMs)}ms`,
            transformOrigin: '110px 215px',
          } as React.CSSProperties
        }
      >
        <circle cx="110" cy="215" r="20" fill="#f0d3b2" />
        <rect x="102" y="196" width="16" height="12" rx="6" fill="#f0d3b2" />
      </g>
      <g
        className={playing ? 'sign-hand' : undefined}
        style={
          {
            '--hand-x': `${-pose.x}px`,
            '--hand-y': `${pose.y * 0.8}px`,
            '--hand-r': `${-pose.r}deg`,
            '--hand-duration': `${Math.max(400, durationMs)}ms`,
            transformOrigin: '210px 215px',
          } as React.CSSProperties
        }
      >
        <circle cx="210" cy="215" r="20" fill="#f0d3b2" />
        <rect x="202" y="196" width="16" height="12" rx="6" fill="#f0d3b2" />
      </g>
    </svg>
  );
}
