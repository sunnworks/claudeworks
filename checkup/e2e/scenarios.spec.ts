import { expect, test } from '@playwright/test';
import {
  answerCurrentQuestion,
  checkRadio,
  completeQuestionnaire,
  currentQuestionId,
  passModuleDone,
  startQuestionnaire,
} from './helpers';

const PEOPLE = ['45세 남성', '50세 여성', '28세 성인', '70세 성인'];

for (const person of PEOPLE) {
  test(`AC-01·AC-02 ${person} 문진표를 끝까지 작성한다`, async ({ page }) => {
    await startQuestionnaire(page, person);
    await completeQuestionnaire(page);

    await expect(page.getByRole('heading', { name: '답한 내용을 확인하세요' })).toBeVisible();
    await page.getByRole('button', { name: '작성 완료', exact: true }).click();
    await expect(page.getByRole('heading', { name: '다 썼습니다' })).toBeVisible();
    await expect(page.getByText('저장되지 않습니다')).toBeVisible();
  });
}

test('AC-06 PHQ-9 9번에 1점 이상 답하면 안전안내가 먼저 표시된다', async ({ page }) => {
  await startQuestionnaire(page, '28세 성인');

  for (let step = 0; step < 250; step += 1) {
    if (await passModuleDone(page)) continue;
    if ((await currentQuestionId(page)) === 'PHQ9-09') break;
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /^(다음|다 했어요)$/ }).first().click();
  }

  expect(await currentQuestionId(page)).toBe('PHQ9-09');
  await checkRadio(page, '여러 날', false);

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('109');
  await expect(dialog).toContainText('119');
  await dialog.getByRole('button', { name: '알겠습니다', exact: true }).click();
  await expect(dialog).toBeHidden();
});

test('AC-09·AC-10 건강 답변이 저장소·URL·콘솔에 남지 않는다', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));

  await startQuestionnaire(page);
  await checkRadio(page, '예');

  const storage = await page.evaluate(() => ({
    local: JSON.stringify(window.localStorage),
    session: JSON.stringify(window.sessionStorage),
    url: window.location.href,
  }));
  expect(storage.local).toBe('{}');
  expect(storage.session).toBe('{}');
  expect(storage.url).not.toContain('SUP-01');
  expect(consoleMessages.join(' ')).not.toContain('SUP-01');

  await page.reload();
  await expect(page.locator('h1')).toHaveText('건강검진 수어 문진표');
  await expect(page.getByRole('button', { name: '시작하기', exact: true })).toBeVisible();
});

test('AC-11 360px 폭에서 가로 스크롤이 생기지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await startQuestionnaire(page, '50세 여성');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('AC-12 키보드만으로 문항을 답하고 이동할 수 있다', async ({ page }) => {
  await startQuestionnaire(page);

  const noRadio = page.getByRole('radio', { name: '아니요', exact: true }).first();
  await noRadio.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  await noRadio.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: '아니요', exact: true }).first()).toBeChecked();

  await page.getByRole('button', { name: '다음', exact: true }).focus();
  await page.keyboard.press('Enter');
  expect(await currentQuestionId(page)).not.toBe('SUP-01');
});

test('질문과 선택지가 영상 바로 아래에 보인다', async ({ page }) => {
  await startQuestionnaire(page);

  const frame = await page.locator('.sign-panel__frame').boundingBox();
  const question = await page.locator('.question-official').boundingBox();
  const firstOption = await page.locator('.option').first().boundingBox();
  const navbar = await page.locator('.navbar').boundingBox();
  const wide = (page.viewportSize()?.width ?? 0) >= 720;

  // 질문은 영상 바로 아래에 오고, 버튼 막대에 가리지 않는다
  expect(question!.y).toBeGreaterThan(frame!.y);
  expect(question!.y + question!.height).toBeLessThan(navbar!.y);

  // 넓은 화면은 첫 선택지가 통째로 보이고,
  // 좁은 화면(360x740)은 영상·자막·질문까지 넣으면 자리가 없어 첫 선택지의 시작까지 보인다.
  if (wide) {
    expect(firstOption!.y + firstOption!.height).toBeLessThan(navbar!.y);
  } else {
    expect(firstOption!.y + 16).toBeLessThan(navbar!.y);
  }
});
