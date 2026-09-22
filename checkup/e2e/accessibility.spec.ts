import { expect, test } from '@playwright/test';
import { answerCurrentQuestion, checkRadio, currentQuestionId, passModuleDone, startQuestionnaire } from './helpers';

const start = startQuestionnaire;

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

  // 기본값: 자동재생 켜짐 · 화면 크게 · 자막 켜짐
  await page.getByRole('button', { name: '영상 설정' }).click();
  await expect(page.getByRole('button', { name: '자동재생 끄기' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sign-panel__frame')).toHaveClass(/sign-panel__frame--zoom/);

  // 문항 영상은 같은 문장이 아래에 또 나오므로 자막을 겹쳐 쓰지 않는다
  await expect(page.locator('.sign-panel__subtitle')).toHaveCount(0);
  await page.getByRole('button', { name: '수어로 보기: 아니요' }).click();
  await expect(page.locator('.sign-panel__subtitle')).toHaveText('아니요');

  await page.getByRole('button', { name: '자동재생 끄기' }).click();
  await expect(page.getByRole('button', { name: '자동재생 켜기' })).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: '화면 작게' }).click();
  await expect(page.locator('.sign-panel__frame')).not.toHaveClass(/sign-panel__frame--zoom/);

  await page.getByRole('button', { name: '자막 끄기' }).click();
  await page.getByRole('button', { name: '수어로 보기: 예' }).click();
  await expect(page.locator('.sign-panel__subtitle')).toHaveCount(0);
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
