import { useEffect, useRef, useState } from 'react';
import { APPROVED_SIGN_ASSETS, pickRandomSample, resolveSignVideoUrl, type SignSample } from '../data/signAssets';

export interface SignVideoRequest {
  /** 영상과 함께 보여줄 자막(공식문구 또는 선택지 문구) */
  caption: string;
  /** 무엇에 대한 영상인지 */
  kind: '문항' | '선택지' | '도움말';
  /** 값이 바뀌면 새 영상을 고른다 */
  key: string;
  /** 사용자가 버튼을 눌러 요청한 경우에만 재생을 시작한다(자동재생 금지) */
  autoPlay?: boolean;
  /** 문항별 승인 영상이 있으면 사용할 자산 ID */
  signAssetId?: string;
}

interface Props {
  request: SignVideoRequest;
}

const SPEEDS = [1, 0.75];

/**
 * 수어영상 패널.
 * - 문항별로 검수 완료된 영상이 없으므로 샘플 수어영상을 무작위로 재생하고 배지를 항상 표시한다.
 * - 자동재생하지 않으며 재생·정지·다시보기·0.75배속·전체화면을 제공한다.
 * - 재생에 실패하면 자막과 다시 시도 버튼으로 대체한다.
 */
export function SignVideoPanel({ request }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [sample, setSample] = useState<SignSample>(() => pickRandomSample());
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const [failReason, setFailReason] = useState('');

  const approvedFile = request.signAssetId ? APPROVED_SIGN_ASSETS[request.signAssetId] : undefined;
  const isApproved = Boolean(approvedFile);
  const fileName = approvedFile ?? sample.fileName;

  // 문항(또는 선택지)이 바뀌면 다른 샘플영상을 무작위로 고른다.
  useEffect(() => {
    setSample((previous) => pickRandomSample(previous.id));
    setFailed(false);
    setFailReason('');
    setPlaying(false);
  }, [request.key]);

  // 사용자가 버튼을 눌러 요청한 경우에만 재생한다.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    if (request.autoPlay) {
      void video.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    }
  }, [request.key, request.autoPlay, rate, fileName]);

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
    setPlaying(false);
  };

  return (
    <section className="sign-panel" aria-label="수어영상">
      {!isApproved && (
        <p className="sign-panel__sample-badge">
          <span aria-hidden="true">●</span> 샘플 수어영상 · 이 문항의 번역본이 아닙니다
        </p>
      )}

      <div className="sign-panel__frame">
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
            preload="metadata"
            muted
            onEnded={() => setPlaying(false)}
            onError={(event) => {
              const code = event.currentTarget.error?.code;
              setFailReason(
                code === 4
                  ? '이 브라우저가 영상 형식(H.264 MP4)을 지원하지 않습니다.'
                  : '영상을 불러오지 못했습니다.',
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

      <p className="sign-panel__caption">
        <strong>{request.kind} 자막</strong>
        <br />
        {request.caption}
      </p>
    </section>
  );
}
