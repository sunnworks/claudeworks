'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DemoBanner } from '@/components/DemoBanner';

/** P01 약사 로그인 — 데모 계정만 사용한다 */
export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function signIn(userId: string, userPassword: string) {
    if (userId.trim() === '' || userPassword.trim() === '') {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    window.localStorage.setItem('demo.pharmacist', userId.trim());
    router.push('/pharmacist');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-5 py-10">
      <header className="space-y-2">
        <p className="text-sm font-bold text-brand">대한약사회 공용플랫폼 데모</p>
        <h1 className="text-3xl font-extrabold leading-snug">약봉투 OCR 기반 수어 복약지도</h1>
        <p className="text-base text-ink-soft">
          약사가 약봉투를 촬영해 복약정보를 확인하고, 승인한 내용을 농인 환자에게 수어로 안내합니다.
        </p>
      </header>

      <DemoBanner />

      <form
        className="card space-y-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          signIn(id, password);
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="pharmacist-id" className="text-sm font-bold">
            약사 아이디
          </label>
          <input
            id="pharmacist-id"
            className="field-input"
            value={id}
            autoComplete="username"
            onChange={(event) => setId(event.target.value)}
            placeholder="demo"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pharmacist-pw" className="text-sm font-bold">
            비밀번호
          </label>
          <input
            id="pharmacist-pw"
            type="password"
            className="field-input"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="demo"
          />
        </div>

        {error !== null && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-danger">
            <span aria-hidden>✕</span>
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full">
          로그인
        </button>
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => signIn('demo', 'demo')}
        >
          데모계정으로 바로 시작
        </button>
      </form>

      <p className="text-center text-xs text-ink-soft">
        데모에서는 실제 계정 인증을 수행하지 않습니다. 환자 회원가입과 환자정보 저장은 사용하지 않습니다.
      </p>
    </main>
  );
}
