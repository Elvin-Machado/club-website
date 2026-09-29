import { test, expect } from '@playwright/test';

async function constellationGeometry(page) {
  return page.evaluate(() => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const nodes = [...document.querySelectorAll('.orbit-node-card')].map(element => ({ id: element.dataset.memberId, ...rect(element) }));
    const logo = rect(document.querySelector('.constellation-logo'));
    const title = rect(document.querySelector('.constellation-title'));
    const orbit = rect(document.querySelector('.orbit-track'));
    const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;
    return {
      width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      headerBottom: document.querySelector('.team-header').getBoundingClientRect().bottom,
      cardsTop: document.querySelector('#navigation-cards').getBoundingClientRect().top,
      nodes, logo, title, orbit,
      collisions: nodes.flatMap((a, index) => nodes.slice(index + 1).filter(b => overlaps(a, b)).map(b => [a.id, b.id])),
      centreCollisions: nodes.filter(node => overlaps(node, logo) || overlaps(node, title)).map(node => node.id),
    };
  });
}

function expectComplete(geometry) {
  const { width, height, headerBottom, nodes, logo, title, orbit } = geometry;
  expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
  expect(geometry.cardsTop).toBeGreaterThanOrEqual(height - 1);
  for (const item of [...nodes, logo, title, orbit]) {
    expect(item.x, JSON.stringify(item)).toBeGreaterThanOrEqual(-1);
    expect(item.right, JSON.stringify(item)).toBeLessThanOrEqual(width + 1);
    expect(item.y, JSON.stringify(item)).toBeGreaterThanOrEqual(headerBottom - 1);
    expect(item.bottom, JSON.stringify(item)).toBeLessThanOrEqual(height + 1);
  }
  expect(geometry.collisions).toEqual([]);
  expect(geometry.centreCollisions).toEqual([]);
  expect(Math.abs(logo.x + logo.width / 2 - orbit.x - orbit.width / 2)).toBeLessThan(1);
  expect(Math.abs(logo.y + logo.height / 2 - orbit.y - orbit.height / 2)).toBeLessThan(1);
}

test('the complete first viewport contains one orbit, all core members and the centred official logo', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/team');
  await expect(page.locator('.orbit-space')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.orbit-node-card')).toHaveCount(12);
  await expect(page.locator('.orbit-path ellipse')).toHaveCount(1);
  await expect(page.locator('main > section')).toHaveCount(2);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('NUCLEUS');
  await expect(page.locator('.constellation-logo image')).toHaveAttribute('href', /NucleusLogo_transparent/);
  await expect(page.locator('.community-section, .galaxy-orbital-lines, .core-carousel')).toHaveCount(0);
  await expect(page.getByText('Meet the community', { exact: false })).toHaveCount(0);
  expectComplete(await constellationGeometry(page));
  await page.screenshot({ path: testInfo.outputPath('constellation.png') });
  expect(errors).toEqual([]);
});

test('the full constellation fits laptop, tablet, narrow phone and landscape viewports', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the viewport matrix is covered once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[1366, 768], [1024, 768], [820, 1180], [768, 1024], [600, 800], [390, 844], [360, 640], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/team');
    await expect(page.locator('.orbit-space')).toHaveAttribute('data-ready', 'true');
    await page.evaluate(() => document.fonts.ready);
    expectComplete(await constellationGeometry(page));
  }
});

test('the same background stays behind the cards and the card entrance settles', async ({ page, isMobile }, testInfo) => {
  await page.goto('/team');
  const backdrop = page.locator('.constellation-bg');
  await expect(backdrop).toHaveCount(1);
  await expect(backdrop).toHaveCSS('position', 'fixed');
  const before = await backdrop.boundingBox();
  await page.locator('#navigation-cards').scrollIntoViewIfNeeded();
  await expect(page.locator('.nav-card')).toHaveCount(2);
  for (const card of await page.locator('.nav-cards-grid > .nav-card-motion').all()) await expect(card).toHaveCSS('opacity', '1');
  const after = await backdrop.boundingBox();
  expect(after).toEqual(before);
  expect(await backdrop.locator('canvas').count()).toBeLessThanOrEqual(1);
  await expect(page.locator('#navigation-cards')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
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
  await expect(page.locator('.constellation-section')).toHaveCount(0);
  await expect(page.locator('.gallery-card')).toHaveCount(3);
  expect(await page.locator('.gallery-card').evaluateAll(cards => cards.map(card => card.dataset.memberId).sort())).toEqual(['nikhitha', 'salim', 'saniya']);
  expect(await page.evaluate(() => window.peopleNavigationMarker)).toBe('same-document');
  await page.goBack();
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.locator('.nav-cards-grid > .nav-card-motion > .nav-card-motion').first()).toHaveCSS('opacity', '1');
  await page.locator('.nav-card-alumni').click();
  await expect(page).toHaveURL(/\/alumni$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('NUCLEUS Alumni');
  await expect(page.locator('.alumni-empty')).toContainText('Our alumni stories are coming soon.');
  await expect(page.locator('.gallery-card, .constellation-section')).toHaveCount(0);
});

test('core and current member profiles support keyboard opening, Escape and focus restoration', async ({ page }) => {
  for (const [route, selector, name] of [['/team', '.orbit-node-card', 'Poorvik Kuthyala'], ['/members', '.gallery-card', 'Salim Pallikal']]) {
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
  const member = page.locator('.orbit-node-card').first();
  await member.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close profile', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('reduced motion retains the full constellation and supports keyboard card navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/team');
  await expect(page.locator('.orbit-node-card')).toHaveCount(12);
  await expect(page.locator('.constellation-bg canvas')).toHaveCount(0);
  const before = await page.locator('.orbit-node-card').first().boundingBox();
  await page.waitForTimeout(300);
  expect(await page.locator('.orbit-node-card').first().boundingBox()).toEqual(before);
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
    await expect(page).toHaveURL(/\/team$/);
  }
});
