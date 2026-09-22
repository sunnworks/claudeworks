import { useEffect, useRef, useState } from 'react';
import { APPROVED_SIGN_ASSETS, pickRandomSample, resolveSignVideoUrl, type SignSample } from '../data/signAssets';
import { useSignVideo } from './SignVideoContext';

const SPEEDS = [1, 0.75, 0.5];

/**
 * 수어영상 패널. 모든 화면에 같은 자리에서 나타난다.
 *
 * - 문항·선택지·화면 안내마다 수어영상을 재생한다.
 * - 화면이 바뀌면 자동으로 재생한다(자동재생 끄기 제공). 영상에 소리가 없어 브라우저 정책에 걸리지 않는다.
 * - 영상 영역 크기는 고정이라 문항이 바뀌어도 화면이 흔들리지 않는다.
 * - 문항별로 검수 완료된 영상이 없으므로 샘플 수어영상을 무작위로 재생하고 배지를 항상 표시한다.
 * - 재생에 실패하면 자막과 다시 시도 버튼으로 대체한다.
 */
export function SignVideoPanel() {
  const { request, autoPlay, setAutoPlay, zoom, setZoom } = useSignVideo();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [sample, setSample] = useState<SignSample>(() => pickRandomSample());
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const [failReason, setFailReason] = useState('');

  const approvedFile = request.signAssetId ? APPROVED_SIGN_ASSETS[request.signAssetId] : undefined;
  const isApproved = Boolean(approvedFile);
  const fileName = approvedFile ?? sample.fileName;

  // 문항·화면이 바뀌면 다른 샘플영상을 무작위로 고른다.
  useEffect(() => {
    setSample((previous) => pickRandomSample(previous.id));
    setFailed(false);
    setFailReason('');
    setPlaying(false);
  }, [request.key]);

  // 자동재생이 켜져 있거나, 사용자가 수어 보기를 눌러 요청했으면 재생한다.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    if (!autoPlay && !request.explicit) return;
    video.currentTime = 0;
    void video.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, [request.key, request.explicit, autoPlay, rate, fileName]);

  const play = () => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    void video.play().then(
      () => setPlaying(true),
      () => setFailed(true),
    );
  };

  const pause = () => {
    videoRef.current?.pause();
    setPlaying(false);
  };

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    play();
  };

  const toggleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];
    setRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const fullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void video.requestFullscreen?.();
  };

  const otherSample = () => {
    setSample((previous) => pickRandomSample(previous.id));
    setFailed(false);
    setFailReason('');
  };

  return (
    <section className="sign-panel" aria-label="수어영상">
      <div className="sign-panel__head">
        <span className="chip chip--muted">{request.kind} 수어</span>
        {!isApproved && (
          <span className="sign-panel__sample-badge">
            <span aria-hidden="true">●</span> 샘플영상 · 이 문항의 번역본 아님
          </span>
        )}
      </div>

      <div className={`sign-panel__frame${zoom ? ' sign-panel__frame--zoom' : ''}`}>
        {failed ? (
          <p className="sign-panel__fallback">
            수어영상을 재생할 수 없습니다.
            {failReason && (
              <>
                <br />
                {failReason}
              </>
            )}
            <br />
            아래 자막과 문항 글을 읽고 답해 주세요.
          </p>
        ) : (
          <video
            key={`${fileName}-${request.key}`}
            ref={videoRef}
            playsInline
            preload="auto"
            muted
            onEnded={() => setPlaying(false)}
            onError={(event) => {
              const code = event.currentTarget.error?.code;
              setFailReason(
                code === 4 ? '이 브라우저가 영상 형식(H.264 MP4)을 지원하지 않습니다.' : '영상을 불러오지 못했습니다.',
              );
              setFailed(true);
            }}
            aria-label={`${request.kind} 수어영상`}
          >
            <source src={resolveSignVideoUrl(fileName)} type="video/mp4" />
          </video>
        )}
      </div>

      <div className="sign-panel__controls">
        {playing ? (
          <button type="button" className="btn btn--small btn--ghost" onClick={pause}>
            정지
          </button>
        ) : (
          <button type="button" className="btn btn--small btn--primary" onClick={play} disabled={failed}>
            재생
          </button>
        )}
        <button type="button" className="btn btn--small btn--ghost" onClick={replay} disabled={failed}>
          다시보기
        </button>
        <button
          type="button"
          className="btn btn--small btn--ghost"
          onClick={toggleSpeed}
          aria-label={`재생 속도 ${rate}배속, 누르면 변경`}
        >
          {rate}배속
        </button>
        <button type="button" className="btn btn--small btn--ghost" onClick={fullscreen} disabled={failed}>
          전체화면
        </button>
      </div>

      {/* 자주 쓰지 않는 설정은 접어 둔다. 작은 화면에서 영상이 밀려 내려가지 않도록. */}
      <details className="sign-panel__settings">
        <summary>영상 설정</summary>
        <div className="sign-panel__controls">
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={() => setZoom(!zoom)}
            aria-pressed={zoom}
          >
            {zoom ? '작게 보기' : '크게 보기'}
          </button>
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={() => setAutoPlay(!autoPlay)}
            aria-pressed={autoPlay}
          >
            자동재생 {autoPlay ? '끄기' : '켜기'}
          </button>
          {!isApproved && (
            <button type="button" className="btn btn--small btn--ghost" onClick={otherSample}>
              다른 샘플영상
            </button>
          )}
          {failed && (
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                setFailReason('');
                setFailed(false);
              }}
            >
              다시 시도
            </button>
          )}
        </div>
      </details>

      <p className="sign-panel__caption">
        <strong>자막</strong>
        <br />
        {request.caption}
      </p>
    </section>
  );
}
