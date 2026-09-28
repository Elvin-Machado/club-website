import { test, expect } from '@playwright/test';
import { exampleCore, exampleMembers } from '../../src/components/team/team-data.ts';
import { alumniMembers, currentTeam } from '../../src/components/team/alumni-data.ts';

const { core, members } = currentTeam(exampleCore, exampleMembers, alumniMembers);

async function openTeam(page) {
  await page.goto('/team');
  await expect(page.locator('.orbit-node-label')).toHaveCount(core.length);
  await expect(page.locator('.constellation-section')).toHaveCSS('position', 'relative');
  await page.evaluate(() => document.fonts.ready);
}

async function geometry(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height, cx: x + width / 2, cy: y + height / 2 };
    };
    const stage = rect('.orbit-stage'), title = rect('#galaxy-title'), logo = rect('.constellation-logo');
    const nodes = [...document.querySelectorAll('.orbit-node-label')].map(node => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    });
    const labels = [...document.querySelectorAll('.orbit-node-copy')].map(label => {
      const { x, y, width, height } = label.getBoundingClientRect();
      return { x, y, width, height };
    });
    return { stage, title, logo, nodes, labels, viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth };
  });
}

function checkGeometry(layout) {
  expect(Math.abs(layout.title.cx - layout.stage.cx)).toBeLessThan(1);
  expect(Math.abs(layout.title.cy - layout.stage.cy)).toBeLessThan(1);
  expect(Math.abs(layout.logo.cx - layout.stage.cx)).toBeLessThan(1);
  expect(layout.logo.y + layout.logo.height).toBeLessThan(layout.title.y);
  expect(layout.overflow).toBe(false);
  const overlap = (a, b) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1
    && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;
  for (const [index, node] of layout.nodes.entries()) {
    expect(node.width).toBeGreaterThanOrEqual(43);
    expect(node.height).toBeGreaterThanOrEqual(43);
    expect(node.x).toBeGreaterThanOrEqual(0);
    expect(node.x + node.width).toBeLessThanOrEqual(layout.viewport);
    expect(overlap(node, layout.title)).toBe(false);
    expect(overlap(node, layout.logo)).toBe(false);
    for (const other of layout.nodes.slice(index + 1)) {
      // Circular portrait hit areas can have intersecting bounding squares.
      const distance = Math.hypot(node.x + node.width / 2 - other.x - other.width / 2, node.y + node.height / 2 - other.y - other.height / 2);
      expect(distance).toBeGreaterThanOrEqual((node.width + other.width) / 2 - 1);
    }
    const label = layout.labels[index];
    if (label.width > 0) {
      for (const [otherIndex, other] of layout.nodes.entries()) {
        if (otherIndex !== index) expect(overlap(label, other)).toBe(false);
      }
    }
  }
}

test('one centred official logo and title, one orbit, one compact community, then alumni', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await openTeam(page);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('#galaxy-title')).toHaveText('Nucleus');
  await expect(page.locator('.orbit-path circle')).toHaveCount(1);
  await expect(page.locator('.galaxy-grain')).toHaveCount(1);
  await expect(page.locator('.constellation-connections')).toHaveCount(1);
  const logo = page.getByRole('img', { name: 'Official NUCLEUS club logo' });
  await expect(logo).toBeVisible();
  const source = await logo.locator('image').getAttribute('href');
  expect(source).toContain('NucleusLogo_transparent');
  expect((await page.request.get(source)).ok()).toBe(true);
  await expect(page.locator('.member-gallery')).toHaveCount(1);
  await expect(page.locator('.member-gallery .gallery-card')).toHaveCount(members.length);
  await expect(page.locator('.member-deck,.roster-section,.team-invitation-section,.core-carousel,.galaxy-orbital-lines')).toHaveCount(0);
  await expect(page.getByText(/the rest of.*our universe/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'NUCLEUS Alumni' })).toBeAttached();
  if (!alumniMembers.length) await expect(page.getByText('Our alumni stories are coming soon.')).toBeAttached();
  expect(await page.locator('main>section').evaluateAll(sections => sections.map(section => section.id))).toEqual(['constellation', 'community', 'alumni']);
  expect(await page.locator('.team-showcase').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(8, 11, 8)');
  checkGeometry(await geometry(page));
  expect(errors).toEqual([]);
});

test('keyboard navigation pauses the orbit; profile browsing preserves the scene and restores focus', async ({ page }) => {
  await openTeam(page);
  const first = page.locator('.orbit-node-label').first();
  await first.focus();
  await first.press('ArrowLeft');
  await expect(page.locator('.orbit-node-label').last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await expect(page.locator('.core-orbit')).toHaveAttribute('data-paused', 'true');
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#profile-name')).toHaveText(core[0].name);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  const phase = await page.locator('.orbit-satellites').evaluate(element => element.getAnimations()[0]?.currentTime ?? 0);
  await page.getByRole('button', { name: 'Next profile', exact: true }).click();
  await expect(page.locator('#profile-name')).toHaveText(core[1].name);
  expect(await page.locator('.orbit-satellites').evaluate(element => element.getAnimations()[0]?.currentTime ?? 0)).toBe(phase);
  await page.getByRole('button', { name: 'Previous profile', exact: true }).click();
  await expect(page.locator('#profile-name')).toHaveText(core[0].name);
  await page.getByRole('button', { name: 'Close profile', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(first).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('rotation moves members while the logo and title stay fixed, including after scrolling', async ({ page }) => {
  await openTeam(page);
  await page.mouse.move(0, 0);
  const first = await geometry(page);
  const initial = await page.locator('.orbit-satellites').evaluate(element => getComputedStyle(element).transform);
  await expect.poll(() => page.locator('.orbit-satellites').evaluate(element => getComputedStyle(element).transform)).not.toBe(initial);
  const after = await geometry(page);
  expect(after.title).toEqual(first.title);
  expect(after.logo).toEqual(first.logo);
  await page.getByRole('button', { name: 'Pause orbit rotation' }).click();
  const paused = await page.locator('.orbit-satellites').evaluate(element => getComputedStyle(element).transform);
  await page.waitForTimeout(180);
  expect(await page.locator('.orbit-satellites').evaluate(element => getComputedStyle(element).transform)).toBe(paused);
  await page.getByRole('button', { name: 'Resume orbit rotation' }).click();
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo({ top: 160, behavior: 'instant' }));
  checkGeometry(await geometry(page));
});

test('every member remains accessible with reduced motion and without WebGL', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') ? null : getContext.call(this, type, ...args);
    };
  });
  await openTeam(page);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.orbit-satellites')).toHaveCSS('animation-name', 'none');
  for (const member of [...core, ...members, ...alumniMembers]) {
    const card = page.locator('[data-member-id="' + member.id + '"]');
    await card.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#profile-name')).toHaveText(member.name);
    if (member.bio) await expect(page.locator('#profile-bio')).toHaveText(member.bio);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card).toBeFocused();
  }
});

test('community and alumni anchors work and all compact cards fit the viewport', async ({ page }) => {
  await openTeam(page);
  await page.locator('.galaxy-scroll').click();
  await expect(page).toHaveURL(/#community$/);
  for (const card of await page.locator('.member-gallery .gallery-card').all()) {
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width);
  }
  await page.locator('.member-gallery a[href="#alumni"]').click();
  await expect(page).toHaveURL(/#alumni$/);
  await expect(page.locator('#alumni')).toBeInViewport();
  await page.locator('.team-footer a[href="#galaxy-title"]').click();
  await expect(page.locator('#galaxy-title')).toBeInViewport();
});

test('skip link and shared navigation remain accessible', async ({ page, isMobile }) => {
  await openTeam(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('.team-skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#constellation')).toBeFocused();
  if (isMobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  expect(await navigation.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(['/', '/about', '/events', '/projects', '/team']);
  await expect(navigation.locator('[aria-current="page"]')).toHaveAttribute('href', '/team');
  if (isMobile) {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
  }
});

test('orbit stays centred and unclipped at phone, tablet, laptop, and wide sizes throughout rotation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the viewport matrix runs once on desktop Chromium');
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1024, 768], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await openTeam(page);
    for (const phase of [0, 1500, 11250, 22500, 45000]) {
      await page.locator('.orbit-stage').evaluate((stage, time) => {
        for (const animation of stage.getAnimations({ subtree: true })) {
          if (animation.animationName?.startsWith('team-orbit-')) {
            animation.pause();
            animation.currentTime = time;
          }
        }
      }, phase);
      checkGeometry(await geometry(page));
    }
  }
});
