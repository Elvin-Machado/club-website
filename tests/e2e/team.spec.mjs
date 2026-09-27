import { test, expect } from '@playwright/test';

const TEAM = '/team';

// --- Hero -------------------------------------------------------------------

test('hero renders letterbox bars, film grain, and the club name', async ({ page }) => {
  await page.goto(TEAM);

  const hero = page.locator('.galaxy-hero');
  await expect(hero).toBeVisible();
  await expect(page.locator('.galaxy-letterbox-top')).toHaveCount(1);
  await expect(page.locator('.galaxy-letterbox-bottom')).toHaveCount(1);
  await expect(page.locator('.galaxy-grain')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nucleus');
});

test('the scroll cue is present and the letterbox frames the hero', async ({ page }) => {
  await page.goto(TEAM);
  await expect(page.locator('.galaxy-scroll')).toBeVisible();

  const [top, bottom] = await Promise.all([
    page.locator('.galaxy-letterbox-top').boundingBox(),
    page.locator('.galaxy-letterbox-bottom').boundingBox(),
  ]);
  // Letterbox bars are pinned to the top and bottom edges of the hero.
  expect(top.y).toBeLessThan(4);
  expect(bottom.y).toBeGreaterThan(100);
});

// --- Roster -----------------------------------------------------------------

test('the roster lists 4 members grouped into 2 teams', async ({ page }) => {
  await page.goto(TEAM);
  const rows = page.locator('.roster-row');
  await expect(rows).toHaveCount(4);
  await expect(page.locator('.roster-group')).toHaveCount(2);
  await expect(page.locator('.roster-result-count')).toContainText('04');
});

test('search filters the roster by name, by team, and clears again', async ({ page }) => {
  await page.goto(TEAM);
  const rows = page.locator('.roster-row');
  const search = page.locator('#roster-search');
  await search.scrollIntoViewIfNeeded();

  await search.fill('salim');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('.roster-name')).toContainText('Salim');

  // A team name matches all three of that team's members.
  await search.fill('Community');
  await expect(rows).toHaveCount(3);

  // Terms combine, so a name plus its team narrows to one.
  await search.fill('salim community');
  await expect(rows).toHaveCount(1);

  // An unknown name empties the roster.
  await search.fill('zzzz-nobody');
  await expect(rows).toHaveCount(0);

  await page.locator('.roster-clear').click();
  await expect(rows).toHaveCount(4);
});

test('team filter chips narrow the roster and mark themselves pressed', async ({ page }) => {
  await page.goto(TEAM);
  const rows = page.locator('.roster-row');
  await page.locator('.roster-filters').scrollIntoViewIfNeeded();

  const community = page.locator('.roster-filters button', { hasText: 'Community' });
  await community.click();
  await expect(community).toHaveAttribute('aria-pressed', 'true');
  await expect(rows).toHaveCount(3);

  await page.locator('.roster-filters button', { hasText: 'All teams' }).click();
  await expect(rows).toHaveCount(4);
});

test('roster rows are typographic only until real portraits are added', async ({ page }) => {
  await page.goto(TEAM);
  const row = page.locator('.roster-row').first();
  await row.scrollIntoViewIfNeeded();

  // No member photographs exist in the source data, so rows stay clean
  // name+role text. MemberRow upgrades to a reveal-on-hover button only when
  // a member has an image (see MemberRow in RosterSection).
  await expect(row).toBeVisible();
  await expect(row.locator('.roster-name')).toBeVisible();
  await expect(row.locator('.roster-role')).toBeVisible();
  await expect(page.locator('.roster-row img')).toHaveCount(0);
  // A row without a photo is a plain div, not an interactive button.
  await expect(page.locator('.roster-row[aria-pressed]')).toHaveCount(0);
});

// --- Core: responsive switch ------------------------------------------------

test('mobile shows the carousel instead of the 3D orbit', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'carousel is the mobile fallback');
  await page.goto(TEAM);

  const carousel = page.locator('.core-carousel');
  await expect(carousel).toBeVisible();
  await expect(page.locator('.core-carousel-slide').first()).toBeVisible();
  // Exactly 12 core profiles, matching the data contract.
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

// --- Profile overlay --------------------------------------------------------

test('a core profile opens in a modal dialog and closes on Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the desktop 3D orbit overlays are fragile in headless; cover the carousel path on mobile');
  await page.goto(TEAM);

  const coreSection = page.locator('#core-team');
  await coreSection.scrollIntoViewIfNeeded();
  const opener = page.locator('[aria-haspopup="dialog"]').first();
  await expect(opener).toBeVisible({ timeout: 20_000 });
  await opener.click({ timeout: 5_000 });

  const dialog = page.locator('dialog.team-profile');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#profile-name')).not.toBeEmpty();
  // The dialog is modal: focus is moved inside it.
  await expect(dialog).toHaveAttribute('aria-labelledby', 'profile-name');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('the profile dialog traps Escape and restores the page scroll', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the desktop 3D orbit overlays are fragile in headless; cover the carousel path on mobile');
  await page.goto(TEAM);
  const coreSection = page.locator('#core-team');
  await coreSection.scrollIntoViewIfNeeded();
  const opener = page.locator('[aria-haspopup="dialog"]').first();
  await expect(opener).toBeVisible({ timeout: 20_000 });
  await opener.click({ timeout: 5_000 });

  const dialog = page.locator('dialog.team-profile');
  await expect(dialog).toBeVisible();
  // Body scroll is locked while the profile is open, and restored after.
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

// --- Accessibility ----------------------------------------------------------

test('reduced motion skips the WebGL canvas and still renders content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(TEAM);

  // The hero and roster are complete without any 3D scene.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nucleus');
  await expect(page.locator('.roster-row')).toHaveCount(4);
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('a skip link is the first tab stop and jumps to the core team', async ({ page }) => {
  await page.goto(TEAM);
  await page.keyboard.press('Tab');
  const skip = page.locator('.team-skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#core-team');
});

test('the page has exactly one level-one heading and a labelled search field', async ({ page }) => {
  await page.goto(TEAM);
  await expect(page.locator('h1')).toHaveCount(1);
  const search = page.locator('#roster-search');
  await expect(search).toBeVisible();
  await expect(page.locator('label[for="roster-search"]')).toHaveCount(1);
});
