import { expect, test, type Page } from '@playwright/test';
import { answerCurrentQuestion, checkRadio, currentQuestionId, passModuleDone, startQuestionnaire } from './helpers';

const start = startQuestionnaire;

/** 좁은 화면에서는 화면 보기 설정이 접혀 있다. */
async function openDisplaySettings(page: Page) {
  const toggle = page.getByRole('button', { name: '글자·화면' });
  if (await toggle.isVisible().catch(() => false)) await toggle.click();
}

test('글자 크기 3단계가 실제로 화면에 적용된다', async ({ page }) => {
  await page.goto('/');
  await openDisplaySettings(page);
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
  await openDisplaySettings(page);
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
  await openDisplaySettings(page);
  await expect(page.getByRole('button', { name: /고대비 끄기/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.contrast)).toBe('high');

  await page.getByRole('button', { name: /고대비 끄기/ }).click();
  expect(await page.evaluate(() => document.documentElement.dataset.contrast)).toBe('normal');
});

test('저장소에는 화면 설정만 남고 건강 답변은 남지 않는다', async ({ page }) => {
  await start(page);
  await openDisplaySettings(page);
  await page.getByRole('button', { name: /고대비 켜기/ }).click();
  await checkRadio(page, '예');

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
  await page.locator('.scenario-card').first().click();
  await expect(panel).toBeVisible(); // 작성자 설정
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(panel).toBeVisible(); // 질문 안내
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await expect(panel).toBeVisible(); // 문항
});

test('문항과 선택지마다 수어영상 버튼이 있다', async ({ page }) => {
  await start(page);

  // 문항 본문과 선택지마다 수어 버튼이 있다
  const signButtons = page.locator('.card[data-question-id] .sign-btn');
  expect(await signButtons.count()).toBeGreaterThanOrEqual(3);

  // 선택지 수어 버튼을 누르면 자막이 그 선택지 문구로 바뀐다
  await page.getByRole('button', { name: '수어로 보기: 아니요' }).click();
  await expect(page.locator('.sign-panel__subtitle')).toHaveText('아니요');
});

test('자동재생과 영상 크기 설정을 바꿀 수 있다', async ({ page }) => {
  await start(page);

  // 기본값: 자동재생 켜짐 · 순서대로 보여주기 켜짐 · 좌우 넓은 화면 · 자막 켜짐
  await page.getByRole('button', { name: '영상 설정' }).click();
  await expect(page.getByRole('button', { name: '자동재생 끄기' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '순서대로 보여주기 끄기' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sign-panel__frame')).not.toHaveClass(/sign-panel__frame--zoom/);

  // 자막은 지금 무엇을 보여 주는지 언제나 알려 준다
  await expect(page.locator('.sign-panel__subtitle')).toBeVisible();
  await page.getByRole('button', { name: '수어로 보기: 아니요' }).click();
  await expect(page.locator('.sign-panel__subtitle')).toHaveText('아니요');

  await page.getByRole('button', { name: '자동재생 끄기' }).click();
  await expect(page.getByRole('button', { name: '자동재생 켜기' })).toHaveAttribute('aria-pressed', 'false');

  // 화면 크게: 정사각형이 되어 세로가 커지고 가로폭은 그대로다
  const before = await page.locator('.sign-panel__frame').boundingBox();
  await page.getByRole('button', { name: '화면 크게' }).click();
  await expect(page.locator('.sign-panel__frame')).toHaveClass(/sign-panel__frame--zoom/);
  const after = await page.locator('.sign-panel__frame').boundingBox();
  expect(Math.round(after!.width)).toBe(Math.round(before!.width));
  expect(after!.height).toBeGreaterThan(before!.height);

  await page.getByRole('button', { name: '자막 끄기' }).click();
  await expect(page.locator('.sign-panel__subtitle')).toHaveCount(0);
  await page.getByRole('button', { name: '자막 켜기' }).click();
  await expect(page.locator('.sign-panel__subtitle')).toBeVisible();
});

test('영상 폭은 아래 작성 칸과 같다', async ({ page }) => {
  await start(page);
  const frame = await page.locator('.sign-panel__frame').boundingBox();
  const card = await page.locator('.card[data-question-id]').boundingBox();
  // 상자 안쪽 여백(좌우 8px)만큼만 차이가 난다
  expect(Math.abs(card!.width - frame!.width)).toBeLessThanOrEqual(20);
});

test('질문과 선택지를 순서대로 하나씩 수어로 보여 준다', async ({ page }) => {
  await start(page);

  // SUP-01 은 문항 · 쉬운설명 · 예 · 아니요 네 단계다
  const dots = page.locator('.sign-panel__step');
  await expect(dots).toHaveCount(4);

  // 문장 영상을 끝까지 재생한다. 샘플 하나가 18초가 넘어서 넉넉히 기다린다.
  const order: number[] = [];
  for (let step = 0; step < 150; step += 1) {
    await page.waitForTimeout(600);
    const index = await page.evaluate(() => {
      const all = [...document.querySelectorAll('.sign-panel__step')];
      return all.findIndex((dot) => dot.classList.contains('sign-panel__step--on')) + 1;
    });
    if (order[order.length - 1] !== index) order.push(index);
    if (index === 4) break;
  }

  // 1 → 2 → 3 → 4 순서로 넘어간다
  expect(order[0]).toBe(1);
  expect(order[order.length - 1]).toBe(4);
  expect(order).toEqual([...order].sort((a, b) => a - b));

  // 선택지 차례에는 그 선택지가 화면에서 강조된다
  await expect(page.locator('.option--signing')).toHaveCount(1);
});

test('순서대로 보여주기를 끄면 다음으로 넘어가지 않는다', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: '영상 설정' }).click();
  await page.getByRole('button', { name: '순서대로 보여주기 끄기' }).click();

  await page.waitForTimeout(3000);
  const index = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.sign-panel__step')];
    return all.findIndex((dot) => dot.classList.contains('sign-panel__step--on')) + 1;
  });
  expect(index).toBe(1);
});

test('영상 영역 크기는 문항이 바뀌어도 고정이다', async ({ page }) => {
  await start(page);
  const frame = page.locator('.sign-panel__frame');
  const first = await frame.boundingBox();

  await checkRadio(page, '아니요');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  const second = await frame.boundingBox();

  expect(Math.round(second!.width)).toBe(Math.round(first!.width));
  expect(Math.round(second!.height)).toBe(Math.round(first!.height));
});

test('공식 응답에 모름이 없는 문항은 잘 모르겠어요로 넘어가고 의료진 확인으로 남는다', async ({ page }) => {
  await start(page);

  await page.getByRole('button', { name: '잘 모르겠어요', exact: true }).click();
  await expect(page.getByRole('button', { name: '✔ 잘 모르겠어요' })).toBeVisible();

  // 답을 고르지 않아도 다음으로 넘어간다
  await page.getByRole('button', { name: '다음', exact: true }).click();
  expect(await currentQuestionId(page)).not.toBe('SUP-01');
});

test('공식 응답에 모름이 있는 문항에는 별도 버튼을 만들지 않는다', async ({ page }) => {
  await start(page);

  for (let step = 0; step < 40; step += 1) {
    if (await passModuleDone(page)) continue;
    if ((await currentQuestionId(page)) === 'GEN-FH-01') break;
    await page.getByRole('button', { name: '잘 모르겠어요', exact: true }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
  }

  expect(await currentQuestionId(page)).toBe('GEN-FH-01');
  await expect(page.getByRole('radio', { name: '모름', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '잘 모르겠어요', exact: true })).toHaveCount(0);
});

test('화면이 바뀌면 수어영상이 실제로 자동재생된다', async ({ page }) => {
  await start(page);

  // 샘플 풀에 mp4(H.264)와 webm(VP9)이 섞여 있고 테스트 브라우저에는 H.264 코덱이 없다.
  // 그래서 여러 문항을 넘기며 실제로 재생된 적이 있는지 확인한다.
  let playedCount = 0;

  for (let step = 0; step < 8; step += 1) {
    await page.waitForTimeout(700);
    const state = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (!video) return null;
      return { paused: video.paused, currentTime: video.currentTime, readyState: video.readyState };
    });
    if (state && !state.paused && state.currentTime > 0 && state.readyState >= 2) playedCount += 1;

    if (await passModuleDone(page)) continue;
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /^(다음|다 했어요)$/ }).first().click();
  }

  expect(playedCount).toBeGreaterThan(0);
});

test('자동재생을 끄면 화면이 바뀌어도 재생되지 않는다', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: '영상 설정' }).click();
  await page.getByRole('button', { name: '자동재생 끄기' }).click();

  await answerCurrentQuestion(page);
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.waitForTimeout(900);

  const paused = await page.evaluate(() => {
    const video = document.querySelector('video');
    return video ? video.paused : true;
  });
  expect(paused).toBe(true);
});

test('다른 샘플영상 버튼은 제공하지 않는다', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: '영상 설정' }).click();
  await expect(page.getByRole('button', { name: '다른 샘플영상' })).toHaveCount(0);
});

test('수어영상 풀에 mp4와 webm이 모두 들어 있다', async ({ page }) => {
  await start(page);

  const seen = new Set<string>();
  for (let step = 0; step < 14; step += 1) {
    // 재생 실패로 영상 요소가 대체화면으로 바뀌어도 어떤 샘플이 뽑혔는지 알 수 있다.
    const sample = await page.locator('.sign-panel').getAttribute('data-sample');
    if (sample) seen.add(sample);

    if (await passModuleDone(page)) continue;
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /^(다음|다 했어요)$/ }).first().click();
  }

  // 14번 문항을 넘기는 동안 최소 4종류 이상의 샘플이 나온다(무작위 재생)
  expect(seen.size).toBeGreaterThanOrEqual(4);
  expect(seen.size).toBeLessThanOrEqual(8);
});

test('시작 화면도 문장을 순서대로 수어로 보여 준다', async ({ page }) => {
  await page.goto('/');

  // 제목 + 안내 3문장 = 네 단계
  await expect(page.locator('.sign-panel__step')).toHaveCount(4);

  const seen = new Set<number>();
  for (let step = 0; step < 150; step += 1) {
    await page.waitForTimeout(600);
    const index = await page.evaluate(() => {
      const all = [...document.querySelectorAll('.sign-panel__step')];
      return all.findIndex((dot) => dot.classList.contains('sign-panel__step--on')) + 1;
    });
    seen.add(index);
    if (index === 4) break;
  }
  expect([...seen].sort()).toEqual([1, 2, 3, 4]);

  // 지금 보여 주는 문장이 화면에서도 강조된다
  await expect(page.locator('.plain-list__item--signing, .screen-title--signing')).toHaveCount(1);
});

test('손 모양 버튼을 누르면 그 문장으로 건너뛰고 이어서 재생한다', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: /수어로 보기: 문장 옆 손 모양/ }).click();
  await page.waitForTimeout(500);

  const index = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.sign-panel__step')];
    return all.findIndex((dot) => dot.classList.contains('sign-panel__step--on')) + 1;
  });
  expect(index).toBe(3);
  await expect(page.locator('.sign-panel__subtitle')).toContainText('문장 옆 손 모양');
});
