import { expect, test, type CDPSession, type Page } from '@playwright/test';

/** Messages that are noise rather than faults: the static build has no live data, so fetches may 404. */
const IGNORED = /Failed to load resource|favicon|\/data\//i;

async function boot(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !IGNORED.test(m.text()) && errors.push(m.text()));
  await page.goto('./#cosmos');
  await expect(page.locator('#gl canvas')).toBeVisible();
  return errors;
}

/** The WebGL drawing buffer, in device pixels, against what the screen needs. */
async function bufferVsScreen(page: Page) {
  return page.evaluate(() => {
    const c = document.querySelector('#gl canvas') as HTMLCanvasElement;
    const dpr = Math.min(devicePixelRatio, 2);
    return {
      buffer: [c.width, c.height],
      want: [Math.round(innerWidth * dpr), Math.round(innerHeight * dpr)],
      shown: [Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)],
      screen: [innerWidth, innerHeight],
    };
  });
}

test('boots with a canvas, a landmark and no script errors', async ({ page }) => {
  const errors = await boot(page);
  await expect(page.locator('main, [role="main"]')).toHaveCount(1);
  await expect(page.locator('#gl')).toHaveAttribute('role', 'application');
  await page.waitForTimeout(1500); // let a few frames run
  expect(errors).toEqual([]);
});

test('the canvas fills the screen and follows it when the window changes', async ({ page }) => {
  await boot(page);
  await page.waitForTimeout(500);
  let m = await bufferVsScreen(page);
  expect(m.shown).toEqual(m.screen);
  expect(m.buffer).toEqual(m.want);

  const { width, height } = page.viewportSize()!;
  await page.setViewportSize({ width: Math.round(width * 0.7), height: Math.round(height * 0.8) });
  await expect
    .poll(async () => {
      m = await bufferVsScreen(page);
      return JSON.stringify(m.buffer) === JSON.stringify(m.want);
    })
    .toBe(true);
  expect(m.shown).toEqual(m.screen);
});

test('Escape and the keyboard work without errors', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard shortcuts are for desktop');
  const errors = await boot(page);
  await page.locator('#gl').focus();
  for (const k of ['ArrowLeft', 'ArrowUp', '+', '-', 'Space', 'Escape']) await page.keyboard.press(k);
  expect(errors).toEqual([]);
});

test.describe('touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch gestures only run on the phone project');

  /** Real multi-touch through the DevTools protocol; Playwright's own tap() is single-finger. */
  const sessions = new WeakMap<Page, CDPSession>();
  async function touch(page: Page, type: string, points: { x: number; y: number; id: number }[]) {
    let cdp = sessions.get(page);
    if (!cdp) sessions.set(page, (cdp = await page.context().newCDPSession(page)));
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  }

  test('a pinch zooms without selecting anything or opening a panel', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForTimeout(1000);
    const { width: w, height: h } = page.viewportSize()!;
    const cx = w / 2,
      cy = h / 2;
    await touch(page, 'touchStart', [
      { x: cx - 30, y: cy, id: 1 },
      { x: cx + 30, y: cy, id: 2 },
    ]);
    for (let i = 1; i <= 8; i++)
      await touch(page, 'touchMove', [
        { x: cx - 30 - i * 8, y: cy, id: 1 },
        { x: cx + 30 + i * 8, y: cy, id: 2 },
      ]);
    // lift one finger, wait, then the other: neither lift may count as a tap
    await touch(page, 'touchEnd', [{ x: cx + 94, y: cy, id: 2 }]);
    await touch(page, 'touchEnd', []);
    await page.waitForTimeout(400);
    await expect(page.locator('#info.open')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('a drag orbits and does not select what it started on', async ({ page }) => {
    await boot(page);
    await page.waitForTimeout(1000);
    const { width: w, height: h } = page.viewportSize()!;
    await touch(page, 'touchStart', [{ x: w / 2, y: h / 2, id: 1 }]);
    for (let i = 1; i <= 10; i++) await touch(page, 'touchMove', [{ x: w / 2 + i * 12, y: h / 2 + i * 4, id: 1 }]);
    await touch(page, 'touchEnd', []);
    await page.waitForTimeout(400);
    await expect(page.locator('#info.open')).toHaveCount(0);
  });
});
