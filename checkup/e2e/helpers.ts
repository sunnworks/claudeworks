import type { Locator, Page } from '@playwright/test';

/** 화면 가운데로 스크롤한 뒤 조작한다. 위아래 고정 막대에 가려지는 것을 피한다. */
async function center(locator: Locator): Promise<Locator> {
  await locator.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
  return locator;
}

/** 범위 안에서 유효한 값을 고른다. 최솟값이 0이면 1을 쓴다(0시간 0분 같은 무의미한 값 방지). */
async function validNumber(input: Locator): Promise<string> {
  const min = Number((await input.getAttribute('min')) ?? '0');
  const max = Number((await input.getAttribute('max')) ?? '99');
  return String(Math.min(Math.max(min, 1), max));
}

/** 라디오를 화면 가운데로 올린 뒤 선택한다. 아래 고정 막대에 가려지는 것을 피한다. */
export async function checkRadio(page: Page, name: string, exact = true): Promise<void> {
  const radio = page.getByRole('radio', { name, exact }).first();
  await center(radio);
  await radio.check({ force: true });
}

/** 시나리오를 골라 첫 문항 화면까지 간다. */
export async function startQuestionnaire(page: Page, person = '45세 남성'): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.locator('.scenario-card', { hasText: person }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.locator('.card[data-question-id]').waitFor();
}

/** 지금 보고 있는 문항 ID. 문항 화면이 아니면 undefined. */
export async function currentQuestionId(page: Page): Promise<string | undefined> {
  const card = page.locator('.card[data-question-id]');
  if ((await card.count()) === 0) return undefined;
  return (await card.getAttribute('data-question-id')) ?? undefined;
}

/** 모듈이 끝난 화면이면 다음으로 넘어간다. */
export async function passModuleDone(page: Page): Promise<boolean> {
  const done = page.getByRole('heading', { name: /끝났습니다/ });
  if (!(await done.isVisible().catch(() => false))) return false;
  await page.getByRole('button', { name: '다음', exact: true }).click();
  return true;
}

/** 현재 문항 화면에서 보이는 입력을 채운다. 어떤 유형이든 답할 수 있어야 한다. */
export async function answerCurrentQuestion(page: Page): Promise<void> {
  const card = page.locator('.card[data-question-id]');

  const radios = card.locator('input[type=radio]');
  if (await radios.count()) {
    await (await center(radios.first())).check({ force: true });
  } else {
    const checkboxes = card.locator('input[type=checkbox]');
    if (await checkboxes.count()) await (await center(checkboxes.first())).check({ force: true });
  }

  const rows = card.locator('.matrix__row');
  const rowCount = await rows.count();
  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    const pills = row.locator('.pill');
    if (await pills.count()) await (await center(pills.first())).click();

    const amount = row.locator('input[type=number]');
    if ((await amount.count()) && index === 0) {
      await (await center(amount.first())).fill('2');
      const unit = row.locator('select');
      if (await unit.count()) await unit.first().selectOption({ index: 1 });
    }
  }

  if (rowCount === 0) {
    const pills = card.locator('.matrix__choices .pill');
    if (await pills.count()) await (await center(pills.first())).click();
  }

  const numbers = card.locator('input[type=number]:visible');
  for (let index = 0; index < (await numbers.count()); index += 1) {
    const input = numbers.nth(index);
    if (await input.evaluate((node) => Boolean(node.closest('.matrix__row')))) continue;
    if ((await input.inputValue()) === '') await (await center(input)).fill(await validNumber(input));
  }

  const texts = card.locator('input[type=text]:visible');
  for (let index = 0; index < (await texts.count()); index += 1) {
    const input = texts.nth(index);
    if ((await input.inputValue()) === '') await (await center(input)).fill('데모 입력');
  }
}

/** 검토 화면에 도달할 때까지 문항을 채우며 진행한다. 같은 문항에서 멈추면 실패로 본다. */
export async function completeQuestionnaire(page: Page, maxSteps = 250): Promise<number> {
  let steps = 0;
  let lastId = '';
  let stuck = 0;

  for (; steps < maxSteps; steps += 1) {
    if (await page.getByRole('heading', { name: '답한 내용을 확인하세요' }).isVisible().catch(() => false)) break;
    if (await passModuleDone(page)) continue;

    const safety = page.getByRole('button', { name: '알겠습니다', exact: true });
    if (await safety.isVisible().catch(() => false)) {
      await safety.click();
      continue;
    }

    const id = (await currentQuestionId(page)) ?? '';
    stuck = id === lastId ? stuck + 1 : 0;
    if (stuck > 2) throw new Error(`문항 ${id} 에서 진행되지 않습니다.`);
    lastId = id;

    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /^(다음|다 했어요)$/ }).first().click();
  }
  return steps;
}
