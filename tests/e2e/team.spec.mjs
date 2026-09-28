import { test, expect } from '@playwright/test';

const TEAM = '/team';

// --- Unified Constellation Section ------------------------------------------

test('constellation section renders starfield, orbital lines, grain, and NUCLEUS title', async ({ page }) => {
  await page.goto(TEAM);

  const section = page.locator('.constellation-section');
  await expect(section).toBeVisible();

  await expect(page.locator('.constellation-bg canvas')).toHaveCount(1);
  await expect(page.locator('.galaxy-orbital-lines')).toHaveCount(1);
  await expect(page.locator('.galaxy-grain')).toHaveCount(1);

  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toContainText('Nucleus');
  await expect(h1).toHaveCount(1);
});

test('twelve core orbit labels are present with no vacant seat', async ({ page, isMobile }) => {
  await page.goto(TEAM);

  if (!isMobile) {
    const roles = [
      'President', 'Vice President', 'Secretary', 'Tech Lead', 'AI & ML Lead',
      'Dev Lead', 'DSA Lead', 'Discipline Head', 'Treasurer', 'Event Lead',
      'Planning & Strategy Lead', 'Media Lead',
    ];
    for (const role of roles) {
      await expect(page.getByText(role, { exact: true }).first()).toBeAttached({ timeout: 15_000 });
    }

    await expect(page.getByText('To be announced')).toHaveCount(0);
    await expect(page.getByText('System Design Lead', { exact: true })).toHaveCount(0);

    await expect(page.locator('.orbit-node-label')).toHaveCount(12);
  }
});

test('orbit pauses on hover so labels are clickable', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mobile uses carousel, not 3D orbit');
  await page.goto(TEAM);

  // Move mouse to orbit centre to pause idle rotation, then click first label
  await page.mouse.move(720, 460);
  await page.waitForTimeout(500);

  const firstLabel = page.locator('.orbit-node-label').first();
  await expect(firstLabel).toBeVisible();
  await firstLabel.click({ timeout: 8_000 });

  const dialog = page.locator('dialog.team-profile');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#profile-name')).not.toBeEmpty();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('profile dialog traps Escape and restores body scroll', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mobile uses carousel; orbit profile test runs on desktop only');
  await page.goto(TEAM);

  await page.mouse.move(720, 460);
  await page.waitForTimeout(500);
  await page.locator('.orbit-node-label').first().click({ timeout: 8_000 });

  const dialog = page.locator('dialog.team-profile');
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

// --- Member Deck (non-core) -------------------------------------------------

test('member deck shows three community members with navigation', async ({ page }) => {
  await page.goto(TEAM);
  await page.locator('.member-deck').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_000);

  await expect(page.locator('.deck-card')).toHaveCount(3);
  await expect(page.locator('.deck-card.is-active')).toHaveCount(1);

  // Next button advances
  const before = await page.locator('.deck-card.is-active .deck-card-name').innerText();
  await page.locator('.deck-nav button').last().click();
  await page.waitForTimeout(500);
  const after = await page.locator('.deck-card.is-active .deck-card-name').innerText();
  expect(after).not.toBe(before);
});

test('Explore All Members opens the gallery grid', async ({ page }) => {
  await page.goto(TEAM);
  await page.locator('.member-deck').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  await page.locator('.deck-explore-all').click();
  await page.waitForTimeout(1_500);

  const gallery = page.locator('.member-gallery');
  await expect(gallery).toBeVisible();
  await expect(page.locator('.gallery-card')).toHaveCount(3);

  // Click a gallery card opens profile
  await page.locator('.gallery-card').first().click();
  const dialog = page.locator('dialog.team-profile');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#profile-name')).not.toBeEmpty();
  await expect(page.locator('.profile-topline .team-kicker')).toContainText('THE COMMUNITY');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

// --- Roster (searchable directory) -----------------------------------------

test('roster lists 3 members in one team with search and filter', async ({ page }) => {
  await page.goto(TEAM);

  const rows = page.locator('.roster-row');
  await expect(rows).toHaveCount(3);
  await expect(page.locator('.roster-group')).toHaveCount(1);
  await expect(page.locator('.roster-result-count')).toContainText('03');

  const search = page.locator('#roster-search');
  await search.fill('salim');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('.roster-name')).toContainText('Salim');

  await search.fill('Community');
  await expect(rows).toHaveCount(3);

  await page.locator('.roster-clear').click();
  await expect(rows).toHaveCount(3);
});

test('roster rows are typographic only until real portraits are added', async ({ page }) => {
  await page.goto(TEAM);
  const row = page.locator('.roster-row').first();
  await row.scrollIntoViewIfNeeded();

  await expect(row).toBeVisible();
  await expect(row.locator('.roster-name')).toBeVisible();
  await expect(row.locator('.roster-role')).toBeVisible();
  await expect(page.locator('.roster-row img')).toHaveCount(0);
  await expect(page.locator('.roster-row[aria-pressed]')).toHaveCount(0);
});

// --- Mobile: carousel fallback ---------------------------------------------

test('mobile shows the carousel instead of the 3D orbit', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'carousel is the mobile fallback');
  await page.goto(TEAM);

  const carousel = page.locator('.core-carousel');
  await expect(carousel).toBeVisible();
  await expect(page.locator('.core-carousel-slide').first()).toBeVisible();
  await expect(page.locator('.core-carousel-slide')).toHaveCount(12);
});

test('mobile carousel pages with its controls', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'carousel is the mobile fallback');
  await page.goto(TEAM);
  await page.locator('.core-carousel').scrollIntoViewIfNeeded();

  const track = page.locator('.core-carousel-track');
  const before = await track.evaluate(el => el.scrollLeft);
  await page.locator('.carousel-controls button').last().click();
  await expect.poll(async () => track.evaluate(el => el.scrollLeft)).not.toBe(before);
});

// --- Accessibility ----------------------------------------------------------

test('reduced motion skips the WebGL canvas and still renders content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(TEAM);

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nucleus');
  await expect(page.locator('.roster-row')).toHaveCount(3);
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('skip link is the first tab stop and jumps to the constellation', async ({ page }) => {
  await page.goto(TEAM);
  await page.keyboard.press('Tab');

  const skip = page.locator('.team-skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#constellation');
});

test('page has exactly one level-one heading and a labelled search field', async ({ page }) => {
  await page.goto(TEAM);
  await expect(page.locator('h1')).toHaveCount(1);
  const search = page.locator('#roster-search');
  await expect(search).toBeVisible();
  await expect(page.locator('label[for="roster-search"]')).toHaveCount(1);
});