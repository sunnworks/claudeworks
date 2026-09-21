'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * QR 표시 — 주소에는 환자명이나 복약정보를 넣지 않고 임의 토큰만 담는다 (설계서 8 8 2번).
 */
export function QrPanel({ url, size = 220 }: { url: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(url, { width: size, margin: 1, errorCorrectionLevel: 'M' }).then((value) => {
      if (active) setDataUrl(value);
    });
    return () => {
      active = false;
    };
  }, [url, size]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl border border-line bg-white p-3" style={{ width: size + 24, height: size + 24 }}>
        {dataUrl === null ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-soft">QR 생성 중…</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="복약안내 재열람 QR" width={size} height={size} />
        )}
      </div>
      <p className="max-w-[260px] break-all text-center font-mono text-[10px] leading-4 text-ink-soft">{url}</p>
    </div>
  );
}
