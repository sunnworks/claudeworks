import { useEffect, useRef, useState } from 'react';
import {
  APPROVED_SIGN_ASSETS,
  mimeTypeOf,
  pickRandomSample,
  resolveSignVideoUrl,
  type SignSample,
} from '../data/signAssets';
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
  const { request, autoPlay, setAutoPlay, zoom, setZoom, showCaption, setShowCaption } = useSignVideo();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [sample, setSample] = useState<SignSample>(() => pickRandomSample());
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const approvedFile = request.signAssetId ? APPROVED_SIGN_ASSETS[request.signAssetId] : undefined;
  const isApproved = Boolean(approvedFile);
  const fileName = approvedFile ?? sample.fileName;
  void isApproved;

  // 문항·화면이 바뀌면 다른 샘플영상을 무작위로 고른다.
  useEffect(() => {
    setSample((previous) => pickRandomSample(previous.id));
    setFailed(false);
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

  return (
    <section className="sign-panel" aria-label="수어영상" data-sample={isApproved ? 'approved' : sample.id}>
      <div className="sign-panel__stage">
      <div className={`sign-panel__frame${zoom ? ' sign-panel__frame--zoom' : ''}`}>
        {failed ? (
          <p className="sign-panel__fallback">영상을 보여 드리지 못했습니다.</p>
        ) : (
          <video
            key={`${fileName}-${request.key}`}
            ref={videoRef}
            playsInline
            preload="auto"
            muted
            onEnded={() => setPlaying(false)}
            onError={() => setFailed(true)}
            aria-label={`${request.kind} 수어영상`}
          >
            <source src={resolveSignVideoUrl(fileName)} type={mimeTypeOf(fileName)} />
          </video>
        )}

        {/* 자막은 영상 위에 바로 겹쳐 보여준다. 영상이 시작되기 전부터 보인다. */}
      </div>

      {/*
        자막은 영상 바로 아래에 붙인다. 영상 위에 겹치면 수어 동작을 가린다.
        문항 영상은 같은 문장이 바로 아래 질문으로 또 나오므로 자막을 겹쳐 쓰지 않는다.
        선택지·안내 영상은 지금 무엇을 보여 주는지 알 수 없으므로 반드시 자막을 붙인다.
      */}
      {showCaption && request.kind !== '문항' && (
        <p className="sign-panel__subtitle">{request.caption}</p>
      )}
      </div>

      <div className="sign-panel__bar">
        {playing ? (
          <button type="button" className="vbtn" onClick={pause}>
            정지
          </button>
        ) : (
          <button type="button" className="vbtn vbtn--play" onClick={play} disabled={failed}>
            재생
          </button>
        )}
        <button type="button" className="vbtn" onClick={replay} disabled={failed}>
          다시
        </button>
        <button
          type="button"
          className="vbtn"
          onClick={toggleSpeed}
          aria-label={`재생 속도 ${rate}배속, 누르면 바꿉니다`}
        >
          {rate}배
        </button>
        <button type="button" className="vbtn" onClick={fullscreen} disabled={failed}>
          전체화면
        </button>
        <button
          type="button"
          className="vbtn"
          aria-expanded={showSettings}
          aria-label="영상 설정"
          onClick={() => setShowSettings(!showSettings)}
        >
          설정
        </button>
      </div>

      {showSettings && (
        <div className="sign-panel__settings-row">
          <button
            type="button"
            className="vbtn"
            onClick={() => setShowCaption(!showCaption)}
            aria-pressed={showCaption}
          >
            자막 {showCaption ? '끄기' : '켜기'}
          </button>
          <button type="button" className="vbtn" onClick={() => setZoom(!zoom)} aria-pressed={zoom}>
            {zoom ? '화면 작게' : '화면 크게'}
          </button>
          <button
            type="button"
            className="vbtn"
            onClick={() => setAutoPlay(!autoPlay)}
            aria-pressed={autoPlay}
          >
            자동재생 {autoPlay ? '끄기' : '켜기'}
          </button>
          {failed && (
            <button type="button" className="vbtn" onClick={() => setFailed(false)}>
              다시 시도
            </button>
          )}
        </div>
      )}
    </section>
  );
}
