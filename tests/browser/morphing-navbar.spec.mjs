import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

const site = JSON.parse(await readFile(new URL('../../shared/public-data.json', import.meta.url), 'utf8'));
const destinations = [['Home', '/'], ['Experiences', '/events'], ['Our work', '/projects'], ['The people', '/team']];
await mkdir('output/navbar-match', { recursive: true });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/site', route => route.fulfill({ json: site }));
});
const menu = page => page.getByRole('navigation', { name: 'Main navigation' });
const toggle = page => page.locator('.morph-nav__toggle');
async function settledOpen(page) {
  await expect(page.locator('.morph-nav__links li').last()).toHaveCSS('opacity', '1');
  await expect(page.locator('.morph-nav__overlay')).toHaveCSS('transform', 'none');
}

test('reference layout keeps a centered pill and reveals a full-screen menu in five bands', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.logo-landing')).toHaveAttribute('data-text-ready', 'true', { timeout: 15000 });
  const pill = page.locator('.morph-nav__pill');
  const closed = await pill.boundingBox();
  expect(Math.abs(closed.x + closed.width / 2 - 720)).toBeLessThan(1);
  expect(closed.y).toBe(16);
  expect(closed.height).toBe(58);
  await page.screenshot({ path: 'output/navbar-match/desktop-closed.png' });
  await page.evaluate(() => {
    window.navFrames = [];
    const begin = performance.now();
    const sample = () => {
      window.navFrames.push({
        bands: [...document.querySelectorAll('.morph-nav__band')].map(band => band.getBoundingClientRect().x),
        text: Number(getComputedStyle(document.querySelector('.morph-nav__links li')).opacity),
      });
      if (performance.now() - begin < 2400) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await toggle(page).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'output/navbar-match/desktop-opening.png' });
  await settledOpen(page);
  await expect(page.locator('.morph-nav__footer > div').last()).toHaveCSS('opacity', '1');
  expect(await pill.boundingBox()).toEqual(closed);
  const frames = await page.evaluate(() => window.navFrames);
  expect(frames.some(frame => frame.bands[0] > 10 && frame.bands[0] < 1300 && frame.bands[4] > frame.bands[0] + 100 && frame.text < .1)).toBe(true);
  const overlay = await page.locator('.morph-nav__overlay').boundingBox();
  expect(overlay).toEqual({ x: 0, y: 0, width: 1440, height: 900 });
  await expect(page.locator('.morph-nav__links .morph-nav__link')).toHaveCount(4);
  expect(await page.locator('.morph-nav__links').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(100);
  await expect(menu(page).getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: 'output/navbar-match/desktop-open.png' });
  await menu(page).getByRole('link', { name: 'Our work', exact: true }).hover();
  await page.waitForTimeout(120);
  await page.screenshot({ path: 'output/navbar-match/desktop-hover.png' });
  await toggle(page).click();
  await expect(page.locator('.morph-nav__overlay')).toHaveAttribute('inert');
  await expect.poll(async () => Math.round((await page.locator('.morph-nav__overlay').boundingBox()).x)).toBe(1440);
  expect(errors).toEqual([]);
});

test('keyboard focus stays in the full-screen menu and Escape restores the page', async ({ page }) => {
  await page.goto('/recruitment');
  await toggle(page).focus();
  await page.keyboard.press('Enter');
  await settledOpen(page);
  await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('inert');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  for (const [title] of destinations) {
    await page.keyboard.press('Tab');
    await expect(menu(page).getByRole('link', { name: title, exact: true })).toBeFocused();
  }
  for (const title of ['Instagram', 'LinkedIn', 'GitHub', 'Email']) {
    await page.keyboard.press('Tab');
    await expect(menu(page).getByRole('link', { name: title, exact: true })).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(page.locator('.morph-nav__join')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.morph-nav__brand')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.morph-nav__join')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle(page)).toBeFocused();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('main')).not.toHaveAttribute('inert');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect(menu(page).getByRole('link', { name: 'Home', exact: true })).toHaveCount(0);
});

test('routes, social destinations, reduced motion, and the community action remain functional', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/recruitment');
  for (const [title, path] of destinations) {
    await toggle(page).click();
    await menu(page).getByRole('link', { name: title, exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === path);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('main')).not.toHaveAttribute('inert');
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await toggle(page).click();
    await expect(menu(page).getByRole('link', { name: title, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.morph-nav__overlay')).toHaveCSS('transform', 'none');
    await expect(page.locator('.morph-nav__letter').first()).toHaveCSS('animation-name', 'none');
    await toggle(page).click();
  }
  await toggle(page).click();
  await expect(menu(page).getByRole('link', { name: 'Instagram', exact: true })).toHaveAttribute('href', site.settings.instagramUrl);
  await expect(menu(page).getByRole('link', { name: 'LinkedIn', exact: true })).toHaveAttribute('href', site.settings.linkedinUrl);
  await expect(menu(page).getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', site.settings.githubUrl);
  await page.locator('.morph-nav__join').click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('dialog.modal')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect(toggle(page)).toBeFocused();
  await toggle(page).click();
  await page.goBack();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
});

test('mobile and landscape menus fit long labels and keep every action reachable', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.route('**/api/site', route => route.fulfill({ json: site }));
  await page.goto('/events');
  for (const viewport of [{ width: 390, height: 844 }, { width: 280, height: 653 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await toggle(page).tap();
    await settledOpen(page);
    const pill = await page.locator('.morph-nav__pill').boundingBox();
    expect(Math.abs(pill.x + pill.width / 2 - viewport.width / 2)).toBeLessThan(1);
    for (const title of await page.locator('.morph-nav__title').all()) {
      const box = await title.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      await expect(title).toBeInViewport();
    }
    await expect(page.locator('.morph-nav__join')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await page.screenshot({ path: 'output/navbar-match/mobile-' + viewport.width + '-open.png' });
    await toggle(page).tap();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  }
  await context.close();
});

test('opening from a scrolled page locks the background and rapid toggles recover cleanly', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  await page.mouse.move(20, 450);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(360);
  await toggle(page).click();
  await settledOpen(page);
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  const position = await page.evaluate(() => scrollY);
  await page.mouse.move(600, 450);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => scrollY)).toBe(position);
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  expect(await page.evaluate(() => scrollY)).toBe(position);
  for (let index = 0; index < 6; index++) {
    await toggle(page).dispatchEvent('click');
    await page.waitForTimeout(50);
  }
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.morph-nav__overlay')).toHaveAttribute('inert');
  await expect(page.locator('main')).not.toHaveAttribute('inert');
  await toggle(page).click();
  await settledOpen(page);
  await expect(menu(page).getByRole('link', { name: 'Our work', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
});
