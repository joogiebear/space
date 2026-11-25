import { expect, test, type CDPSession, type Page } from '@playwright/test';

/** Messages that are noise rather than faults: the static build has no live data, so fetches may 404. */
const IGNORED = /Failed to load resource|favicon|\/data\/|data is not available/i;

async function boot(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !IGNORED.test(m.text()) && errors.push(m.text()));
  // The tests never depend on live data: report every data file as missing, the way a real server would.
  await page.route('**/data/**', route => route.fulfill({ status: 404, body: 'not found' }));
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

test.describe('share links', () => {
  test('a link restores the scene, the selected object and the date', async ({ page }) => {
    const errors = await boot(page);
    await page.goto('./#solar?sel=mars&t=1969-07-20T20:17:00.000Z&r=1&pz=1');
    await expect(page.locator('#iT')).toHaveText(/Mars/i, { timeout: 20_000 });
    await expect(page.locator('#dateTxt')).toContainText('1969-07-20');
    // the address bar keeps the scene and selection, so a plain copy of the URL still works
    await expect.poll(() => page.evaluate(() => location.hash)).toContain('sel=mars');
    expect(errors).toEqual([]);
  });

  test('an unknown scene or object in a link is ignored, not fatal', async ({ page }) => {
    const errors = await boot(page);
    await page.goto('./#solar?sel=does-not-exist&t=garbage');
    await expect(page.locator('#gl canvas')).toBeVisible();
    await page.waitForTimeout(1500);
    await page.goto('./#nowhere');
    await expect(page.locator('#gl canvas')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Share copies a link that opens the same view', async ({ page, context, isMobile }) => {
    test.skip(isMobile, 'clipboard permissions are desktop-only in the test browser');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await boot(page);
    await page.goto('./#solar?sel=jupiter&t=2000-01-01T00:00:00.000Z&r=1&pz=1');
    await expect(page.locator('#iT')).toHaveText(/Jupiter/i, { timeout: 20_000 });
    await page.locator('#share').click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(/#solar\?.*sel=jupiter/);
    expect(link).toContain('t=2000-01-01');
    expect(link).toMatch(/[?&]z=/); // the camera is included
    await page.goto(link);
    await expect(page.locator('#iT')).toHaveText(/Jupiter/i, { timeout: 20_000 });
    await expect(page.locator('#dateTxt')).toContainText('2000-01-01');
  });
});

test.describe('guided tours', () => {
  test('a tour shows captions, steps with Next and Back, and Escape ends it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the tour menu lives in the desktop top bar');
    const errors = await boot(page);
    await page.goto('./#solar');
    await expect(page.locator('#tours')).toBeVisible();
    await page.locator('#tours').selectOption({ label: 'The solar system, one world at a time' });
    const card = page.locator('#tour');
    await expect(card).toBeVisible();
    await expect(card.locator('h2')).toHaveText('The Sun');
    await card.getByRole('button', { name: 'Pause' }).click(); // the test drives the steps, not the autoplay timer
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.locator('h2')).toHaveText('Mercury');
    await expect(page.locator('#iT')).toHaveText(/Mercury/i, { timeout: 20_000 });
    await card.getByRole('button', { name: 'Back' }).click();
    await expect(card.locator('h2')).toHaveText('The Sun');
    await page.keyboard.press('Escape');
    await expect(card).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('a tour that crosses scenes follows the steps and ends cleanly', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the tour menu lives in the desktop top bar');
    const errors = await boot(page);
    await page.locator('#tours').selectOption({ label: 'Our place in the universe' });
    const card = page.locator('#tour');
    await expect(card.locator('h2')).toHaveText('Earth orbit');
    await card.getByRole('button', { name: 'Pause' }).click(); // the test drives the steps, not the autoplay timer
    for (const title of ['The solar system', 'Our stellar neighbourhood', 'The Milky Way', 'The galaxies around us']) {
      await card.getByRole('button', { name: 'Next' }).click();
      await expect(card.locator('h2')).toHaveText(title);
      await expect(page.locator('#crumbs .cur')).toBeVisible();
    }
    await card.getByRole('button', { name: 'Finish' }).click();
    await expect(card).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('using a tab while a tour runs ends the tour', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the tour menu lives in the desktop top bar');
    await boot(page);
    await page.locator('#tours').selectOption({ label: 'Our place in the universe' });
    await expect(page.locator('#tour')).toBeVisible();
    await expect(page.locator('#tabs .tab.on')).toHaveText('Earth Orbit', { timeout: 15_000 }); // the first step has landed
    await page.locator('#tabs').getByRole('button', { name: 'Star Map' }).click();
    await expect(page.locator('#tour')).toHaveCount(0, { timeout: 15_000 });
  });
});

test.describe('Sky Tonight', () => {
  test.skip(({ isMobile }) => isMobile, 'covered on desktop');
  const FULL_MOON = '#sky?sel=moon&t=2000-01-21T04:40:00.000Z&r=1&pz=1';

  test('opens with no star data and still shows the Sun, Moon and planets', async ({ page }) => {
    const errors = await boot(page);
    await page.goto('./' + FULL_MOON);
    await expect(page.locator('#iT')).toHaveText('The Moon', { timeout: 20_000 });
    await expect(page.locator('#iS')).toContainText('Full Moon');
    await expect(page.locator('#rows')).toContainText('Altitude');
    expect(errors).toEqual([]);
  });

  test('the Sun reports the right stage of twilight for London at sunset', async ({ page }) => {
    await boot(page);
    // London, 24 Nov 2026: sunset is about 15:56 UTC, so 16:15 is civil twilight and 18:00 is full night
    await page.goto('./#sky?sel=sun&t=2026-11-24T16:15:00.000Z&r=1&pz=1');
    await expect(page.locator('#rows')).toContainText('Civil twilight', { timeout: 20_000 });
    await page.goto('./#sky?sel=sun&t=2026-11-24T18:30:00.000Z&r=1&pz=1');
    await expect(page.locator('#rows')).toContainText('Full night');
  });

  test('with a star catalogue, a star can be found by name and selected', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    // three rows: the Sun (skipped), Sirius and a faint star, in the binary layout the app reads
    const d = 2.64,
      ra = 101.287 * (Math.PI / 180),
      dec = -16.716 * (Math.PI / 180);
    const bin = Buffer.alloc(4 + 3 * 20 + 3 * 4);
    bin.writeUInt32LE(3, 0);
    const row = (i: number, x: number, y: number, z: number, absM: number, ci: number) =>
      [x, y, z, absM, ci].forEach((v, k) => bin.writeFloatLE(v, 4 + (i * 5 + k) * 4));
    row(0, 0, 0, 0, 4.83, 0.65);
    row(1, d * Math.cos(dec) * Math.cos(ra), d * Math.cos(dec) * Math.sin(ra), d * Math.sin(dec), 1.43, 0.0);
    row(2, 30, 20, 10, 5, 1.2);
    bin.writeInt32LE(0, 4 + 60);
    bin.writeInt32LE(32349, 4 + 64);
    bin.writeInt32LE(1, 4 + 68);
    // Playwright tries the most recently added route first, so the catch-all goes in first
    await page.route('**/data/**', r => r.fulfill({ status: 404, body: 'not found' }));
    await page.route('**/data/stars.bin', r =>
      r.fulfill({ status: 200, contentType: 'application/octet-stream', body: bin }),
    );
    await page.route('**/data/stars_names.json', r => r.fulfill({ json: [[1, 'Sirius', 'CMa', 'A1V', 2.64, -1.46]] }));
    await page.route('**/data/constellations.json', r => r.fulfill({ json: [] }));
    await page.goto('./#sky?t=2026-01-20T22:00:00.000Z&r=1&pz=1');
    await expect(page.locator('#rows')).toContainText('catalogue', { timeout: 20_000 });
    await page.locator('#q').fill('sirius');
    await page.locator('#results button').first().click();
    await expect(page.locator('#iT')).toHaveText('Sirius');
    await expect(page.locator('#rows')).toContainText('Altitude');
    await expect(page.locator('#rows')).toContainText('Constellation');
    await expect(page.locator('#rows')).toContainText('light-years');
    expect(errors).toEqual([]);
  });

  test('a satellite can be found, selected and shown with its next pass', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    // orbital elements are only valid for weeks, so freeze "now" at the epoch of a real ISS element set
    await page.clock.setFixedTime(new Date('2020-07-12T21:20:00Z'));
    await page.route('**/data/**', r => r.fulfill({ status: 404, body: 'not found' }));
    await page.route('**/data/sats.json', r =>
      r.fulfill({
        json: {
          cats: ['Space stations', 'Active satellites'],
          fetched: '2020-07-12 21:16:00 UTC',
          sats: [
            [
              'ISS (ZARYA)',
              '1 25544U 98067A   20194.88612269 -.00002218  00000-0 -31515-4 0  9992',
              '2 25544  51.6461 221.2784 0001413  89.1723 280.4612 15.49507896236008',
              0,
            ],
          ],
        },
      }),
    );
    await page.goto('./#sky');
    await expect(page.locator('#rows')).toContainText('ISS next pass', { timeout: 20_000 });
    await page.locator('#q').fill('zarya');
    await page.locator('#results button').first().click();
    await expect(page.locator('#iT')).toHaveText('ISS (ZARYA)');
    await expect(page.locator('#rows')).toContainText('Space stations');
    await expect(page.locator('#rows')).toContainText('Altitude');
    await expect(page.locator('#rows')).toContainText(/Pass\s*max \d+°/, { timeout: 20_000 });
    expect(errors).toEqual([]);
  });

  test('Escape from the sky goes back up to Earth orbit', async ({ page }) => {
    await boot(page);
    await page.goto('./#sky');
    await expect(page.locator('#tabs .tab.on')).toHaveText('Sky Tonight', { timeout: 20_000 });
    await page.locator('#gl').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#tabs .tab.on')).toHaveText('Earth Orbit', { timeout: 20_000 });
  });
});

test.describe('astronomy calendar', () => {
  test.skip(({ isMobile }) => isMobile, 'covered on desktop');

  test('lists upcoming events, and opening one shows it in the atlas', async ({ page }) => {
    const errors = await boot(page);
    // pin "today" so the Perseids of August 2026 are the next big shower
    await page.clock.setFixedTime(new Date('2026-08-01T12:00:00Z'));
    await page.goto('./#cosmos');
    await page.locator('#events-btn').click();
    const panel = page.locator('#events');
    await expect(panel).toBeVisible();
    await expect(panel.locator('li').first()).toBeVisible({ timeout: 20_000 });
    await expect(panel).toContainText('Launch times are not available'); // no launch feed in the test build
    await expect(panel).toContainText('Total solar eclipse');
    await panel.getByRole('button', { name: /Perseids peak/ }).click();
    await expect(panel).toHaveCount(0);
    await expect(page.locator('#tabs .tab.on')).toHaveText('Sky Tonight', { timeout: 20_000 });
    await expect(page.locator('#dateTxt')).toContainText(/2026-08-1[23]/);
    expect(errors).toEqual([]);
  });

  test('kinds can be turned off and on, and Escape closes the calendar', async ({ page }) => {
    await boot(page);
    await page.clock.setFixedTime(new Date('2026-08-01T12:00:00Z'));
    await page.goto('./#cosmos');
    await page.locator('#events-btn').click();
    const panel = page.locator('#events');
    await expect(panel.getByRole('button', { name: /Perseids peak/ })).toBeVisible({ timeout: 20_000 });
    await panel.getByLabel(/Meteor showers/).uncheck();
    await expect(panel.getByRole('button', { name: /Perseids peak/ })).toHaveCount(0);
    await panel.getByLabel(/Meteor showers/).check();
    await expect(panel.getByRole('button', { name: /Perseids peak/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  });

  test('an eclipse opens Earth orbit at the moment of the eclipse', async ({ page }) => {
    await boot(page);
    await page.clock.setFixedTime(new Date('2026-08-01T12:00:00Z'));
    await page.goto('./#cosmos');
    await page.locator('#events-btn').click();
    await page
      .locator('#events')
      .getByRole('button', { name: /Total solar eclipse/ })
      .first()
      .click();
    await expect(page.locator('#tabs .tab.on')).toHaveText('Earth Orbit', { timeout: 20_000 });
    await expect(page.locator('#iT')).toHaveText(/Moon/);
    await expect(page.locator('#dateTxt')).toContainText('2026-08-12');
  });
});

test.describe('Sky Tonight tour', () => {
  test.skip(({ isMobile }) => isMobile, 'the tour menu lives in the desktop top bar');

  test('is built for the viewer, speeds the clock up for the time-lapse and hands it back', async ({ page }) => {
    const errors = await boot(page);
    // a dark winter evening in Greenwich, so the Moon, a planet and a star are all there to be found
    await page.clock.setFixedTime(new Date('2026-11-24T20:00:00Z'));
    await page.goto('./#cosmos');
    await page.locator('#tours').selectOption({ label: 'Your sky tonight' });
    const card = page.locator('#tour');
    await expect(card.locator('h2')).toHaveText('Your sky right now', { timeout: 20_000 });
    await expect(page.locator('#tabs .tab.on')).toHaveText('Sky Tonight');
    await card.getByRole('button', { name: 'Pause' }).click(); // the test drives the steps
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.locator('h2')).toHaveText('The Moon');
    await expect(card.locator('p')).toContainText('Full Moon');
    await expect(page.locator('#iT')).toHaveText('The Moon');
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#iT')).toHaveText(/Saturn|Jupiter|Mars|Venus|Mercury/);
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.locator('p')).toContainText('up in the');
    await card.getByRole('button', { name: 'Next' }).click();
    await expect(card.locator('h2')).toHaveText('Watch the sky turn');
    await expect(page.locator('#rateTxt')).toContainText('×7,200');
    // ending the tour in the middle of the time-lapse must not leave the clock racing
    await page.keyboard.press('Escape');
    await expect(card).toHaveCount(0);
    await expect(page.locator('#rateTxt')).toHaveText('×1');
    expect(errors).toEqual([]);
  });
});

test.describe('Milky Way', () => {
  // desktop draws the full shader; the phone project (a coarse pointer) draws the light one

  test('has a layer toggle, and the shader compiles and draws on a dark night without errors', async ({
    page,
    isMobile,
  }) => {
    const errors = await boot(page);
    await page.goto('./#sky?t=2026-07-15T08:00:00.000Z&r=1&pz=1');
    if (isMobile) {
      // the layer list is tucked away on a phone; here it is enough that the light shader draws cleanly
      await page.waitForTimeout(2500);
      expect(errors).toEqual([]);
      return;
    }
    const box = page.getByLabel('Milky Way');
    await expect(box).toBeChecked({ timeout: 20_000 });
    await page.waitForTimeout(1500); // a few frames drawn with the Milky Way on
    await box.uncheck();
    await expect(box).not.toBeChecked();
    await page.waitForTimeout(500);
    await box.check();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});

test('hovering an object names it, says what it is, and keeps the tip on screen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a touch screen has no hover');
  const errors = await boot(page);
  const tip = page.locator('#tip');
  const box = (await page.locator('#gl canvas').boundingBox())!;
  // the home galaxy sits at the middle of the first view
  await expect(async () => {
    await page.mouse.move(box.x + box.width / 2 - 3, box.y + box.height / 2 - 3);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await expect(tip).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 20_000 });
  await expect(tip.locator('.n')).toHaveText('Milky Way');
  await expect(tip.locator('.k')).toContainText('spiral'); // and what kind of thing it is
  const r = (await tip.boundingBox())!;
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.y).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(box.width);
  expect(r.y + r.height).toBeLessThanOrEqual(box.height);
  expect(errors).toEqual([]);
});
