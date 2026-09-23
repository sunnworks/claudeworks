import { useCallback, useEffect, useRef, useState } from 'react';
import { APPROVED_SIGN_ASSETS, pickRandomSample, resolveSignVideoUrl } from '../data/signAssets';
import { useSignVideo } from './SignVideoContext';

const SPEEDS = [1, 0.75, 0.5];
/** 영상이 시작도 실패도 하지 않을 때 순서를 넘기는 시간 */
const STALL_TIMEOUT_MS = 5000;
/** 재생에 실패했을 때 다음 순서로 넘어가는 시간 */
const FAIL_ADVANCE_MS = 1500;

/**
 * 수어영상 패널. 모든 화면에 같은 자리에서 나타난다.
 *
 * 영상 요소는 한 번만 만들고 src 만 바꾼다.
 * 요소를 매번 새로 만들면 재생 요청이 서로를 끊어 'play() interrupted' 오류가 나고
 * 순서 재생이 중간에 멈춘다.
 */
export function SignVideoPanel() {
  const {
    request,
    advance,
    position,
    autoPlay,
    setAutoPlay,
    autoSequence,
    setAutoSequence,
    zoom,
    setZoom,
    showCaption,
    setShowCaption,
  } = useSignVideo();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sampleIdRef = useRef<string | undefined>(undefined);
  const [sampleId, setSampleId] = useState('');
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 아래 effect 가 설정 변경 때문에 다시 돌지 않도록 ref 로 읽는다.
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  const approvedFile = request.signAssetId ? APPROVED_SIGN_ASSETS[request.signAssetId] : undefined;

  /** 재생을 시도한다. 실패해도 오류 화면으로 바꾸지 않는다(다른 재생이 끼어든 것일 수 있다). */
  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rateRef.current;
    void video.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, []);

  // 보여 줄 내용이 바뀌면 샘플을 새로 고르고 같은 영상 요소의 src 만 바꾼다.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const next = approvedFile
      ? { id: 'approved', fileName: approvedFile }
      : pickRandomSample(sampleIdRef.current);
    sampleIdRef.current = next.id;
    setSampleId(next.id);
    setFailed(false);
    setPlaying(false);

    video.src = resolveSignVideoUrl(next.fileName);
    video.load();

    if (!autoPlayRef.current && !request.explicit) return;

    const onCanPlay = () => startPlayback();
    video.addEventListener('canplay', onCanPlay, { once: true });
    return () => video.removeEventListener('canplay', onCanPlay);
  }, [request.key, request.explicit, approvedFile, startPlayback]);

  // 영상을 못 불러오면 순서가 멈추지 않도록 잠시 뒤 다음으로 넘어간다.
  useEffect(() => {
    if (!failed || !autoPlay || !autoSequence) return;
    const timer = window.setTimeout(() => advance(), FAIL_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [failed, request.key, autoPlay, autoSequence, advance]);

  // 시작도 실패도 하지 않고 멈춰 있으면 다음으로 넘어간다.
  useEffect(() => {
    if (playing || failed || !autoPlay || !autoSequence) return;
    const timer = window.setTimeout(() => advance(), STALL_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [playing, failed, request.key, autoPlay, autoSequence, advance]);

  const pause = () => {
    videoRef.current?.pause();
    setPlaying(false);
  };

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.currentTime = 0;
    } catch {
      // 메타데이터를 아직 못 읽었으면 그냥 재생한다.
    }
    startPlayback();
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
    <section className="sign-panel" aria-label="수어영상" data-sample={sampleId}>
      <div className="sign-panel__stage">
        <div className={`sign-panel__frame${zoom ? ' sign-panel__frame--zoom' : ''}`}>
          <video
            ref={videoRef}
            playsInline
            preload="auto"
            muted
            hidden={failed}
            onEnded={() => {
              setPlaying(false);
              advance();
            }}
            onPlaying={() => {
              setPlaying(true);
              setFailed(false);
            }}
            onError={(event) => {
              // src 를 바꾸는 중에 나는 중단은 오류가 아니다. 실제 오류일 때만 대체화면을 보여 준다.
              if (event.currentTarget.error) setFailed(true);
            }}
            aria-label={`${request.kind} 수어영상`}
          />

          {failed && <p className="sign-panel__fallback">영상을 보여 드리지 못했습니다.</p>}

          {/* 지금 몇 번째를 보여 주는지 점으로 알린다. 영상 위에 얹어 화면 높이를 쓰지 않는다. */}
          {position.total > 1 && (
            <div className="sign-panel__steps">
              <span className="visually-hidden">
                수어로 보여 주는 순서 {position.index} / {position.total}
              </span>
              {Array.from({ length: position.total }, (_, order) => (
                <span
                  key={order}
                  aria-hidden="true"
                  className={`sign-panel__step${order + 1 === position.index ? ' sign-panel__step--on' : ''}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* 자막은 영상 바로 아래에 붙인다. 지금 무엇을 보여 주는지 언제나 알 수 있어야 한다. */}
        {showCaption && <p className="sign-panel__subtitle">{request.caption}</p>}
      </div>

      <div className="sign-panel__bar">
        {playing ? (
          <button type="button" className="vbtn" onClick={pause}>
            정지
          </button>
        ) : (
          <button type="button" className="vbtn vbtn--play" onClick={startPlayback}>
            재생
          </button>
        )}
        <button type="button" className="vbtn" onClick={replay}>
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
        <button type="button" className="vbtn" onClick={fullscreen}>
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
          <button type="button" className="vbtn" onClick={() => setAutoPlay(!autoPlay)} aria-pressed={autoPlay}>
            자동재생 {autoPlay ? '끄기' : '켜기'}
          </button>
          <button
            type="button"
            className="vbtn"
            onClick={() => setAutoSequence(!autoSequence)}
            aria-pressed={autoSequence}
          >
            순서대로 보여주기 {autoSequence ? '끄기' : '켜기'}
          </button>
        </div>
      )}
    </section>
  );
}
