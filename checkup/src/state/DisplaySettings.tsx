import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type FontScale = 'normal' | 'large' | 'xlarge';
export type ContrastMode = 'normal' | 'high';

interface DisplaySettings {
  fontScale: FontScale;
  contrast: ContrastMode;
  setFontScale: (value: FontScale) => void;
  setContrast: (value: ContrastMode) => void;
}

const DisplayContext = createContext<DisplaySettings | undefined>(undefined);

const FONT_KEY = 'ksl-display-font';
const CONTRAST_KEY = 'ksl-display-contrast';

/** 화면 설정만 브라우저에 기억한다. 건강 답변은 어떤 저장소에도 남기지 않는다. */
function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 시크릿 모드 등 저장이 막힌 환경에서도 화면은 그대로 동작한다.
  }
}

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>(() =>
    readStored(FONT_KEY, ['normal', 'large', 'xlarge'] as const, 'normal'),
  );
  const [contrast, setContrastState] = useState<ContrastMode>(() =>
    readStored(CONTRAST_KEY, ['normal', 'high'] as const, 'normal'),
  );

  useEffect(() => {
    document.documentElement.dataset.font = fontScale;
    document.documentElement.dataset.contrast = contrast;
  }, [fontScale, contrast]);

  const setFontScale = useCallback((value: FontScale) => {
    setFontScaleState(value);
    writeStored(FONT_KEY, value);
  }, []);

  const setContrast = useCallback((value: ContrastMode) => {
    setContrastState(value);
    writeStored(CONTRAST_KEY, value);
  }, []);

  const value = useMemo(
    () => ({ fontScale, contrast, setFontScale, setContrast }),
    [fontScale, contrast, setFontScale, setContrast],
  );

  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>;
}

export function useDisplaySettings(): DisplaySettings {
  const context = useContext(DisplayContext);
  if (!context) throw new Error('DisplaySettingsProvider 안에서만 사용할 수 있습니다.');
  return context;
}
