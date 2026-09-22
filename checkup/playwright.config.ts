import { defineConfig, devices } from '@playwright/test';

/** 빌드 결과(dist)를 미리보기 서버로 띄워 4개 시나리오를 끝까지 진행한다. */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
    // 이 환경에는 Chromium 이 미리 설치되어 있다. 없으면 기본 브라우저를 사용한다.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } } },
  ],
  // 빌드 결과를 검사하므로 항상 새로 빌드한 뒤 띄운다. 오래된 dist 로 테스트하는 사고를 막는다.
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
