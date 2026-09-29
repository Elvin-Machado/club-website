import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { openDatabase, hashPassword, verifyPassword, getSite } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';

async function fixture(fn, options = {}) {
  const db = openDatabase(':memory:');
  db.prepare('INSERT INTO admins VALUES(?,?,?)').run('test-admin', 'admin@example.com', hashPassword('correct-horse-battery-2026'));
  const app = createApp(db, { limits: false, dist: resolve('__no_test_dist__'), ...options });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', body, headers = {}) => fetch(`${base}/api${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  async function login() {
    const res = await request('/admin/login', 'POST', { email: 'admin@example.com', password: 'correct-horse-battery-2026' });
    assert.equal(res.status, 200);
    const data = await res.json();
    return { Cookie: res.headers.get('set-cookie').split(';')[0], 'X-CSRF-Token': data.csrf };
  }
  try { await fn({ db, request, login, base }); }
  finally { await new Promise(resolve => server.close(resolve)); db.close(); }
}
const applicant = { name: 'Test Student', email: 'student@example.com', year: '2', domain: 'aiml', motivation: 'I would like to build practical AI applications with the student community.', portfolio: 'https://github.com/example', consent: true, website: '' };

test('public API exposes published club content without private application data', () => fixture(async ({ request, db }) => {
  db.prepare('INSERT INTO content VALUES(?,?,?,?)').run('events', 'draft', JSON.stringify({ id: 'draft', title: 'Hidden draft', published: false }), 99);
  const response = await request('/site'); assert.equal(response.status, 200);
  const site = await response.json(); assert.equal(site.events.length, 3); assert.equal(site.settings.recruitmentOpen, false);
  assert.equal(site.applications, undefined); assert.equal(site.admins, undefined);
  assert.ok(!JSON.stringify(site).includes('System Design')); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
}));
test('passwords are salted and verified; admin endpoints require authentication', () => fixture(async ({ request }) => {
  const hash = hashPassword('my-long-password'); assert.notEqual(hash, hashPassword('my-long-password'));
  assert.equal(verifyPassword('my-long-password', hash), true); assert.equal(verifyPassword('incorrect', hash), false);
  assert.equal((await request('/admin/applications')).status, 401);
  assert.equal((await request('/admin/login', 'POST', { email: 'admin@example.com', password: 'incorrect' })).status, 401);
  const response = await request('/admin/login', 'POST', { email: 'admin@example.com', password: 'correct-horse-battery-2026' });
  assert.match(response.headers.get('set-cookie'), /HttpOnly/); assert.match(response.headers.get('set-cookie'), /SameSite=Strict/);
}));
test('closed recruitment and expired deadlines reject applications', () => fixture(async ({ request, db }) => {
  assert.equal((await request('/applications', 'POST', applicant)).status, 409);
  const settings = getSite(db).settings; settings.recruitmentOpen = true; settings.recruitmentDeadline = '2020-01-01T00:00:00.000Z';
  db.prepare('UPDATE settings SET body=?').run(JSON.stringify(settings));
  assert.equal((await request('/site').then(r => r.json())).settings.recruitmentOpen, false);
  assert.equal((await request('/applications', 'POST', applicant)).status, 409);
}));
test('full application lifecycle: open intake, submit, reject duplicates, review, delete', () => fixture(async ({ request, login, db }) => {
  const headers = await login();
  const settings = { ...getSite(db).settings, recruitmentOpen: true, cycle: 'test-intake' };
  assert.equal((await request('/admin/settings', 'PUT', settings, headers)).status, 200);
  const submission = await request('/applications', 'POST', applicant); assert.equal(submission.status, 201); const { id } = await submission.json(); assert.ok(id);
  assert.equal((await request('/applications', 'POST', { ...applicant, email: 'STUDENT@example.com' })).status, 409);
  const inbox = await request('/admin/applications', 'GET', undefined, headers).then(r => r.json()); assert.equal(inbox.total, 1); assert.equal(inbox.items[0].email, applicant.email);
  assert.equal((await request(`/admin/applications/${id}`, 'PATCH', { status: 'reviewing' }, headers)).status, 200);
  assert.equal(db.prepare('SELECT status FROM applications WHERE id=?').get(id).status, 'reviewing');
  assert.equal((await request(`/admin/applications/${id}`, 'DELETE', undefined, headers)).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM applications').get().n, 0);
}));
test('server rejects removed domains, invalid links, absent consent, and spam trap values', () => fixture(async ({ request, login, db }) => {
  const headers = await login(); await request('/admin/settings', 'PUT', { ...getSite(db).settings, recruitmentOpen: true }, headers);
  for (const patch of [{ domain: 'system-design' }, { portfolio: 'javascript:alert(1)' }, { consent: false }, { website: 'spam' }, { motivation: 'short' }]) {
    assert.equal((await request('/applications', 'POST', { ...applicant, ...patch })).status, 400);
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM applications').get().n, 0);
}));
test('admin mutations require CSRF and reject cross-origin requests', () => fixture(async ({ request, login, db }) => {
  const headers = await login(), settings = getSite(db).settings;
  assert.equal((await request('/admin/settings', 'PUT', settings, { Cookie: headers.Cookie })).status, 403);
  assert.equal((await request('/admin/settings', 'PUT', settings, { ...headers, Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await request('/admin/logout', 'POST', undefined, headers)).status, 200);
  assert.equal((await request('/admin/session', 'GET', undefined, headers)).status, 401);
}));
test('content CRUD validates dates, persists publication status, and updates the public feed', () => fixture(async ({ request, login, db }) => {
  const headers = await login(); const event = { ...getSite(db).events[0], id: 'new-event', title: 'A new connection', published: false };
  assert.equal((await request('/admin/content/events/new-event', 'PUT', event, headers)).status, 200);
  assert.equal((await request('/site').then(r => r.json())).events.length, 3);
  assert.equal((await request('/admin/site', 'GET', undefined, headers).then(r => r.json())).events.length, 4);
  assert.equal((await request('/admin/content/events/new-event', 'PUT', { ...event, endsAt: '2000-01-01T00:00:00.000Z' }, headers)).status, 400);
  assert.equal((await request('/admin/content/events/new-event', 'PUT', { ...event, published: true }, headers)).status, 200);
  assert.equal((await request('/site').then(r => r.json())).events.length, 4);
  assert.equal((await request('/admin/content/events/new-event', 'DELETE', undefined, headers)).status, 200);
  assert.equal((await request('/site').then(r => r.json())).events.length, 3);
}));
test('database content survives a close and reopen without reseeding over edits', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nucleus-db-test-')), path = join(directory, 'site.sqlite');
  let db;
  try {
    db = openDatabase(path); const settings = getSite(db).settings; settings.cycle = 'persisted-intake';
    db.prepare('UPDATE settings SET body=?').run(JSON.stringify(settings)); db.close(); db = openDatabase(path);
    assert.equal(getSite(db).settings.cycle, 'persisted-intake'); assert.equal(getSite(db).events.length, 3);
  } finally { db?.close(); rmSync(directory, { recursive: true, force: true }); }
});
test('production server-renders the landing and club routes, escapes data, and hides admin from indexing', async () => {
  if (!existsSync('dist/server/entry-server.js')) return;
  const { render } = await import('../dist/server/entry-server.js');
  await fixture(async ({ base, db }) => {
    const settings = getSite(db).settings; settings.recruitmentMessage = 'Updated from the database </script><script>alert(1)</script>';
    db.prepare('UPDATE settings SET body=?').run(JSON.stringify(settings));
    const response = await fetch(base); const html = await response.text();
    assert.equal(response.status, 200);
    const home = html.match(/<div id="root">([\s\S]*?)<script id="nucleus-data"/)?.[1];
    assert.ok(home); assert.match(home, /class="logo-landing"/); assert.match(home, /NucleusLogo_transparent[^" ]*\.png/);
    assert.match(home, /class="dp-card/); assert.match(home, /Artificial Intelligence/); assert.match(home, /Data Structures/);
    assert.doesNotMatch(html, /Enable JavaScript to explore events and apply/);
    assert.match(html, /Updated from the database/); assert.match(html, /application\/ld\+json/);
    const about = await fetch(`${base}/about`).then(r => r.text());
    assert.match(about, /class="domain-grid"/); assert.match(about, /Data Structures/); assert.match(about, /site-header/);
    for (const [route, heading] of [['/team', 'NUCLEUS'], ['/members', 'Our Members'], ['/alumni', 'NUCLEUS Alumni']]) {
      const peopleResponse = await fetch(`${base}${route}`);
      assert.equal(peopleResponse.status, 200);
      const peopleHtml = await peopleResponse.text();
      assert.ok(peopleHtml.includes(heading));
      assert.match(peopleHtml, /team-header/);
      if (route !== '/team') assert.doesNotMatch(peopleHtml, /class="constellation-section"/);
      if (route === '/members') assert.match(peopleHtml, /Salim Pallikal/);
    }
    assert.ok(!html.includes('</script><script>alert(1)</script>')); assert.match(html, /id="nucleus-data"/);
    const admin = await fetch(`${base}/admin`).then(r => r.text()); assert.match(admin, /noindex,nofollow/); assert.ok(!admin.includes('Updated from the database'));
    assert.equal((await fetch(`${base}/does-not-exist`)).status, 404);
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map(m => m[1]); assert.ok(assets.length > 0);
    for (const asset of assets) { const assetRes = await fetch(base + asset); assert.equal(assetRes.status, 200); assert.match(assetRes.headers.get('cache-control'), /immutable/); }
  }, { dist: resolve('dist/client'), render });
});

test('production sessions use secure host-only cookies and authentication is rate limited', async () => {
  await fixture(async ({ request }) => {
    const response = await request('/admin/login', 'POST', { email: 'admin@example.com', password: 'correct-horse-battery-2026' });
    assert.match(response.headers.get('set-cookie'), /^__Host-nucleus_session=/); assert.match(response.headers.get('set-cookie'), /Secure/);
    assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    for (let i = 0; i < 7; i++) assert.equal((await request('/admin/login', 'POST', { email: 'admin@example.com', password: 'wrong' })).status, 401);
    assert.equal((await request('/admin/login', 'POST', { email: 'admin@example.com', password: 'wrong' })).status, 429);
  }, { production: true, origin: 'https://nucleussjec.in', limits: true });
});
