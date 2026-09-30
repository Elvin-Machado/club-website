import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('output/navbar-reference', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('https://builder.ktappliance.com/?ref=navbar.gallery', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('.g-navbar-button-wrap').waitFor({ state: 'visible' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'output/navbar-reference/desktop-closed.png' });
  const inspect = async label => {
    const state = await page.evaluate(() => {
      const selectors = ['.g-navbar-wrap', '.g-navbar', '.g-navbar-const-wrap', '.g-navbar-title-container', '.g-navbar-title', '.g-navbar-button-wrap', '.g-navbar-hamburger', '.g-navbar-body-wrap', '.g-navbar-top-wrap', '.g-navbar-list', '.g-navbar-item', '.g-navbar-item-text', '.g-navbar-item-dot-wrap', '.g-navbar-social-list', '.g-navbar-social-item', '.g-navbar-footer', '.g-navbar-footer-list', '.g-navbar-bg-item'];
      return selectors.map(selector => {
        const element = document.querySelector(selector), css = getComputedStyle(element), rect = element.getBoundingClientRect();
        return { selector, rect: rect.toJSON(), style: Object.fromEntries(['display', 'position', 'backgroundColor', 'color', 'padding', 'gap', 'borderRadius', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'transform', 'opacity', 'flexDirection', 'alignItems', 'justifyContent', 'width', 'height', 'zIndex'].map(key => [key, css[key]])) };
      });
    });
    await writeFile(`output/navbar-reference/${label}.json`, JSON.stringify(state, null, 2));
    console.log(label, JSON.stringify(state));
  };
  await inspect('desktop-closed');
  await page.locator('.g-navbar-button-wrap').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'output/navbar-reference/desktop-opening.png' });
  await page.waitForTimeout(2000);
  await inspect('desktop-open');
  await page.screenshot({ path: 'output/navbar-reference/desktop-open.png' });
  await page.locator('.g-navbar-item').nth(1).hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'output/navbar-reference/desktop-hover.png' });
  await page.locator('.g-navbar-button-wrap').click();
  await page.waitForTimeout(1400);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/navbar-reference/mobile-closed.png' });
  await page.locator('.g-navbar-button-wrap').click();
  await page.waitForTimeout(2000);
  await inspect('mobile-open');
  await page.screenshot({ path: 'output/navbar-reference/mobile-open.png' });
} finally { await browser.close(); }
