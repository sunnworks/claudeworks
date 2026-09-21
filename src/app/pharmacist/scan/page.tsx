'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PharmacistShell } from '@/components/PharmacistShell';
import { api } from '@/lib/client/api';
import type { Session } from '@/lib/types';

type Sample = {
  sampleId: string;
  label: string;
  caseTag: string;
  description: string;
  imageRef: string;
  asNeededBag: boolean;
  qualityStatus: 'PASS' | 'REVIEW' | 'RETAKE';
};

/** P03 촬영 안내 + P04 이미지 확인 */
function ScanPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session');

  const [session, setSession] = useState<Session | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [mode, setMode] = useState<{ ocrProvider: 'mock' | 'live'; avatarProvider: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  /** 샘플 모드에서 촬영 이미지에 적용할 시연 케이스 (촬영 전에 미리 지정한다) */
  const [captureCaseId, setCaptureCaseId] = useState<string>('SAMPLE_BAG_1');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (sessionId === null) return;
    const [detail, sampleList] = await Promise.all([api.getSession(sessionId), api.samples()]);
    setSession(detail.session);
    setSamples(sampleList.samples);
    setMode(sampleList.mode);
  }, [sessionId]);

  useEffect(() => {
    void load().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : '세션을 불러오지 못했습니다.'),
    );
  }, [load]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current !== null) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setError('카메라를 사용할 수 없습니다. 사진 불러오기 또는 샘플로 체험해 주세요.');
    }
  }

  async function runOcr(body: {
    sampleId?: string;
    image?: string;
    mimeType?: string;
    sizeBytes?: number;
    imageRef: string;
    label?: string;
  }) {
    if (sessionId === null) return;
    setBusy('약봉투의 복약정보를 확인하고 있습니다');
    setError(null);
    try {
      const ocr = await api.ocr({
        sampleId: body.sampleId,
        image: body.image,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        provider: body.sampleId !== undefined ? 'mock' : mode?.ocrProvider,
      });
      await api.addBag(sessionId, { ocr, imageRef: body.imageRef, label: body.label });
      router.push(`/pharmacist/review?session=${sessionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '현재 자동인식이 어렵습니다. 다시 시도해 주세요.');
      setBusy(null);
    }
  }

  /**
   * 촬영·업로드 이미지를 처리한다.
   *
   * 라이브 OCR 모드에서는 실제 문자 인식을 수행한다.
   * 샘플 모드에서는 문자를 인식하지 않으므로 값을 만들어내지 않고,
   * 약사가 시연 케이스를 선택하면 그 케이스의 고정 OCR 결과를 사용한다.
   * 원문 이미지로는 방금 촬영한 사진을 그대로 표시한다.
   */
  async function processImage(dataUrl: string, label: string, mimeType: string, sizeBytes: number) {
    if (mode?.ocrProvider === 'live') {
      await runOcr({ image: dataUrl, mimeType, sizeBytes, imageRef: dataUrl, label });
      return;
    }
    // 샘플 모드: 촬영 이미지를 원문으로 두고 지정된 시연 케이스의 고정 OCR 결과를 적용해 바로 다음 단계로 넘어간다.
    if (captureCaseId === 'MANUAL') {
      await runOcr({ image: dataUrl, mimeType, sizeBytes, imageRef: dataUrl, label });
      return;
    }
    await runOcr({ sampleId: captureCaseId, imageRef: dataUrl, label });
  }

  function captureFromCamera() {
    const video = videoRef.current;
    if (video === null) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    void processImage(
      dataUrl,
      `촬영 약봉투 ${(session?.bags.length ?? 0) + 1}`,
      'image/jpeg',
      Math.round((dataUrl.length * 3) / 4),
    );
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      void processImage(dataUrl, file.name.slice(0, 30), file.type, file.size);
    };
    reader.readAsDataURL(file);
  }

  if (sessionId === null) {
    return (
      <PharmacistShell step="촬영" title="세션 정보가 없습니다">
        <button type="button" className="btn-primary" onClick={() => router.push('/pharmacist')}>
          대시보드로 이동
        </button>
      </PharmacistShell>
    );
  }

  return (
    <PharmacistShell
      step="촬영"
      title="약봉투 전체가 화면 안에 들어오게 촬영해 주세요"
      description="아침·점심·저녁 약봉투와 필요시약 봉투가 따로 있으면 각각 촬영해 추가할 수 있습니다."
      sessionId={sessionId}
      pharmacyName={session?.pharmacyName}
      mode={mode}
    >
      {error !== null && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          <span aria-hidden>✕</span>
          <p>{error}</p>
        </div>
      )}

      {busy !== null && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-bold text-brand-dark">
          <span aria-hidden className="animate-pulse">
            ◐
          </span>
          {busy}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 text-base font-extrabold">약봉투 촬영</h2>
          <div className="relative aspect-4/3 bg-ink">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-white/70">
                <span aria-hidden className="text-3xl">
                  📷
                </span>
                <p>카메라를 켜면 촬영 가이드가 표시됩니다.</p>
              </div>
            )}
            {/* 문서 영역 가이드 */}
            <div aria-hidden className="pointer-events-none absolute inset-6 rounded-xl border-4 border-dashed border-white/70" />
          </div>
          {mode?.ocrProvider === 'mock' && (
            <div className="border-t border-line bg-brand-soft/40 px-4 py-3">
              <label htmlFor="capture-case" className="text-sm font-bold">
                촬영 이미지에 적용할 시연 케이스
              </label>
              <select
                id="capture-case"
                className="field-input mt-1.5"
                value={captureCaseId}
                onChange={(event) => setCaptureCaseId(event.target.value)}
              >
                {samples.map((sample) => (
                  <option key={sample.sampleId} value={sample.sampleId}>
                    {sample.caseTag} · {sample.description}
                  </option>
                ))}
                <option value="MANUAL">케이스 없이 약사가 직접 입력</option>
              </select>
              <p className="mt-1.5 text-xs leading-5 text-ink-soft">
                인쇄한 시연용 약봉투를 촬영하면 방금 찍은 사진이 원문 이미지로 들어가고, 위 케이스의 고정 OCR
                결과가 적용되어 바로 검토 화면으로 넘어갑니다.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 p-4">
            {cameraOn ? (
              <>
                <button type="button" className="btn-primary flex-1" onClick={captureFromCamera} disabled={busy !== null}>
                  <span aria-hidden>●</span> 약봉투 촬영하기
                </button>
                <button type="button" className="btn-secondary" onClick={stopCamera}>
                  카메라 끄기
                </button>
              </>
            ) : (
              <button type="button" className="btn-primary flex-1" onClick={() => void startCamera()} disabled={busy !== null}>
                <span aria-hidden>📷</span> 카메라 켜기
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileRef.current?.click()}
              disabled={busy !== null}
            >
              사진 불러오기
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file !== undefined) handleFile(file);
                event.target.value = '';
              }}
            />
          </div>
          <p className="border-t border-line px-4 py-3 text-xs leading-5 text-ink-soft">
            촬영 이미지는 서버 메모리에서만 처리하고 안내 완료 시 폐기합니다. 환자명 영역은 검토화면에서 마스킹해
            표시합니다.
            {mode?.ocrProvider === 'mock' && (
              <>
                <br />
                현재 OCR은 <b>샘플 모드</b>입니다. 업로드 이미지의 문자는 인식하지 않습니다. 실제 약봉투 없이
                시연할 때는 오른쪽의 <b>시연 케이스</b>를 선택하세요. 촬영 동작까지 보여주려면{' '}
                <Link href="/print/samples" target="_blank" className="font-bold text-brand underline">
                  시연용 약봉투 인쇄
                </Link>
                물을 촬영한 뒤 케이스를 선택하면 됩니다. 실제 문자 인식은 <b>라이브 OCR 모드</b>에서 동작합니다.
              </>
            )}
          </p>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-base font-extrabold">시연 케이스 선택</h2>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              질환 이름은 시연 분류용 태그입니다. 복약정보는 각 케이스의 약봉투 OCR 결과만 사용하며, 질환으로
              복용법을 추정하지 않습니다.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {samples.map((sample) => (
              <li key={sample.sampleId} className="flex items-center gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sample.imageRef}
                  alt=""
                  className="h-20 w-28 flex-none rounded-lg border border-line object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    <span className="chip mr-1 bg-brand-soft text-brand-dark">{sample.caseTag}</span>
                    {sample.label}
                  </p>
                  <p className="text-xs text-ink-soft">{sample.description}</p>
                  <div className="mt-1 flex gap-1">
                    {sample.qualityStatus !== 'PASS' && (
                      <span
                        className={`chip ${sample.qualityStatus === 'RETAKE' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'}`}
                      >
                        <span aria-hidden>{sample.qualityStatus === 'RETAKE' ? '✕' : '!'}</span>
                        {sample.qualityStatus === 'RETAKE' ? '재촬영 대상' : '품질 확인'}
                      </span>
                    )}
                    {sample.asNeededBag && <span className="chip bg-brand-soft text-brand-dark">필요시약</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary min-h-11 flex-none px-4 text-sm"
                  disabled={busy !== null}
                  onClick={() =>
                    void runOcr({ sampleId: sample.sampleId, imageRef: sample.imageRef, label: sample.label })
                  }
                >
                  이 케이스로 시연
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {session !== null && session.bags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-sm font-bold">
            이 세션에 약봉투 {session.bags.length}장이 등록되어 있습니다.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push(`/pharmacist/review?session=${sessionId}`)}
          >
            인식 결과 검토로 이동
          </button>
        </div>
      )}
    </PharmacistShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">불러오는 중…</div>}>
      <ScanPage />
    </Suspense>
  );
}
