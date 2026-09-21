'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Sample {
  sampleId: string;
  label: string;
  caseTag: string;
  description: string;
  imageRef: string;
}

/**
 * 시연용 약봉투 인쇄 페이지.
 *
 * 실제 약국 약봉투 없이 촬영 동작까지 시연하기 위한 인쇄물이다.
 * 샘플 모드에서는 촬영 후 시연 케이스를 선택하면 해당 케이스의 고정 OCR 결과가 표시되고,
 * 라이브 OCR 모드에서는 인쇄물의 문자를 실제로 인식한다.
 */
export default function PrintSamplesPage() {
  const [samples, setSamples] = useState<Sample[]>([]);

  useEffect(() => {
    void fetch('/api/samples')
      .then((response) => response.json())
      .then((data: { samples: Sample[] }) => setSamples(data.samples))
      .catch(() => undefined);
  }, []);

  return (
    <main className="mx-auto max-w-[900px] px-6 py-8 print:px-0 print:py-0">
      <header className="mb-6 print:hidden">
        <h1 className="text-2xl font-extrabold">시연용 약봉투 인쇄</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          A4 용지에 인쇄해 카운터에 놓고 촬영하면 촬영 동작까지 포함한 흐름을 시연할 수 있습니다. 샘플 모드에서는
          촬영 후 시연 케이스를 선택하고, 라이브 OCR 모드에서는 인쇄물의 문자를 실제로 인식합니다. 인쇄 배율은
          100퍼센트, 여백은 최소로 설정하세요.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            인쇄하기
          </button>
          <Link href="/pharmacist" className="btn-secondary">
            약사 화면으로
          </Link>
        </div>
        <div className="mt-3 rounded-lg border border-warn/30 bg-warn-soft px-4 py-2 text-sm font-semibold text-warn">
          <span aria-hidden>⚠</span> 인쇄물은 시연용 가상 약봉투입니다. 실제 의약품이나 처방이 아닙니다.
        </div>
      </header>

      <div className="space-y-6">
        {samples.map((sample) => (
          <section key={sample.sampleId} className="break-inside-avoid print:mb-8">
            <h2 className="mb-1.5 text-sm font-bold print:text-xs">
              {sample.caseTag} · {sample.label} · <span className="font-mono">{sample.sampleId}</span>
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sample.imageRef}
              alt={sample.label}
              className="w-full rounded-lg border border-line"
            />
            <p className="mt-1 text-xs text-ink-soft">{sample.description}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
