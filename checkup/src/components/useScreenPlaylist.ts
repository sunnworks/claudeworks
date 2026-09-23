import { useEffect } from 'react';
import { useSignVideo, type SignKind } from './SignVideoContext';

export interface ScreenSignItem {
  caption: string;
  kind?: SignKind;
}

/**
 * 화면에 있는 문장들을 순서대로 수어로 보여 준다.
 * 제목 → 아래 항목들 순서로 이어서 재생된다.
 */
export function useScreenPlaylist(screenKey: string, items: ScreenSignItem[]) {
  const { setPlaylist } = useSignVideo();
  const signature = `${screenKey}::${items.map((item) => item.caption).join('|')}`;

  useEffect(() => {
    setPlaylist(
      items.map((item, order) => ({
        caption: item.caption,
        kind: item.kind ?? '안내',
        key: `${screenKey}-${order}`,
      })),
      signature,
    );
    // signature 가 같으면 같은 목록이므로 다시 설정하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, setPlaylist]);
}
