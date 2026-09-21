import { expect, test } from '@playwright/test';

/**
 * 부록 A 2 기본 시나리오 전체 흐름 E2E.
 * 로그인 → 샘플 약봉투 → OCR 검토 → 안내구성 → 승인 → 환자 재생 → 질문 → 완료 → QR → 만료
 */

test.describe.configure({ mode: 'serial' });

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '데모계정으로 바로 시작' }).click();
  await expect(page.getByRole('heading', { name: /새 수어 복약안내를 시작합니다/ })).toBeVisible();
}

async function startWithSample(page: import('@playwright/test').Page, sampleLabel: RegExp) {
  await page.getByRole('button', { name: '새 복약안내 시작' }).click();
  await expect(page.getByRole('heading', { name: /약봉투 전체가 화면 안에/ })).toBeVisible();
  const row = page.locator('li', { has: page.getByText(sampleLabel) }).first();
  await row.getByRole('button', { name: '이 케이스로 시연' }).click();
  await expect(page.getByRole('heading', { name: /빨간색과 노란색 항목/ })).toBeVisible({ timeout: 20_000 });
}


async function approveAll(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: /환자에게 안내할 문장을 최종 확인/ })).toBeVisible();
  await page.getByRole('button', { name: '수어 안내 승인으로 이동' }).click();

  const checkSection = page.locator('section', { hasText: '약사 확인 체크' });
  await expect(checkSection).toBeVisible();
  const approveButton = checkSection.getByRole('button', { name: /수어 안내 승인$/ });
  await expect(approveButton).toBeDisabled();
  for (const checkbox of await checkSection.getByRole('checkbox').all()) {
    await checkbox.check();
  }
  await expect(approveButton).toBeEnabled();
  await approveButton.click();
  await expect(page.getByText(/승인 완료/).first()).toBeVisible({ timeout: 20_000 });
}

test('T01 T04 T08 T09 T10 T11 기본 시연 시나리오와 48시간 QR', async ({ page }) => {
  // 데모 시계를 초기화한다.
  await page.request.post('/api/demo/clock', { data: { reset: true } });

  await login(page);
  await startWithSample(page, /정규 복용약/);

  // OCR 결과가 표시된다.
  await expect(page.getByRole('spinbutton', { name: /1회 복용량/ })).toHaveValue('1');
  await expect(page.getByRole('spinbutton', { name: /1일 복용횟수/ })).toHaveValue('3');
  await expect(page.getByRole('combobox', { name: /복용시점/ })).toHaveValue('AFTER_MEAL_30');

  // 복용기간 신뢰도 0.82는 노란색 주의로 표시된다 (부록 A 2 4번).
  await expect(page.getByText('주의0.82').first()).toBeVisible();

  // 필요시약 봉투를 추가한다 (T04).
  await page.getByRole('button', { name: '다시 촬영 · 약봉투 추가' }).click();
  const asNeeded = page.locator('li', { has: page.getByText(/필요시약$/) }).first();
  await asNeeded.getByRole('button', { name: '이 케이스로 시연' }).click();
  await expect(page.getByRole('heading', { name: /빨간색과 노란색 항목/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /약봉투 2/ })).toBeVisible();

  // 검토 완료 → 안내카드 구성
  await page.getByRole('button', { name: '인식내용 확인 완료' }).click();
  await expect(page.getByRole('heading', { name: /환자에게 안내할 문장을 최종 확인/ })).toBeVisible();
  await expect(page.getByText('하루 3번, 한 번에 1포씩, 3일 동안 드세요.').first()).toBeVisible();
  await expect(page.getByText('아침, 점심, 저녁 식사 후 30분에 드세요.').first()).toBeVisible();
  await expect(page.getByText(/통증이 있을 때만/).first()).toBeVisible();

  // 승인 화면: 체크 5개를 모두 완료해야 승인 버튼이 활성화된다.
  await approveAll(page);
  await expect(page.getByText(/샘플 수어영상/).first()).toBeVisible();

  // 환자 화면 (같은 태블릿 전환)
  await page.getByRole('button', { name: /환자 화면 보여주기/ }).click();
  await expect(page.getByRole('heading', { name: '약 먹는 방법을 수어로 안내합니다' })).toBeVisible();
  await page.getByRole('button', { name: '안내 시작' }).click();

  // 수어 재생 화면이 열리고 자막이 함께 표시된다 (T08).
  // 재생 자산은 브라우저 코덱 지원에 따라 video 또는 도형 플레이어로 표시된다.
  await expect(page.locator('video, svg[aria-label="수어 아바타"]').first()).toBeVisible();
  await expect(page.getByText('지금부터 약을 먹는 방법을 안내하겠습니다.').first()).toBeVisible();
  await expect(page.getByText('※ 이 수어 영상은 데모용 샘플입니다. 자막 내용과 일치하지 않습니다.')).toBeVisible();

  // 이해 확인 화면에서 질문을 전달한다 (T09).
  await page.getByRole('button', { name: /안내 확인/ }).click();
  await page.getByRole('button', { name: '언제 먹나요' }).click();
  await expect(page.getByRole('heading', { name: '약사에게 질문을 전달했습니다' })).toBeVisible();

  // 약사 화면에 질문이 표시된다.
  await page.getByRole('link', { name: '약사 화면으로' }).click();
  await expect(page.getByText(/대응 필요 1건/)).toBeVisible({ timeout: 10_000 });

  // 완료 → 48시간 QR 발급 (T10)
  await page.getByRole('button', { name: '안내완료 · 48시간 QR 발급' }).click();
  await expect(page.getByText('이 QR은 발급 후 48시간 동안 다시 볼 수 있습니다.')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/까지 볼 수 있습니다/).first()).toBeVisible();
  await expect(page.getByText('폐기 완료').first()).toBeVisible();

  // QR 주소에 복약정보가 노출되지 않는다.
  const shareUrl = (await page.locator('p.font-mono').first().innerText()).trim();
  expect(shareUrl).toContain('/r/');
  expect(shareUrl).not.toMatch(/포|정|식후|김/);

  // T11 48시간 이내 재열람: 같은 승인본이 재생된다.
  await page.goto(shareUrl);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
  await expect(page.getByText('지금부터 약을 먹는 방법을 안내하겠습니다.').first()).toBeVisible();
  await expect(page.locator('video, svg[aria-label="수어 아바타"]').first()).toBeVisible();

  // T12 48시간 경과: 복약정보 없이 만료 안내만 표시된다.
  await page.request.post('/api/demo/clock', { data: { advanceHours: 48 } });
  await page.goto(shareUrl);
  await expect(page.getByRole('heading', { name: /이 안내는 만료되었습니다/ })).toBeVisible();
  await expect(page.getByText('지금부터 약을 먹는 방법을 안내하겠습니다.')).toHaveCount(0);

  await page.request.post('/api/demo/clock', { data: { reset: true } });
});

test('T02 흐린 약봉투는 재촬영 안내와 승인 차단', async ({ page }) => {
  await login(page);
  await startWithSample(page, /흐림/);

  await expect(page.getByText(/글자가 선명하지 않습니다/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '인식내용 확인 완료' })).toBeDisabled();
  await expect(page.getByText(/확인 필요/).first()).toBeVisible();
});

test('T05 낮은 신뢰도 항목은 수정 후 진행된다', async ({ page }) => {
  await login(page);
  await startWithSample(page, /빛 반사/);

  await expect(page.getByText('오류0.61').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '인식내용 확인 완료' })).toBeDisabled();

  // 약사가 원문을 보고 값을 지우고 다시 입력한다.
  const frequency = page.getByRole('spinbutton', { name: /1일 복용횟수/ });
  await frequency.fill('');
  await expect(page.getByText('입력 필요').first()).toBeVisible();
  await frequency.fill('2');
  await frequency.blur();

  await expect(page.getByRole('button', { name: '인식내용 확인 완료' })).toBeEnabled({ timeout: 10_000 });
  await expect(page.getByText('약사 확인').first()).toBeVisible();
});

test('승인 전 환자 화면에는 복약정보가 표시되지 않는다', async ({ page }) => {
  await login(page);
  await startWithSample(page, /정규 복용약/);
  const sessionId = new URL(page.url()).searchParams.get('session');
  expect(sessionId).not.toBeNull();

  await page.goto(`/patient?session=${sessionId ?? ''}`);
  await expect(page.getByText('약사가 수어 복약안내를 준비하고 있습니다')).toBeVisible();
  await expect(page.getByText(/1포|식후 30분/)).toHaveCount(0);

  const response = await page.request.get(`/api/sessions/${sessionId ?? ''}/patient`);
  const payload = (await response.json()) as { approved: boolean; cards: unknown[] };
  expect(payload.approved).toBe(false);
  expect(payload.cards).toHaveLength(0);
});

test('T13 약사 즉시폐기는 QR 접근을 차단한다', async ({ page }) => {
  await login(page);
  await startWithSample(page, /정규 복용약/);

  await page.getByRole('button', { name: '인식내용 확인 완료' }).click();
  await approveAll(page);
  await page.getByRole('button', { name: /질문 대응 · 완료 화면으로 이동/ }).click();
  await page.getByRole('button', { name: '안내완료 · 48시간 QR 발급' }).click();

  const shareUrl = (await page.locator('p.font-mono').first().innerText()).trim();
  await page.getByRole('button', { name: 'QR 즉시 폐기' }).click();
  await expect(page.getByText('파기 완료').first()).toBeVisible({ timeout: 10_000 });

  await page.goto(shareUrl);
  await expect(page.getByRole('heading', { name: /더 이상 이용할 수 없습니다/ })).toBeVisible();
});
