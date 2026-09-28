import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const res = await page.evaluate(() => {
  const scripts = [...document.querySelectorAll('script')];
  const found = [];
  for (const s of scripts) {
    const t = s.textContent || '';
    const idx = t.indexOf('NucleusLogo');
    if (idx >= 0) found.push(t.substring(Math.max(0, idx - 50), idx + 120));
  }
  const svgImg = [...document.querySelectorAll('svg image')].map(i => {
    const attrs = {};
    for (const a of i.attributes) attrs[a.name] = a.value.substring(0, 100);
    return attrs;
  });
  const canvases = document.querySelectorAll('canvas');
  return { found: found.slice(0, 3), svgImg, canvasCount: canvases.length };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
