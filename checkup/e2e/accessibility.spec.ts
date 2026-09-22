import { expect, test } from '@playwright/test';

async function start(page: import('@playwright/test').Page, scenario = 'A 시나리오') {
  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.locator('.scenario-card', { hasText: scenario }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '문진 시작', exact: true }).click();
}

test('글자 크기 3단계가 실제로 화면에 적용된다', async ({ page }) => {
  await page.goto('/');
  const rootFontSize = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize);

  expect(await rootFontSize()).toBe('16px');
  await page.getByRole('button', { name: '크게', exact: true }).click();
  expect(await rootFontSize()).toBe('19px');
  await page.getByRole('button', { name: '더 크게', exact: true }).click();
  expect(await rootFontSize()).toBe('22px');
  await page.getByRole('button', { name: '보통', exact: true }).click();
  expect(await rootFontSize()).toBe('16px');
});

test('고대비 모드가 실제 색으로 적용되고 유지된다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /고대비 켜기/ }).click();

  const state = await page.evaluate(() => ({
    contrast: document.documentElement.dataset.contrast,
    bg: getComputedStyle(document.body).backgroundColor,
    color: getComputedStyle(document.body).color,
  }));
  expect(state.contrast).toBe('high');
  expect(state.bg).toBe('rgb(0, 0, 0)');
  expect(state.color).toBe('rgb(255, 255, 255)');

  // 새로고침해도 화면 설정은 유지된다(건강 답변은 저장하지 않는다)
  await page.reload();
  await expect(page.getByRole('button', { name: /고대비 끄기/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.contrast)).toBe('high');

  await page.getByRole('button', { name: /고대비 끄기/ }).click();
  expect(await page.evaluate(() => document.documentElement.dataset.contrast)).toBe('normal');
});

test('저장소에는 화면 설정만 남고 건강 답변은 남지 않는다', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: /고대비 켜기/ }).click();
  await page.getByRole('radio', { name: '예', exact: true }).first().check({ force: true });

  const stored = await page.evaluate(() => {
    const out: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)!;
      out[key] = window.localStorage.getItem(key) ?? '';
    }
    return out;
  });

  expect(Object.keys(stored).sort()).toEqual(['ksl-display-contrast']);
  const dump = JSON.stringify(stored);
  expect(dump).not.toContain('SUP-');
  expect(dump).not.toContain('GEN-');
});

test('수어영상 패널이 모든 화면에 있다', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '수어영상' });

  await expect(panel).toBeVisible(); // 서비스 안내
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await expect(panel).toBeVisible(); // 시나리오 선택
  await page.locator('.scenario-card', { hasText: 'A 시나리오' }).click();
  await expect(panel).toBeVisible(); // 작성자 설정
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(panel).toBeVisible(); // 모듈 안내
  await page.getByRole('button', { name: '문진 시작', exact: true }).click();
  await expect(panel).toBeVisible(); // 문항
});

test('문항과 선택지마다 수어영상 버튼이 있다', async ({ page }) => {
  await start(page);

  // 문항 본문 · 쉬운 설명 · 도움말 · 선택지 2개에 각각 수어 버튼이 있다
  const signButtons = page.locator('main .card .sign-btn');
  expect(await signButtons.count()).toBeGreaterThanOrEqual(5);

  // 선택지 수어 버튼을 누르면 자막이 그 선택지 문구로 바뀐다
  await page.getByRole('button', { name: '아니요 수어영상 보기' }).click();
  await expect(page.locator('.sign-panel__caption')).toContainText('아니요');
  await expect(page.locator('.sign-panel__head')).toContainText('선택지 수어');
});

test('자동재생과 영상 크기 설정을 바꿀 수 있다', async ({ page }) => {
  await start(page);

  // 기본값: 자동재생 켜짐 · 크게 보기
  await page.getByText('영상 설정', { exact: true }).click();
  await expect(page.getByRole('button', { name: '자동재생 끄기' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sign-panel__frame')).toHaveClass(/sign-panel__frame--zoom/);

  await page.getByRole('button', { name: '자동재생 끄기' }).click();
  await expect(page.getByRole('button', { name: '자동재생 켜기' })).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: '작게 보기' }).click();
  await expect(page.locator('.sign-panel__frame')).not.toHaveClass(/sign-panel__frame--zoom/);
});

test('영상 영역 크기는 문항이 바뀌어도 고정이다', async ({ page }) => {
  await start(page);
  const frame = page.locator('.sign-panel__frame');
  const first = await frame.boundingBox();

  await page.getByRole('radio', { name: '아니요', exact: true }).first().check({ force: true });
  await page.getByRole('button', { name: '다음', exact: true }).click();
  const second = await frame.boundingBox();

  expect(Math.round(second!.width)).toBe(Math.round(first!.width));
  expect(Math.round(second!.height)).toBe(Math.round(first!.height));
});

test('공식 응답에 모름이 없는 문항은 잘 모르겠어요로 넘어가고 의료진 확인으로 남는다', async ({ page }) => {
  await start(page);

  await page.getByRole('button', { name: '잘 모르겠어요', exact: true }).click();
  await expect(page.getByRole('button', { name: '✔ 잘 모르겠음으로 표시함' })).toBeVisible();

  // 답을 고르지 않아도 다음으로 넘어간다
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.locator('.question-head .chip').nth(2)).not.toHaveText('SUP-01');
});

test('공식 응답에 모름이 있는 문항에는 별도 버튼을 만들지 않는다', async ({ page }) => {
  await start(page);

  for (let step = 0; step < 40; step += 1) {
    const moduleDone = page.getByRole('button', { name: '다음 모듈 시작', exact: true });
    if (await moduleDone.isVisible().catch(() => false)) {
      await moduleDone.click();
      continue;
    }
    const id = await page.locator('.question-head .chip').nth(2).innerText();
    if (id === 'GEN-FH-01') break;
    await page.getByRole('button', { name: '잘 모르겠어요', exact: true }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
  }

  await expect(page.locator('.question-head .chip').nth(2)).toHaveText('GEN-FH-01');
  await expect(page.getByRole('radio', { name: '모름', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '잘 모르겠어요', exact: true })).toHaveCount(0);
});
