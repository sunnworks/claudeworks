import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type SignKind = '문항' | '선택지' | '안내' | '버튼';

export interface SignVideoRequest {
  /** 영상과 함께 보여줄 자막 */
  caption: string;
  kind: SignKind;
  /** 값이 바뀌면 새 영상을 고른다 */
  key: string;
  /** 문항별 승인 영상이 있으면 사용할 자산 ID */
  signAssetId?: string;
  /** 사용자가 버튼을 눌러 요청한 영상. 자동재생 설정과 무관하게 바로 재생한다. */
  explicit?: boolean;
}

interface SignVideoContextValue {
  request: SignVideoRequest;
  /** 화면·문항이 바뀔 때 기본 영상을 설정한다. */
  setPrimary: (request: SignVideoRequest) => void;
  /** 선택지·버튼의 수어영상을 즉시 재생한다. */
  play: (caption: string, kind?: SignKind, signAssetId?: string) => void;
  autoPlay: boolean;
  setAutoPlay: (value: boolean) => void;
  zoom: boolean;
  setZoom: (value: boolean) => void;
}

const SignVideoCtx = createContext<SignVideoContextValue | undefined>(undefined);

export function SignVideoProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<SignVideoRequest>({
    caption: '농인용 건강검진 수어 사전문진입니다.',
    kind: '안내',
    key: 'intro',
  });
  const [autoPlay, setAutoPlay] = useState(true);
  const [zoom, setZoom] = useState(true);

  const setPrimary = useCallback((next: SignVideoRequest) => {
    setRequest((previous) => (previous.key === next.key ? previous : next));
  }, []);

  const play = useCallback((caption: string, kind: SignKind = '선택지', signAssetId?: string) => {
    setRequest({ caption, kind, key: `${kind}-${caption}-${Date.now()}`, signAssetId, explicit: true });
  }, []);

  const value = useMemo(
    () => ({ request, setPrimary, play, autoPlay, setAutoPlay, zoom, setZoom }),
    [request, setPrimary, play, autoPlay, zoom],
  );

  return <SignVideoCtx.Provider value={value}>{children}</SignVideoCtx.Provider>;
}

export function useSignVideo(): SignVideoContextValue {
  const context = useContext(SignVideoCtx);
  if (!context) throw new Error('SignVideoProvider 안에서만 사용할 수 있습니다.');
  return context;
}
