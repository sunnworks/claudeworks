import { useSignVideo, type SignKind } from './SignVideoContext';

interface Props {
  /** 수어로 보여줄 문구. 자막으로도 그대로 표시된다. */
  label: string;
  kind?: SignKind;
  signAssetId?: string;
  className?: string;
}

/** 어떤 문구든 그 자리에서 수어영상으로 볼 수 있게 하는 버튼. */
export function SignButton({ label, kind = '선택지', signAssetId, className }: Props) {
  const { play } = useSignVideo();
  return (
    <button
      type="button"
      className={className ?? 'sign-btn'}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        play(label, kind, signAssetId);
      }}
      aria-label={`${label} 수어영상 보기`}
    >
      수어
    </button>
  );
}
