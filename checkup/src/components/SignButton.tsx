import { useSignVideo, type SignKind } from './SignVideoContext';

interface Props {
  /** 수어로 보여줄 문구. 자막으로도 그대로 표시된다. */
  label: string;
  kind?: SignKind;
  signAssetId?: string;
  /** main: 문항 본문처럼 눈에 띄어야 하는 자리 · quiet: 그 외 */
  variant?: 'main' | 'quiet';
  className?: string;
}

/**
 * 어떤 문구든 그 자리에서 수어영상으로 볼 수 있게 하는 버튼.
 * 문장마다 붙기 때문에 아이콘만 두어 화면이 시끄러워지지 않게 한다.
 * 버튼 이름은 aria-label 과 title 로 전달한다.
 */
export function SignButton({ label, kind = '선택지', signAssetId, variant = 'quiet', className }: Props) {
  const { play } = useSignVideo();
  const title = `수어로 보기: ${label}`;

  return (
    <button
      type="button"
      className={className ?? `sign-btn sign-btn--${variant}`}
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        play(label, kind, signAssetId);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12.5 2.6a1.3 1.3 0 0 1 1.3 1.3v6.2h.9V2.9a1.3 1.3 0 0 1 2.6 0v7.2h.9V5.2a1.3 1.3 0 0 1 2.6 0v8.4c0 4.3-2.8 7.8-7 7.8-2.2 0-3.9-.9-5.2-2.6L4.7 14a1.3 1.3 0 0 1 1.9-1.7l1.7 1.6V5.4a1.3 1.3 0 0 1 2.6 0v4.7h.9V3.9c0-.7.6-1.3 1.3-1.3z"
          fill="currentColor"
        />
      </svg>
      <span className="visually-hidden">{title}</span>
    </button>
  );
}
