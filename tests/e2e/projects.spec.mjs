import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const seed = JSON.parse(readFileSync(new URL('../../shared/public-data.json', import.meta.url), 'utf8'));
const totalFor = (projects) => projects.length + (projects.length ? 2 : 0);

async function visit(page, projects = seed.projects) {
  await page.route('**/api/site', route => route.fulfill({ json: { ...seed, projects } }));
  await page.goto('/projects');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Less someday.');
}

test('project deck navigates forward and back with wraparound and progress', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await visit(page);

  const slide = page.locator('.deck-slide');
  const counter = page.locator('.work-deck-counter');
  const next = page.getByRole('button', { name: 'Next project', exact: true });
  const prev = page.getByRole('button', { name: 'Previous project', exact: true });

  await expect(slide).toHaveCount(1);
  await expect(slide.getByRole('heading')).toHaveText('i Laundroid');
  await expect(counter).toHaveText('01 / 03');
  await expect(page.locator('.footer-word')).toHaveCount(0);

  await next.click();
  await expect(slide).toHaveCount(1);
  await expect(slide.getByRole('heading')).toHaveText('ORBITAL');
  await expect(counter).toHaveText('02 / 03');
  await expect.poll(() => slide.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);

  await next.click();
  await expect(slide).toHaveCount(1);
  await expect(slide.getByRole('heading')).toHaveText('SENTINEL');
  await expect(counter).toHaveText('03 / 03');

  await next.click();
  await expect(slide).toHaveCount(1);
  await expect(slide.getByRole('heading')).toHaveText('i Laundroid');
  await expect(counter).toHaveText('01 / 03');

  await prev.click();
  await expect(slide).toHaveCount(1);
  await expect(slide.getByRole('heading')).toHaveText('SENTINEL');
  await expect(counter).toHaveText('03 / 03');

  await prev.click();
  await expect(slide).toHaveCount(1);
  await expect(slide.getByRole('heading')).toHaveText('ORBITAL');
  await expect(counter).toHaveText('02 / 03');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('deck.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('exploring a project opens the detail sheet with full information', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await visit(page);

  const explore = page.getByRole('button', { name: 'Explore project', exact: true });
  await expect(explore).toBeVisible();
  await explore.click();
  const sheet = page.getByRole('dialog', { name: 'i Laundroid' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Close project details' })).toBeFocused();
  await expect(sheet).toContainText('A centralized laundry management platform');
  await expect(sheet).toContainText('Key features');
  await expect(sheet).toContainText('Built with');
  await expect(sheet.getByRole('heading', { name: 'i Laundroid' })).toBeVisible();
  await expect(sheet.locator('.sheet-actions').getByRole('link', { name: /discuss/i })).toHaveAttribute('href', /^mailto:/);
  await page.screenshot({ path: testInfo.outputPath('sheet-open.png'), fullPage: true });

  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(explore).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');

  await page.getByRole('button', { name: 'Next project', exact: true }).click();
  await expect(page.locator('.deck-slide')).toHaveCount(1);
  await expect(page.locator('.deck-slide').getByRole('heading')).toHaveText('ORBITAL');
  await page.getByRole('button', { name: 'Explore project', exact: true }).click();
  const orbitalSheet = page.getByRole('dialog', { name: 'ORBITAL' });
  await expect(orbitalSheet).toBeVisible();
  await expect(orbitalSheet).toContainText('Conceptual placeholder');
  await orbitalSheet.getByRole('button', { name: 'Close project details' }).click();
  await expect(orbitalSheet).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('reduced motion supports keyboard navigation without overflow at 320px', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  const project = { ...seed.projects[0], title: 'A longer project title that still needs to fit on a card', description: 'A detailed project description with useful information. '.repeat(25) };
  await visit(page, [project]);

  const next = page.getByRole('button', { name: 'Next project', exact: true });
  await next.click();
  await expect(page.locator('.deck-slide')).toHaveCount(1);
  await expect(page.locator('.deck-slide').getByRole('heading')).toHaveText('ORBITAL');
  await next.click();
  await expect(page.locator('.deck-slide')).toHaveCount(1);
  await expect(page.locator('.deck-slide').getByRole('heading')).toHaveText('SENTINEL');

  const explore = page.getByRole('button', { name: 'Explore project', exact: true });
  await explore.focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'SENTINEL' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'SENTINEL' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(explore).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('empty projects show the existing empty state without placeholders', async ({ page }) => {
  await visit(page, []);
  await expect(page.getByText('The next project is taking shape. Follow our GitHub for updates.')).toBeVisible();
  await expect(page.locator('.deck-slide')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Our GitHub' })).toHaveAttribute('href', seed.settings.githubUrl);
});