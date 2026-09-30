import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSite, hashPassword, verifyPassword } from './db.mjs';
import { createCoasterTrack } from '../src/lib/event-coaster.ts';
import { createStationPlanner } from '../src/lib/event-layout.ts';
import { createExperienceStations } from '../src/lib/experience-stations.ts';

const safeUrl = z.union([z.literal(''), z.url().refine(value => ['https:', 'http:'].includes(new URL(value).protocol), 'Use an https:// URL')]);
const isoDate = z.union([z.literal(''), z.iso.datetime({ offset: true })]);
const eventSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().min(20).max(1600), startsAt: z.iso.datetime({ offset: true }), endsAt: isoDate, location: z.string().trim().min(2).max(200), category: z.string().trim().min(2).max(60), registrationUrl: safeUrl, albumUrl: safeUrl.optional(), published: z.boolean() }).refine(e => !e.endsAt || new Date(e.endsAt) >= new Date(e.startsAt), 'End date must follow the start date');
const projectSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().min(20).max(1600), domain: z.string().trim().min(2).max(60), status: z.string().trim().min(2).max(60), url: safeUrl, repositoryUrl: safeUrl, published: z.boolean() });
const memberSchema = z.object({ name: z.string().trim().min(2).max(100), role: z.string().trim().min(2).max(100), initials: z.string().trim().min(1).max(4) });
const settingsSchema = z.object({ recruitmentOpen: z.boolean(), recruitmentMessage: z.string().trim().min(10).max(600), recruitmentDeadline: isoDate, cycle: z.string().trim().min(1).max(50), contactEmail: z.email().max(254), instagramUrl: safeUrl, githubUrl: safeUrl, linkedinUrl: safeUrl });
const applicationSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.email().max(254).transform(e => e.toLowerCase()), year: z.enum(['1', '2', '3', '4']), domain: z.enum(['aiml', 'web', 'dsa']), motivation: z.string().trim().min(30).max(1600), portfolio: safeUrl, consent: z.literal(true), website: z.literal('').optional() });
const hashToken = token => createHash('sha256').update(token).digest('hex');
const applicationRow = row => ({ id: row.id, name: row.name, email: row.email, year: row.year, domain: row.domain, motivation: row.motivation, portfolio: row.portfolio, cycle: row.cycle, status: row.status, createdAt: row.created_at });
const experienceTrack = createCoasterTrack(), stationPlanner = createStationPlanner(experienceTrack);
const photoSchema = z.object({ name: z.string().trim().min(1).max(180), mime: z.enum(['image/webp', 'image/jpeg', 'image/png']), data: z.string().max(700_000).regex(/^[A-Za-z0-9+/]+={0,2}$/) });

export function createApp(db, { production = process.env.NODE_ENV === 'production', origin = process.env.APP_ORIGIN, dist = resolve('dist/client'), limits = true, render } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(compression({ threshold: 1024 }));
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: production ? { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], fontSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] } } : false, strictTransportSecurity: production }));
  const smallJson = express.json({ limit: '48kb' });
  app.use('/api', (req, res, next) => /^\/admin\/experience-events\//.test(req.path) ? next() : smallJson(req, res, next));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const allowed = new Set(production ? [origin] : [origin, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001']);
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !allowed.has(req.headers.origin)) return res.status(403).json({ error: 'This request did not come from the Nucleus website.' });
    next();
  });
  const limiter = (limit, windowMs) => limits ? rateLimit({ limit, windowMs, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Please try again later.' } }) : (_req, _res, next) => next();
  app.use('/api', limiter(400, 60_000));
  app.get('/api/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok' }); });
  app.get('/api/site', (_req, res) => res.json(getSite(db)));
  app.get('/api/event-photos/:id', (req, res) => {
    const photo = db.prepare("SELECT p.mime,p.data,c.body FROM event_photos p JOIN content c ON c.kind=p.kind AND c.id=p.event_id WHERE p.id=?").get(req.params.id);
    if (!photo || !JSON.parse(photo.body).published) return res.status(404).json({ error: 'Photo not found.' });
    res.type(photo.mime).send(Buffer.from(photo.data));
  });

  const cookieName = production ? '__Host-nucleus_session' : 'nucleus_session';
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: production, path: '/', maxAge: 12 * 60 * 60 * 1000 };
  const dummyPassword = hashPassword(randomBytes(32).toString('hex'));
  function auth(req, res, next) {
    const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return res.status(401).json({ error: 'Please sign in to the control room.' });
    const session = db.prepare('SELECT s.*,a.email FROM sessions s JOIN admins a ON s.admin_id=a.id WHERE s.token_hash=? AND s.expires_at>?').get(hashToken(token), Date.now());
    if (!session) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-csrf-token'] !== session.csrf) return res.status(403).json({ error: 'Session verification failed. Refresh and try again.' });
    req.session = session; next();
  }
  app.post('/api/admin/login', limiter(8, 15 * 60_000), (req, res) => {
    const input = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) }).parse(req.body);
    const admin = db.prepare('SELECT * FROM admins WHERE email=?').get(input.email.toLowerCase());
    const valid = verifyPassword(input.password, admin?.password_hash || dummyPassword);
    if (!admin || !valid) return res.status(401).json({ error: 'Email or password is incorrect.' });
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hashToken(token), admin.id, csrf, Date.now() + cookieOptions.maxAge);
    res.cookie(cookieName, token, cookieOptions).json({ email: admin.email, csrf });
  });
  app.get('/api/admin/session', auth, (req, res) => res.json({ email: req.session.email, csrf: req.session.csrf }));
  app.post('/api/admin/logout', auth, (req, res) => { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(req.session.token_hash); res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined }).json({ ok: true }); });
  app.get('/api/admin/site', auth, (_req, res) => res.json(getSite(db, true)));
  app.put('/api/admin/experience-events/:id', auth, limiter(20, 60_000), express.json({ limit: '9mb' }), (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const event = eventSchema.parse(req.body.event);
    const photos = z.array(photoSchema).max(20).parse(req.body.photos ?? []);
    const existing = getSite(db, true).events.find(item => item.id === id);
    // A retried request cannot create duplicate events or duplicate photo blobs.
    if (existing) return res.json(existing);
    const stations = createExperienceStations(getSite(db).events);
    const occupied = stationPlanner.forEvents(stations.map(station => station.event)).filter(Boolean);
    const placement = stationPlanner.next(occupied);
    if (!placement) return res.status(409).json({ error: 'The track has no safe space for another station. Unpublish an event in the control room before adding one.' });
    let bytes = 0;
    const images = photos.map(photo => {
      const data = Buffer.from(photo.data, 'base64'); bytes += data.length;
      const valid = photo.mime === 'image/webp' ? data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP'
        : photo.mime === 'image/png' ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : data[0] === 255 && data[1] === 216 && data[2] === 255;
      if (!valid || data.length > 500_000 || data.length < 12) throw new z.ZodError([{ code: 'custom', path: ['photos'], message: 'Use valid compressed JPG, PNG or WebP photos under 500 KB each.' }]);
      return { ...photo, id: randomUUID(), data };
    });
    if (bytes > 6_000_000) return res.status(413).json({ error: 'Photos must total less than 6 MB after compression.' });
    const saved = { id, ...event, published: true, trackPosition: placement.distance / experienceTrack.getLength() };
    db.exec('BEGIN IMMEDIATE');
    try {
      const position = db.prepare("SELECT COALESCE(MAX(position),-1)+1 AS n FROM content WHERE kind='events'").get().n;
      db.prepare("INSERT INTO content(kind,id,body,position) VALUES('events',?,?,?)").run(id, JSON.stringify(saved), position);
      const insert = db.prepare('INSERT INTO event_photos(id,event_id,name,mime,data,position) VALUES(?,?,?,?,?,?)');
      images.forEach((photo, index) => insert.run(photo.id, id, photo.name, photo.mime, photo.data, index));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    res.status(201).json(getSite(db).events.find(item => item.id === id));
  });
  app.put('/api/admin/settings', auth, (req, res) => {
    const data = settingsSchema.parse(req.body);
    if (data.recruitmentOpen && data.recruitmentDeadline && new Date(data.recruitmentDeadline).getTime() <= Date.now()) return res.status(400).json({ error: 'Choose a future deadline before opening recruitment.' });
    db.prepare('UPDATE settings SET body=? WHERE id=1').run(JSON.stringify(data)); res.json(data);
  });
  const schemas = { events: eventSchema, projects: projectSchema, team: memberSchema };
  app.put('/api/admin/content/:kind/:id', auth, (req, res) => {
    const { kind, id } = req.params;
    if (!schemas[kind] || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return res.status(400).json({ error: 'Invalid content identifier.' });
    const previous = db.prepare('SELECT body FROM content WHERE kind=? AND id=?').get(kind, id);
    const trackPosition = kind === 'events' && previous ? JSON.parse(previous.body).trackPosition : undefined;
    // Creation order belongs to the server. Editing a role must not turn an
    // established member into a new foundation block; legacy dates stay absent.
    const createdAt = kind === 'team' ? (previous ? JSON.parse(previous.body).createdAt : new Date().toISOString()) : undefined;
    const data = { id, ...schemas[kind].parse(req.body), ...(trackPosition !== undefined ? { trackPosition } : {}), ...(createdAt !== undefined ? { createdAt } : {}) };
    const position = db.prepare('SELECT COALESCE(MAX(position),-1)+1 AS n FROM content WHERE kind=?').get(kind).n;
    db.prepare('INSERT INTO content(kind,id,body,position) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body').run(kind, id, JSON.stringify(data), position);
    res.json(data);
  });
  app.delete('/api/admin/content/:kind/:id', auth, (req, res) => {
    if (!schemas[req.params.kind]) return res.status(400).json({ error: 'Invalid content type.' });
    db.prepare('DELETE FROM content WHERE kind=? AND id=?').run(req.params.kind, req.params.id); res.json({ ok: true });
  });
  app.get('/api/admin/applications', auth, (req, res) => {
    const cursor = z.coerce.number().int().nonnegative().default(0).parse(req.query.offset);
    const rows = db.prepare('SELECT * FROM applications ORDER BY created_at DESC LIMIT 100 OFFSET ?').all(cursor);
    res.json({ items: rows.map(applicationRow), total: db.prepare('SELECT COUNT(*) AS n FROM applications').get().n });
  });
  app.patch('/api/admin/applications/:id', auth, (req, res) => {
    const { status } = z.object({ status: z.enum(['new', 'reviewing', 'accepted', 'declined']) }).parse(req.body);
    const result = db.prepare('UPDATE applications SET status=? WHERE id=?').run(status, req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Application not found.' });
    res.json({ ok: true });
  });
  app.delete('/api/admin/applications/:id', auth, (req, res) => { db.prepare('DELETE FROM applications WHERE id=?').run(req.params.id); res.json({ ok: true }); });
  app.post('/api/applications', limiter(5, 60 * 60_000), (req, res) => {
    const settings = getSite(db).settings;
    if (!settings.recruitmentOpen) return res.status(409).json({ error: 'Recruitment is currently closed. Follow Nucleus for the next intake.' });
    const input = applicationSchema.parse(req.body), id = randomUUID();
    try {
      db.prepare('INSERT INTO applications(id,name,email,year,domain,motivation,portfolio,cycle,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id, input.name, input.email, input.year, input.domain, input.motivation, input.portfolio, settings.cycle, new Date().toISOString());
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'An application with this email already exists for this intake. Contact the club if you need to update it.' });
      throw error;
    }
    res.status(201).json({ id, message: 'Your application has been received. Keep your reference number for follow-up.' });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues.map(i => `${i.path.join('.') || 'Form'}: ${i.message}`).join('; ') });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'The submitted form is too large.' });
    if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'Invalid JSON.' });
    console.error('Request failed:', error.message); res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  if (existsSync(resolve(dist, 'index.html'))) {
    app.use('/assets', express.static(resolve(dist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api') || req.path.startsWith('/assets')) return next();
      if (!['/', '/about', '/events', '/events-test', '/projects', '/team', '/recruitment'].includes(req.path.replace(/\/$/, '') || '/') && !/^\/admin(?:\/|$)/.test(req.path)) return next();
      let html = readFileSync(resolve(dist, 'index.html'), 'utf8');
      if (req.path.startsWith('/admin')) html = html.replace('</head>', '<meta name="robots" content="noindex,nofollow"></head>').replace('Nucleus — Where curious minds connect | SJEC', 'Control room | Nucleus');
      else if (render) {
        const data = getSite(db);
        const safeData = JSON.stringify(data).replace(/</g, '\\u003c');
        html = html.replace('<div id="root"></div>', () => `<div id="root">${render(data, req.originalUrl)}</div><script id="nucleus-data" type="application/json">${safeData}</script>`);
        const organization = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Nucleus SJEC', url: origin || 'https://nucleussjec.in', logo: `${origin || 'https://nucleussjec.in'}/brain-mark.svg`, email: data.settings.contactEmail, sameAs: [data.settings.instagramUrl, data.settings.githubUrl, data.settings.linkedinUrl].filter(Boolean), parentOrganization: { '@type': 'CollegeOrUniversity', name: 'St. Joseph Engineering College', address: { '@type': 'PostalAddress', addressLocality: 'Mangaluru', addressCountry: 'IN' } } };
        html = html.replace('</head>', () => `<script type="application/ld+json">${JSON.stringify(organization).replace(/</g, '\\u003c')}</script></head>`);
      }
      res.set('Cache-Control', 'no-cache').type('html').send(html);
    });
    app.use((_req, res) => res.status(404).type('html').send('<h1>Page not found</h1><a href="/">Return to Nucleus</a>'));
  }
  return app;
}
