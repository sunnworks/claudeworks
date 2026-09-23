import { useState } from 'react';
import { useDisplaySettings, type FontScale } from '../state/DisplaySettings';

const FONT_OPTIONS: Array<{ value: FontScale; label: string }> = [
  { value: 'normal', label: '보통' },
  { value: 'large', label: '크게' },
  { value: 'xlarge', label: '더 크게' },
];

/**
 * 글자 크기·고대비 전환 막대. 설정은 즉시 화면 전체에 적용된다.
 * 좁은 화면에서는 접어 두어 영상과 질문이 먼저 보이게 한다.
 */
export function AccessibilityBar() {
  const { fontScale, contrast, setFontScale, setContrast } = useDisplaySettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="a11y">
      <button
        type="button"
        className="a11y__toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        글자·화면
      </button>

      <div className={`a11y-bar${open ? ' a11y-bar--open' : ''}`} role="group" aria-label="화면 보기 설정">
        <span className="a11y-bar__label" id="a11y-font-label">
          글자
        </span>
        {FONT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={fontScale === option.value}
            aria-describedby="a11y-font-label"
            onClick={() => setFontScale(option.value)}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={contrast === 'high'}
          onClick={() => setContrast(contrast === 'high' ? 'normal' : 'high')}
        >
          고대비 {contrast === 'high' ? '끄기' : '켜기'}
        </button>
      </div>
    </div>
  );
}
