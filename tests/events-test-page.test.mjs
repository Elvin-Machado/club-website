import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { openDatabase } from '../server/db.mjs';
import { render } from '../dist/server/entry-server.js';

test('the production event ride route renders independently of the site shell', async () => {
  const data = JSON.parse(await readFile(new URL('../shared/public-data.json', import.meta.url), 'utf8'));
  let html = render(data, '/events-test');
  // renderToString emits the lazy boundary on the first request. Subsequent
  // requests can render the resolved module, just as the production server does.
  assert.match(html, /Connecting the neurons|et-page/);
  for (let attempt = 0; attempt < 50 && !html.includes('class="et-page"'); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 20));
    html = render(data, '/events-test');
  }
  assert.match(html, /class="et-page"/);
  assert.match(html, /data-phase="idle" data-distance="0.00"/);
  assert.match(html, /Hold W to drive forward, S to reverse/);
  assert.match(html, /A ride through/);
  assert.doesNotMatch(html, /class="site-header"|class="site-footer"|Lost the/);
  assert.match(render(data, '/events-test/'), /class="et-page"/);
});

test('direct production requests and refreshes serve /events-test instead of a 404', async () => {
  const db = openDatabase(':memory:');
  const server = createApp(db, { production: true, limits: false, dist: resolve('dist/client'), render }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const route of ['/events-test', '/events-test/', '/events-test?tour=1']) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /et-page|Connecting the neurons/);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
