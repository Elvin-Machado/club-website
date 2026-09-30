import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const site = JSON.parse(await readFile(new URL('../../shared/public-data.json', import.meta.url), 'utf8'));

test.beforeEach(async ({ page }) => {
  await page.route('**/api/site', route => route.fulfill({ json: site }));
});

const content = page => page.evaluate(() => ({
  text: document.querySelector('#root').textContent,
  sections: [...document.querySelectorAll('main section')].map(element => element.className),
  links: [...document.querySelectorAll('a')].map(element => [element.textContent, element.getAttribute('href')]),
  buttons: [...document.querySelectorAll('button')].map(element => [element.textContent, element.getAttribute('aria-label')]),
}));

test('community actions reveal immediately for keyboard users and motion changes preserve content', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.logo-landing')).toHaveAttribute('data-status', 'still');
  const original = await content(page);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.logo-landing')).toHaveAttribute('data-status', 'ready');
  const buttons = page.locator('.community-actions a');
  await expect(buttons.first().locator('.text-reveal__unit').first()).toHaveCSS('opacity', '0');
  await buttons.first().evaluate(element => element.focus({ preventScroll: true }));
  await expect(buttons.first()).toBeFocused();
  await expect(buttons.first().locator('.text-reveal__unit').last()).toHaveCSS('opacity', '1');
  await expect(buttons.last().locator('.text-reveal__unit').last()).toHaveCSS('opacity', '1');
  await page.keyboard.press('Tab');
  await expect(buttons.last()).toBeFocused();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.logo-landing')).toHaveAttribute('data-status', 'still');
  expect(await content(page)).toEqual(original);
  await expect(page.locator('.dp-cards-row')).toHaveCount(0);
  await expect(page.locator('.dp-panel')).toHaveCount(3);
  await expect(page.locator('.dp-header + .dp-panel')).toHaveCount(1);
  await expect(page.locator('.vm-marquee-content').first()).toHaveCSS('animation-name', 'none');
  expect(errors).toEqual([]);
});

test('hero buffers stay bounded across resizing, pause offscreen, and clean up on preference changes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.heroDrawCalls = 0;
    for (const name of ['drawArrays', 'drawElements']) {
      const original = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function (...args) {
        window.heroDrawCalls++;
        return original.apply(this, args);
      };
    }
  });
  await page.goto('/');
  await expect(page.locator('.logo-landing')).toHaveAttribute('data-status', 'ready');
  const canvas = page.locator('.logo-landing__scene canvas');
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => canvas.evaluate(element => element.clientWidth)).toBe(viewport.width);
    await expect.poll(() => canvas.evaluate(element => Math.abs(element.width / element.clientWidth - element.height / element.clientHeight))).toBeLessThan(.01);
    const pixels = await canvas.evaluate(element => element.width * element.height);
    expect(pixels).toBeGreaterThan(0);
    expect(pixels).toBeLessThanOrEqual(2_200_000);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  }

  await page.evaluate(() => window.scrollTo({ top: innerHeight * 3, behavior: 'instant' }));
  await page.waitForTimeout(800);
  const stopped = await page.evaluate(() => window.heroDrawCalls);
  expect(stopped).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.heroDrawCalls)).toBe(stopped);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.heroDrawCalls)).toBeGreaterThan(stopped);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.logo-landing')).toHaveAttribute('data-status', 'ready');
  await expect(canvas).toHaveCount(1);
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('link', { name: 'Our work', exact: true }).click();
  await expect(canvas).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('text waits for the logo to form, then morphs and pauses offscreen in order', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('.logo-landing');
  const text = page.locator('.mu-morph-wrap');
  const word = page.locator('.mu-layer').first();
  await expect(hero).toHaveAttribute('data-status', 'ready');
  await expect(hero).toHaveAttribute('data-text-ready', 'false');
  await expect(text).toBeHidden();
  // Leaving mid-assembly must not let a wall-clock text delay expire offscreen.
  await page.evaluate(() => window.scrollTo({ top: innerHeight * 3, behavior: 'instant' }));
  await page.waitForTimeout(4200);
  await expect(hero).toHaveAttribute('data-text-ready', 'false');
  await expect(word).toHaveText('THE NUCLEUS CLUB');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(hero).toHaveAttribute('data-text-ready', 'true', { timeout: 12000 });
  await expect(text).toBeVisible();
  await expect(text).toHaveCSS('opacity', '1');
  await expect(word).toHaveText('THE NUCLEUS CLUB');
  await expect(word).toHaveText('CREATE', { timeout: 7000 });
  await page.evaluate(() => window.scrollTo({ top: innerHeight * 3, behavior: 'instant' }));
  await page.waitForTimeout(300);
  const pausedWord = await word.textContent();
  await page.waitForTimeout(3500);
  await expect(word).toHaveText(pausedWord);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(word).toHaveText('EXPLORE', { timeout: 7000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(word).toHaveText('THE NUCLEUS CLUB');
});

test('desktop wheel is gentler across idle and repeated input, pauses for dialogs, and resets on other routes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  await expect(page.locator('.dp-section')).toHaveAttribute('data-motion', 'true');
  await page.mouse.move(20, 450);
  await page.evaluate(() => {
    window.cancelledWheels = 0;
    window.addEventListener('wheel', event => {
      queueMicrotask(() => { if (event.defaultPrevented) window.cancelledWheels++; });
    }, { passive: true });
  });
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(360);
  // Wheel input must work immediately after idle and across repeated gestures.
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(540);
  for (let index = 0; index < 12; index++) await page.mouse.wheel(0, 80);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(1116);
  for (let index = 0; index < 12; index++) await page.mouse.wheel(0, -80);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(540);
  expect(await page.evaluate(() => window.cancelledWheels)).toBe(26);

  const panel = page.locator('.dp-panel').first();
  await panel.scrollIntoViewIfNeeded();
  await expect(panel).not.toHaveAttribute('inert');
  await expect(panel.locator('.dp-panel__inner')).not.toHaveAttribute('data-lenis-prevent');
  await panel.getByRole('button', { name: 'Explore domain' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  const position = await page.evaluate(() => scrollY);
  await page.mouse.move(10, 400);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => scrollY)).toBe(position);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  // A detail that fits the viewport must let the page continue scrolling.
  await panel.locator('.dp-panel__inner').hover();
  const resumedPosition = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(resumedPosition + 72);
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('link', { name: 'Our work', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.mouse.move(20, 450);
  const nativeWheel = await page.evaluate(() => ({
    destination: Math.min(300, document.documentElement.scrollHeight - innerHeight),
    cancelled: window.cancelledWheels,
  }));
  expect(nativeWheel.destination).toBeGreaterThan(0);
  await page.mouse.wheel(0, 300);
  // A short work page reaches its bottom before the full wheel distance.
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(nativeWheel.destination);
  expect(await page.evaluate(() => window.cancelledWheels)).toBe(nativeWheel.cancelled);
});

const revealState = locator => locator.locator('.text-reveal__unit').evaluateAll(units => {
  const values = units.map(unit => Number(getComputedStyle(unit).opacity));
  const blur = units.map(unit => parseFloat(getComputedStyle(unit).filter.replace('blur(', '')) || 0);
  return { opacity: values.reduce((a, b) => a + b, 0) / values.length, blur: blur.reduce((a, b) => a + b, 0) / blur.length };
});

async function placeAt(locator, ratio) {
  await locator.evaluate((element, ratio) => {
    // Scroll progress measures layout, independently of a card's animated transform.
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    window.scrollTo({ top: top - innerHeight * ratio, behavior: 'instant' });
  }, ratio);
}

test('every requested text block blurs and reveals in both scroll directions', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const blocks = page.locator('.dp-section [data-text-reveal], .community-section [data-text-reveal], .vm-title');
  await expect(blocks).toHaveCount(25);
  await expect(blocks.first()).toHaveAttribute('data-reveal-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  for (const block of await blocks.all()) {
    await placeAt(block, .95);
    await expect.poll(() => revealState(block).then(state => state.opacity)).toBeLessThan(.01);
    await placeAt(block, .70);
    await expect.poll(() => revealState(block).then(state => state.opacity)).toBeGreaterThan(.1);
    const midway = await revealState(block);
    expect(midway.opacity).toBeLessThan(.99);
    expect(midway.blur).toBeGreaterThan(0);
    await placeAt(block, .42);
    await expect.poll(() => revealState(block).then(state => state.opacity)).toBeGreaterThan(.99);
    await expect.poll(() => revealState(block).then(state => state.blur)).toBeLessThan(.01);
    await placeAt(block, .70);
    await expect.poll(() => revealState(block).then(state => Math.abs(state.opacity - midway.opacity))).toBeLessThan(.02);
    await placeAt(block, .95);
    await expect.poll(() => revealState(block).then(state => state.opacity)).toBeLessThan(.01);
  }
  expect(errors).toEqual([]);
});

test('gentle wheel movement crosses all home sections without pinning or nested scroll traps', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 844, height: 390 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('.dp-sticky')).toHaveCSS('position', 'static');
    await expect(page.locator('.dp-section [data-lenis-prevent]')).toHaveCount(0);
    for (const surface of await page.locator('.dp-panel__inner, .community-section, .vm-header').all()) {
      await placeAt(surface, .24);
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      const before = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 220);
      await expect.poll(() => page.evaluate(() => scrollY).then(value => Math.abs(value - before - 132))).toBeLessThanOrEqual(1);
      await page.mouse.wheel(0, -220);
      await expect.poll(() => page.evaluate(() => scrollY).then(value => Math.abs(value - before))).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    }
  }
});

test('domain cards pop in gradually and reverse, with the correct WhatsApp communities', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.dp-section')).toHaveAttribute('data-motion', 'true');
  const invites = [
    'https://chat.whatsapp.com/F2sg6LBCwibIKWJu2nhnvI',
    'https://chat.whatsapp.com/L97jBsJl7vJ6ol1k68Ue9L',
    'https://chat.whatsapp.com/LPTqGQdnGRo24BEZyrk9vy',
  ];
  const panels = page.locator('.dp-panel');
  for (let index = 0; index < invites.length; index++) {
    const panel = panels.nth(index);
    const surface = panel.locator('.dp-panel__inner');
    const opacity = () => surface.evaluate(element => Number(getComputedStyle(element).opacity));
    const whatsapp = panel.getByRole('link', { name: 'Join WhatsApp Community' });
    await expect(whatsapp).toHaveAttribute('href', invites[index]);
    await expect(whatsapp).toHaveAttribute('target', '_blank');
    await expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');
    await placeAt(panel, .98);
    await expect.poll(opacity).toBeLessThan(.01);
    await placeAt(panel, .70);
    await expect.poll(opacity).toBeGreaterThan(.4);
    expect(await opacity()).toBeLessThan(.6);
    await placeAt(panel, .40);
    await expect.poll(opacity).toBeGreaterThan(.99);
    await placeAt(panel, .70);
    await expect.poll(opacity).toBeLessThan(.6);
    expect(await opacity()).toBeGreaterThan(.4);
    await placeAt(panel, .98);
    await expect.poll(opacity).toBeLessThan(.01);
    await whatsapp.evaluate(element => element.focus({ preventScroll: true }));
    await expect(surface).toHaveCSS('opacity', '1');
    await expect(whatsapp.locator('.text-reveal__unit').last()).toHaveCSS('opacity', '1');
    await whatsapp.evaluate(element => element.blur());
  }
});

test('reduced motion and keyboard navigation take over from desktop wheel momentum', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  await page.mouse.move(20, 450);
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(30);
  await page.keyboard.press('Home');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(300);
  await expect(page.locator('.dp-line-1 .text-reveal__unit').first()).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveClass(/lenis/);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(480);
});

test('touch scrolling is native and reduced motion keeps all text readable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route('**/api/site', route => route.fulfill({ json: site }));
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  const heading = page.locator('.dp-line-1');
  await expect(heading).toHaveAttribute('data-reveal-ready', 'true');
  await placeAt(heading, .95);
  await expect.poll(() => revealState(heading).then(state => state.opacity)).toBeLessThan(.01);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(heading).toHaveAttribute('data-reveal-ready', 'false');
  await expect.poll(() => revealState(heading)).toEqual({ opacity: 1, blur: 0 });
  await expect(page.locator('.dp-sticky')).toHaveCSS('position', 'static');
  await expect(page.locator('.logo-landing__scene canvas')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(heading).toHaveAttribute('data-reveal-ready', 'true');
  await placeAt(heading, .78);
  await expect.poll(() => revealState(heading).then(state => state.blur)).toBeGreaterThan(0);
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await context.close();
});
