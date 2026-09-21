'use client';

import { PHARMACIST_STEPS, type PharmacistStep } from '@/lib/state';

/** 약사 진행단계 — 촬영, 확인, 안내구성, 승인, 완료 5단계로 고정 (부록 C 6) */
export function Stepper({ current }: { current: PharmacistStep }) {
  const currentIndex = PHARMACIST_STEPS.indexOf(current);

  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label="업무 진행단계">
      {PHARMACIST_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} className="flex items-center gap-1">
            <span
              aria-current={active ? 'step' : undefined}
              className={[
                'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold',
                active
                  ? 'bg-brand text-white'
                  : done
                    ? 'bg-ok-soft text-ok'
                    : 'bg-white text-ink-soft ring-1 ring-line',
              ].join(' ')}
            >
              <span aria-hidden>{done ? '✓' : index + 1}</span>
              {step}
            </span>
            {index < PHARMACIST_STEPS.length - 1 && (
              <span aria-hidden className="text-line">
                ›
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
