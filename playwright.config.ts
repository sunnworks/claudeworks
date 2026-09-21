import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 설정 — 약사 PC와 10인치 이상 태블릿 가로화면을 대상으로 한다 (부록 C 6).
 * 사전 설치된 Chromium을 사용한다.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
    },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start -- -p 3100',
        url: 'http://127.0.0.1:3100/login',
        reuseExistingServer: true,
        timeout: 120_000,
        env: { DEMO_MODE: 'true', OCR_PROVIDER: 'mock', AVATAR_PROVIDER: 'mock' },
      },
});
