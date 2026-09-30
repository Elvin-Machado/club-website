import { test, expect } from '@playwright/test';

test('the initial viewport starts with the President card and contains all core members in the scroll deck', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/team');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.core-card-surface-full')).toHaveCount(12);
  await expect(page.locator('#core-team-deck')).toBeVisible();

  // The first card is the President's card
  const firstCard = page.locator('.core-card-surface-full').first();
  await expect(firstCard).toContainText('President');
  await expect(firstCard).toContainText('Poorvik Kuthyala');

  await page.screenshot({ path: testInfo.outputPath('core-team-deck.png') });
  expect(errors).toEqual([]);
});

test('scrolling through the core deck transitions to the MEMBERS and ALUMNI navigation cards', async ({ page, isMobile }, testInfo) => {
  await page.goto('/team');
  const backdrop = page.locator('.constellation-bg');
  await expect(backdrop).toHaveCount(1);
  await expect(backdrop).toHaveCSS('position', 'fixed');

  const before = await backdrop.boundingBox();

  // Scroll to navigation cards section
  await page.locator('#navigation-cards').scrollIntoViewIfNeeded();
  await expect(page.locator('.nav-card')).toHaveCount(2);

  for (const card of await page.locator('.nav-cards-grid > .nav-card-motion').all()) {
    await expect(card).toHaveCSS('opacity', '1');
  }

  const after = await backdrop.boundingBox();
  expect(after).toEqual(before);

  const members = await page.locator('.nav-card-members').boundingBox();
  const alumni = await page.locator('.nav-card-alumni').boundingBox();
  expect(Math.abs(members.width - alumni.width)).toBeLessThan(1);
  if (isMobile) expect(alumni.y).toBeGreaterThanOrEqual(members.y + members.height);
  else expect(Math.abs(members.y - alumni.y)).toBeLessThan(1);

  await page.screenshot({ path: testInfo.outputPath('navigation-cards.png') });
});

test('MEMBERS opens only the non-core directory and browser back restores usable cards', async ({ page }) => {
  await page.goto('/team');
  await page.evaluate(() => { window.peopleNavigationMarker = 'same-document'; });
  const card = page.locator('.nav-card-members');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Our Members');
  await expect(page.locator('#core-team-deck')).toHaveCount(0);
  await expect(page.locator('.gallery-card')).toHaveCount(3);
  expect(await page.locator('.gallery-card').evaluateAll(cards => cards.map(card => card.dataset.memberId).sort())).toEqual(['nikhitha', 'salim', 'saniya']);
  expect(await page.evaluate(() => window.peopleNavigationMarker)).toBe('same-document');
  await page.goBack();
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.locator('.nav-cards-grid > .nav-card-motion').first()).toHaveCSS('opacity', '1');
  await page.locator('.nav-card-alumni').click();
  await expect(page).toHaveURL(/\/alumni$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('NUCLEUS Alumni');
  await expect(page.locator('.alumni-empty')).toContainText('Our alumni stories are coming soon.');
  await expect(page.locator('.gallery-card, #core-team-deck')).toHaveCount(0);
});

test('core and current member profiles support keyboard opening, Escape and focus restoration', async ({ page }) => {
  for (const [route, selector, name] of [['/team', '.core-card-surface-full', 'Poorvik Kuthyala'], ['/members', '.gallery-card', 'Salim Pallikal']]) {
    await page.goto(route);
    const member = page.locator(selector).first();
    await member.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toHaveText(name);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(member).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  }
});

test('portrait buttons can be selected normally without forcing a click', async ({ page }) => {
  await page.goto('/team');
  const member = page.locator('.core-card-surface-full').first();
  await member.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close profile', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('reduced motion retains all core member cards and supports keyboard card navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/team');
  await expect(page.locator('.core-card-surface-full')).toHaveCount(12);
  await expect(page.locator('.constellation-bg canvas')).toHaveCount(0);
  const before = await page.locator('.core-card-surface-full').first().boundingBox();
  await page.waitForTimeout(300);
  expect(await page.locator('.core-card-surface-full').first().boundingBox()).toEqual(before);
  await page.locator('.nav-card-members').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Our Members');
});

test('destination pages retain the shared navigation, background and a visible return link', async ({ page, isMobile }, testInfo) => {
  for (const [route, title] of [['/members', 'Our Members'], ['/alumni', 'NUCLEUS Alumni']]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('.team-header')).toBeVisible();
    await expect(page.locator('.constellation-bg')).toHaveCount(1);
    await expect(page.locator('.team-showcase')).toHaveCSS('background-color', 'rgb(8, 13, 18)');
    await expect(page.locator('footer')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(route.slice(1) + '.png'), fullPage: true });
    if (isMobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'The people', exact: true })).toHaveAttribute('href', '/team');
    await expect(nav.getByRole('link', { name: /Members|Alumni/ })).toHaveCount(0);
    if (isMobile) await page.keyboard.press('Escape');
    await page.locator('.team-back-link').click();
    await expect(page).toHaveURL(/\/team#navigation-cards$/);
    await expect(page.locator('.nav-card-members')).toBeInViewport();
  }
});

test('every core card opens its own profile from the portrait and text', async ({ page }, testInfo) => {
  await page.goto('/team');
  const cards = page.locator('.core-card-surface-full');
  await expect(cards).toHaveCount(12);
  const count = await cards.count();
  await expect(page.getByText('View profile', { exact: true })).toHaveCount(0);
  for (let index = 0; index < count; index++) {
    await page.locator('#core-team-deck').evaluate((deck, fraction) => {
      window.scrollTo({ top: deck.getBoundingClientRect().top + window.scrollY + (deck.offsetHeight - window.innerHeight) * fraction, behavior: 'instant' });
    }, index / (count - 1) * 0.94);
    const card = cards.nth(index);
    const name = await card.locator('.core-card-name').textContent();
    // Wait for the spring to arrive, then click the actual photo/name, never force.
    await expect.poll(() => card.locator('..').evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0.995);
    if (index % 2 === 0) await card.locator('.core-card-photo-area').click({ position: { x: 100, y: 100 } });
    else await card.locator('.core-card-name').click();
    await expect(page.getByRole('dialog').getByRole('heading')).toHaveText(name);
    await page.getByRole('button', { name: 'Close profile', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.screenshot({ path: testInfo.outputPath('last-core-card.png') });
});

test('both directories return to the chooser and scrolling back through the core remains active', async ({ page }, testInfo) => {
  await page.goto('/team');
  for (const route of ['members', 'alumni']) {
    await page.locator('#navigation-cards').scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await page.locator('.nav-card-' + route).click();
    await expect(page).toHaveURL(new RegExp('/' + route + '$'));
    await page.goBack();
    await expect(page).toHaveURL(/\/team$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(before, 0);
    await expect(page.locator('.nav-card-' + route)).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Meet the Core Leadership' })).toHaveCount(0);
    await page.evaluate(() => window.scrollBy({ top: -innerHeight * 2, behavior: 'instant' }));
    await expect(page.locator('.core-card-surface-full').last()).toBeInViewport();
    await expect(page.locator('.team-header')).toBeInViewport();
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.locator('.core-card-wrapper').first().evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0.995);
  await page.locator('.core-card-surface-full').first().click();
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('Poorvik Kuthyala');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('returned-to-core.png') });
});

test('navigation stays visible and contains all primary routes at the chooser', async ({ page, isMobile }) => {
  await page.goto('/team');
  await page.locator('#navigation-cards').scrollIntoViewIfNeeded();
  await expect(page.locator('.team-header')).toBeInViewport();
  if (isMobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  for (const label of ['Home', 'The idea', 'Experiences', 'Our work', 'The people', 'Contact']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeInViewport();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('current member cards open from their photo and information areas without profile buttons', async ({ page }) => {
  await page.goto('/members');
  await expect(page.getByText('View profile', { exact: true })).toHaveCount(0);
  for (const card of await page.locator('.gallery-card').all()) {
    const name = await card.locator('.gallery-card-name').textContent();
    for (const area of ['.gallery-card-portrait', '.gallery-card-name']) {
      await card.locator(area).click();
      await expect(page.getByRole('dialog').getByRole('heading')).toHaveText(name);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  }
});

test('exposed side cards are clickable before they reach the centre', async ({ page }) => {
  await page.goto('/team');
  const card = page.locator('.core-card-surface-full').nth(1);
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  const viewport = page.viewportSize();
  await page.mouse.click(Math.min(viewport.width - 18, box.x + box.width / 2), box.y + box.height / 2);
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('Dinol Castelino');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
