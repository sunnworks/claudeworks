'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { DemoBanner } from './DemoBanner';
import { Stepper } from './Stepper';
import type { PharmacistStep } from '@/lib/state';

/** 약사 화면 공통 프레임 — 진행단계와 세션 정보를 항상 노출한다 (설계서 9 1) */
export function PharmacistShell({
  step,
  title,
  description,
  sessionId,
  pharmacyName,
  mode,
  children,
  footer,
}: {
  step: PharmacistStep;
  title: string;
  description?: string;
  sessionId?: string | null;
  pharmacyName?: string;
  mode?: { ocrProvider: string; avatarProvider: string } | null;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link href="/pharmacist" className="text-base font-extrabold text-brand">
              수어 복약지도
            </Link>
            {pharmacyName !== undefined && (
              <span className="text-sm font-bold text-ink-soft">{pharmacyName}</span>
            )}
            <DemoBanner compact />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
            {mode != null && (
              <>
                <span className="chip bg-canvas text-ink-soft">OCR {mode.ocrProvider}</span>
                <span className="chip bg-canvas text-ink-soft">아바타 {mode.avatarProvider}</span>
              </>
            )}
            {sessionId != null && <span className="font-mono">{sessionId}</span>}
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-2.5">
          <Stepper current={step} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-extrabold">{title}</h1>
          {description !== undefined && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        </div>
        {children}
      </main>

      {footer !== undefined && (
        <footer className="sticky bottom-0 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2">{footer}</div>
        </footer>
      )}
    </div>
  );
}
