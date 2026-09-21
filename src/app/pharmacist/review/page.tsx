'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BagImageViewer } from '@/components/BagImageViewer';
import { ConfidenceBadge, levelOf } from '@/components/ConfidenceBadge';
import { PharmacistShell } from '@/components/PharmacistShell';
import { api } from '@/lib/client/api';
import { fieldLabel } from '@/lib/validation';
import { TIMING_CODES, TIMING_LABELS } from '@/lib/types';
import type { BBox, MedicationFieldKey, Session, ValidationIssue } from '@/lib/types';

const EDITABLE_FIELDS: MedicationFieldKey[] = [
  'medicineName',
  'doseAmount',
  'doseUnit',
  'frequencyPerDay',
  'durationDays',
  'timingCode',
];

/** P05 OCR 검토 — 원문 대조, 필드 편집, 신뢰도, 추가 촬영 */
function ReviewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session');

  const [session, setSession] = useState<Session | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [activeBagIndex, setActiveBagIndex] = useState(0);
  const [highlight, setHighlight] = useState<BBox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (sessionId === null) return;
    const detail = await api.getSession(sessionId);
    setSession(detail.session);
    setIssues(detail.issues ?? []);
  }, [sessionId]);

  useEffect(() => {
    void load().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : '세션을 불러오지 못했습니다.'),
    );
  }, [load]);

  const blocking = useMemo(() => issues.filter((issue) => issue.severity === 'BLOCKING'), [issues]);
  const warnings = useMemo(() => issues.filter((issue) => issue.severity === 'WARNING'), [issues]);
  const bag = session?.bags[activeBagIndex];

  async function patch(update: { groupId: string; field: MedicationFieldKey; value: string | number | boolean | null }) {
    if (sessionId === null) return;
    setSaving(true);
    try {
      const result = await api.patchMedications(sessionId, { updates: [update] });
      setSession(result.session);
      setIssues(result.issues ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function verifyField(groupId: string, field: MedicationFieldKey) {
    if (sessionId === null) return;
    const result = await api.patchMedications(sessionId, { verify: [{ groupId, fields: [field] }] });
    setSession(result.session);
    setIssues(result.issues ?? []);
  }

  async function proceed() {
    if (sessionId === null) return;
    setSaving(true);
    setError(null);
    try {
      await api.patchMedications(sessionId, { finalizeReview: true });
      await api.compose(sessionId);
      router.push(`/pharmacist/compose?session=${sessionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '다음 단계로 이동할 수 없습니다.');
      setSaving(false);
    }
  }

  if (sessionId === null || session === null) {
    return (
      <PharmacistShell step="확인" title="인식 결과를 불러오는 중입니다">
        {error !== null && <p className="text-sm font-semibold text-danger">{error}</p>}
      </PharmacistShell>
    );
  }

  return (
    <PharmacistShell
      step="확인"
      title="빨간색과 노란색 항목을 약봉투 원문과 비교해 주세요"
      description="값을 선택하면 약봉투 원문의 해당 영역이 강조됩니다. 모든 값은 직접 수정할 수 있습니다."
      sessionId={sessionId}
      pharmacyName={session.pharmacyName}
      footer={
        <>
          <span className="mr-auto text-sm font-bold">
            {blocking.length === 0 ? (
              <span className="text-ok">
                <span aria-hidden>✓</span> 확인이 필요한 항목이 없습니다
              </span>
            ) : (
              <span className="text-danger">
                <span aria-hidden>✕</span> 확인 필요 {blocking.length}건 · 경고 {warnings.length}건
              </span>
            )}
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push(`/pharmacist/scan?session=${sessionId}`)}
          >
            다시 촬영 · 약봉투 추가
          </button>
          <button type="button" className="btn-primary" disabled={blocking.length > 0 || saving} onClick={() => void proceed()}>
            인식내용 확인 완료
          </button>
        </>
      }
    >
      {error !== null && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          <span aria-hidden>✕</span> {error}
        </div>
      )}

      {session.bags.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {session.bags.map((item, index) => (
            <button
              key={item.bagId}
              type="button"
              onClick={() => {
                setActiveBagIndex(index);
                setHighlight(null);
              }}
              className={[
                'btn min-h-10 px-4 text-sm',
                index === activeBagIndex ? 'bg-brand text-white' : 'border-2 border-line bg-surface text-ink',
              ].join(' ')}
            >
              {item.label}
              {item.asNeededBag && <span className="text-xs">· 필요시약</span>}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {bag !== undefined && <BagImageViewer bag={bag} highlight={highlight} />}

        <div className="space-y-3">
          {bag?.groups.map((group) => (
            <section key={group.groupId} className="card p-4">
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-extrabold">
                  {group.asNeeded.value ? '필요시 복용약' : '정규 복용약'}
                </h2>
                <div className="flex gap-1">
                  {group.duplicateSuspect && (
                    <span className="chip bg-warn-soft text-warn">
                      <span aria-hidden>!</span> 중복 의심
                    </span>
                  )}
                  <label className="chip cursor-pointer bg-canvas text-ink">
                    <input
                      type="checkbox"
                      checked={group.asNeeded.value}
                      onChange={(event) => void patch({ groupId: group.groupId, field: 'asNeeded', value: event.target.checked })}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    필요시약으로 분리
                  </label>
                </div>
              </header>

              <div className="space-y-2.5">
                {EDITABLE_FIELDS.map((field) => {
                  const ocrField = group[field];
                  const level = levelOf(ocrField.confidence, ocrField.value, ocrField.verified);
                  const optional = field === 'medicineName' || field === 'doseUnit';
                  return (
                    <div
                      key={field}
                      className={[
                        'rounded-lg border-2 p-2.5',
                        level === 'LOW' || level === 'MISSING'
                          ? optional
                            ? 'border-line'
                            : 'border-danger/50 bg-danger-soft/40'
                          : level === 'REVIEW'
                            ? 'border-warn/50 bg-warn-soft/40'
                            : 'border-line',
                      ].join(' ')}
                      onFocus={() => setHighlight(ocrField.bbox)}
                      onMouseEnter={() => setHighlight(ocrField.bbox)}
                    >
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                        <label htmlFor={`${group.groupId}-${field}`} className="text-sm font-bold">
                          {fieldLabel(field)}
                          {!optional && !group.asNeeded.value && <span className="ml-1 text-danger">*</span>}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <ConfidenceBadge
                            confidence={ocrField.confidence}
                            value={ocrField.value}
                            verified={ocrField.verified}
                          />
                          {(level === 'REVIEW' || level === 'HIGH') && (
                            <button
                              type="button"
                              className="text-xs font-bold text-brand underline"
                              onClick={() => void verifyField(group.groupId, field)}
                            >
                              원문과 일치
                            </button>
                          )}
                        </div>
                      </div>

                      {field === 'timingCode' ? (
                        <select
                          id={`${group.groupId}-${field}`}
                          className="field-input"
                          value={(ocrField.value as string | null) ?? ''}
                          onChange={(event) =>
                            void patch({
                              groupId: group.groupId,
                              field,
                              value: event.target.value === '' ? null : event.target.value,
                            })
                          }
                        >
                          <option value="">복용시점 선택</option>
                          {TIMING_CODES.map((code) => (
                            <option key={code} value={code}>
                              {TIMING_LABELS[code]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`${group.groupId}-${field}`}
                          className="field-input"
                          type={field === 'doseAmount' || field === 'frequencyPerDay' || field === 'durationDays' ? 'number' : 'text'}
                          min={1}
                          inputMode={field === 'medicineName' || field === 'doseUnit' ? 'text' : 'numeric'}
                          value={ocrField.value === null || ocrField.value === false ? '' : String(ocrField.value)}
                          placeholder={ocrField.value === null ? '약봉투를 보고 직접 입력해 주세요' : ''}
                          onChange={(event) =>
                            void patch({
                              groupId: group.groupId,
                              field,
                              value: event.target.value === '' ? null : event.target.value,
                            })
                          }
                        />
                      )}

                      <p className="mt-1.5 text-xs text-ink-soft">
                        원문 <span className="font-mono">{ocrField.originalText === '' ? '-' : ocrField.originalText}</span>
                        {ocrField.normalizedText !== '' && ocrField.normalizedText !== ocrField.originalText && (
                          <> · 정규화 <span className="font-mono">{ocrField.normalizedText}</span></>
                        )}
                        {' · 출처 '}
                        {ocrField.sourceType === 'BAG_OCR' ? '약봉투 OCR' : '약사 직접입력'}
                      </p>
                    </div>
                  );
                })}

                <div>
                  <label htmlFor={`${group.groupId}-note`} className="text-sm font-bold">
                    약사 추가 메모 (선택)
                  </label>
                  <input
                    id={`${group.groupId}-note`}
                    className="field-input mt-1.5"
                    defaultValue={group.pharmacistNote ?? ''}
                    placeholder="이번 환자에게 별도로 강조할 내용"
                    onBlur={(event) => {
                      if (sessionId === null) return;
                      void api
                        .patchMedications(sessionId, {
                          notes: [{ groupId: group.groupId, note: event.target.value === '' ? null : event.target.value }],
                        })
                        .then((result) => {
                          setSession(result.session);
                          setIssues(result.issues ?? []);
                        })
                        .catch(() => undefined);
                    }}
                  />
                </div>
              </div>
            </section>
          ))}

          {issues.length > 0 && (
            <section className="card p-4">
              <h2 className="text-base font-extrabold">확인 목록</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {issues
                  .filter((issue) => issue.bagId === null || issue.bagId === bag?.bagId)
                  .map((issue, index) => (
                    <li
                      key={`${issue.code}-${issue.field ?? 'none'}-${index}`}
                      className={[
                        'flex items-start gap-1.5 rounded-lg px-3 py-2 font-semibold',
                        issue.severity === 'BLOCKING' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn',
                      ].join(' ')}
                    >
                      <span aria-hidden>{issue.severity === 'BLOCKING' ? '✕' : '!'}</span>
                      <span>
                        {issue.message}
                        <span className="ml-1 font-mono text-xs opacity-70">{issue.code}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </PharmacistShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">불러오는 중…</div>}>
      <ReviewPage />
    </Suspense>
  );
}
