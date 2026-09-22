import { expect, test } from '@playwright/test';
import { answerCurrentQuestion, completeQuestionnaire } from './helpers';

const SCENARIOS = [
  { id: 'A', name: 'A 시나리오 · 45세 남성' },
  { id: 'B', name: 'B 시나리오 · 50세 여성' },
  { id: 'C', name: 'C 시나리오 · 28세 성인' },
  { id: 'D', name: 'D 시나리오 · 70세 성인' },
];

for (const scenario of SCENARIOS) {
  test(`AC-01·AC-02 ${scenario.name} 시나리오를 끝까지 완료한다`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '시작하기', exact: true }).click();
    await page.locator('.scenario-card', { hasText: scenario.name }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByRole('button', { name: '문진 시작', exact: true }).click();

    await completeQuestionnaire(page);

    await expect(page.getByRole('heading', { name: '답변을 확인해 주세요' })).toBeVisible();
    await page.getByRole('button', { name: '작성 완료', exact: true }).click();
    await expect(page.getByRole('heading', { name: '사전문진 확인표 (데모)' })).toBeVisible();
    await expect(page.getByText('제출되지 않았습니다', { exact: true })).toBeVisible();
  });
}

test('AC-06 PHQ-9 9번에 1점 이상 답하면 안전안내가 먼저 표시된다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.locator('.scenario-card', { hasText: 'C 시나리오' }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '문진 시작', exact: true }).click();

  // PHQ9-09 까지 진행한 뒤, 9번만 '여러 날'을 고른다.
  for (let step = 0; step < 250; step += 1) {
    const moduleDone = page.getByRole('button', { name: '다음 모듈 시작' });
    if (await moduleDone.isVisible().catch(() => false)) {
      await moduleDone.click();
      continue;
    }
    const id = await page.locator('.question-head .chip').nth(2).innerText();
    if (id === 'PHQ9-09') break;
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /^(다음|답변 검토하기)$/ }).first().click();
  }

  await expect(page.locator('.question-head .chip').nth(2)).toHaveText('PHQ9-09');
  await page.getByRole('radio', { name: '여러 날' }).check({ force: true });

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('109');
  await expect(dialog).toContainText('119');
  await dialog.getByRole('button', { name: '안내를 확인했습니다' }).click();
  await expect(dialog).toBeHidden();
});

test('AC-09·AC-10 답변이 저장소·URL·콘솔에 남지 않는다', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));

  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.locator('.scenario-card', { hasText: 'A 시나리오' }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '문진 시작', exact: true }).click();
  await page.getByRole('radio', { name: '예' }).first().check({ force: true });

  const storage = await page.evaluate(() => ({
    local: JSON.stringify(window.localStorage),
    session: JSON.stringify(window.sessionStorage),
    url: window.location.href,
  }));
  expect(storage.local).toBe('{}');
  expect(storage.session).toBe('{}');
  expect(storage.url).not.toContain('SUP-01');
  expect(consoleMessages.join(' ')).not.toContain('SUP-01');

  // 새로고침하면 처음 화면으로 돌아간다
  await page.reload();
  await expect(page.locator('h1')).toHaveText('농인용 건강검진 수어 사전문진');
  await expect(page.getByRole('button', { name: '시작하기', exact: true })).toBeVisible();
});

test('AC-11 360px 폭에서 가로 스크롤이 생기지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.locator('.scenario-card', { hasText: 'B 시나리오' }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '문진 시작', exact: true }).click();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('AC-12 키보드만으로 문항을 답하고 이동할 수 있다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.locator('.scenario-card', { hasText: 'A 시나리오' }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '문진 시작', exact: true }).click();

  await page.getByRole('radio', { name: '아니요' }).first().focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: '아니요' }).first()).toBeChecked();

  await page.getByRole('button', { name: '다음', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.question-head .chip').nth(2)).not.toHaveText('SUP-01');
});
