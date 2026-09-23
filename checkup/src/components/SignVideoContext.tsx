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
  /** 화면이 바뀔 때 순서대로 보여줄 목록을 넣는다. 첫 번째가 바로 재생된다. */
  setPlaylist: (items: SignVideoRequest[], playlistKey: string) => void;
  /**
   * 손 모양 버튼을 눌렀을 때 그 문장을 즉시 재생한다.
   * 그 문장이 지금 순서 목록에 있으면 그 자리로 건너뛰어, 이어서 다음 문장으로 넘어간다.
   * 목록에 없으면 그 문장만 한 번 재생하고 원래 자리로 돌아온다.
   */
  play: (caption: string, kind?: SignKind, signAssetId?: string) => void;
  /** 영상이 끝났을 때 패널이 호출한다. 다음 순서로 넘어간다. */
  advance: () => void;
  /** 지금 이 문구를 수어로 보여 주는 중인가 */
  isSigning: (caption: string) => boolean;
  /** 목록에서 지금 몇 번째인지 (1부터). 목록이 없으면 0 */
  position: { index: number; total: number };
  autoPlay: boolean;
  setAutoPlay: (value: boolean) => void;
  /** 질문 → 선택지를 하나씩 이어서 보여 주기 */
  autoSequence: boolean;
  setAutoSequence: (value: boolean) => void;
  zoom: boolean;
  setZoom: (value: boolean) => void;
  showCaption: boolean;
  setShowCaption: (value: boolean) => void;
}

const SignVideoCtx = createContext<SignVideoContextValue | undefined>(undefined);

const INTRO: SignVideoRequest = {
  caption: '건강검진 문진표를 수어로 보고 직접 작성합니다.',
  kind: '안내',
  key: 'intro',
};

export function SignVideoProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylistState] = useState<SignVideoRequest[]>([INTRO]);
  const [playlistKey, setPlaylistKey] = useState('intro');
  const [index, setIndex] = useState(0);
  const [oneOff, setOneOff] = useState<SignVideoRequest | undefined>();
  // 같은 문장을 다시 눌렀을 때도 처음부터 재생되도록 하는 번호
  const [manualVersion, setManualVersion] = useState(0);
  // 손 모양 버튼으로 방금 고른 문장. 자동재생이 꺼져 있어도 이 문장만은 재생한다.
  const [manualCaption, setManualCaption] = useState<string | undefined>();
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoSequence, setAutoSequence] = useState(true);
  const [zoom, setZoom] = useState(false);
  const [showCaption, setShowCaption] = useState(true);

  const setPlaylist = useCallback(
    (items: SignVideoRequest[], nextKey: string) => {
      if (items.length === 0 || playlistKey === nextKey) return;
      setPlaylistKey(nextKey);
      setPlaylistState(items);
      setIndex(0);
      setOneOff(undefined);
      setManualVersion(0);
      setManualCaption(undefined);
    },
    [playlistKey],
  );

  const play = useCallback(
    (caption: string, kind: SignKind = '선택지', signAssetId?: string) => {
      const found = playlist.findIndex((item) => item.caption === caption);
      setManualVersion((previous) => previous + 1);
      setManualCaption(caption);
      if (found >= 0) {
        setOneOff(undefined);
        setIndex(found);
        return;
      }
      setOneOff({ caption, kind, key: `${kind}-${caption}`, signAssetId, explicit: true });
    },
    [playlist],
  );

  const advance = useCallback(() => {
    setManualCaption(undefined);
    if (oneOff) {
      setOneOff(undefined);
      return;
    }
    if (!autoSequence || !autoPlay) return;
    setIndex((previous) => (previous + 1 < playlist.length ? previous + 1 : previous));
  }, [oneOff, autoSequence, autoPlay, playlist.length]);

  const current = oneOff ?? playlist[Math.min(index, playlist.length - 1)] ?? INTRO;
  // 손 모양 버튼을 누르면 같은 문장이라도 다시 재생되도록 번호를 붙인다.
  const request: SignVideoRequest = {
    ...current,
    key: `${current.key}|${manualVersion}`,
    explicit: current.caption === manualCaption,
  };

  const isSigning = useCallback((caption: string) => request.caption === caption, [request.caption]);

  const value = useMemo(
    () => ({
      request,
      setPlaylist,
      play,
      advance,
      isSigning,
      position: { index: oneOff ? 0 : index + 1, total: oneOff ? 0 : playlist.length },
      autoPlay,
      setAutoPlay,
      autoSequence,
      setAutoSequence,
      zoom,
      setZoom,
      showCaption,
      setShowCaption,
    }),
    [
      request,
      setPlaylist,
      play,
      advance,
      isSigning,
      oneOff,
      index,
      playlist.length,
      autoPlay,
      autoSequence,
      zoom,
      showCaption,
      manualCaption,
    ],
  );

  return <SignVideoCtx.Provider value={value}>{children}</SignVideoCtx.Provider>;
}

export function useSignVideo(): SignVideoContextValue {
  const context = useContext(SignVideoCtx);
  if (!context) throw new Error('SignVideoProvider 안에서만 사용할 수 있습니다.');
  return context;
}
