import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { openDatabase } from '../server/db.mjs';
import { render } from '../dist/server/entry-server.js';

const data = JSON.parse(await readFile(new URL('../shared/public-data.json', import.meta.url), 'utf8'));

test('Experiences renders desktop controls and event publishing without a server-rendered joystick', () => {
  for (const route of ['/events', '/events/']) {
    const html = render(data, route);
    assert.match(html, /aria-label="Nucleus roller coaster"/);
    assert.doesNotMatch(html, /class="nx-joystick"/);
    assert.match(html, /class="nx-map-button"/);
    assert.match(html, /Hold W or D to accelerate/);
    assert.match(html, /Add Event/);
    assert.match(html, /class="nx-keyboard-hint"/);
    assert.match(html, /aria-label="Ride route map"/);
    assert.doesNotMatch(html, /class="nx-toolbar|class="nx-bottom-bar|Scenic stop/);
  }
});

test('direct production requests serve the immersive Experiences page', async () => {
  const db = openDatabase(':memory:');
  const server = createApp(db, { production: true, limits: false, dist: resolve('dist/client'), render }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const route of ['/events', '/events/', '/events?view=ride']) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /aria-label="Nucleus roller coaster"/);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
