<<<<<<< HEAD
import { existsSync } from 'node:fs';
import { openDatabase } from './db.mjs';
import { createApp } from './app.mjs';

if (existsSync('.env')) process.loadEnvFile('.env');
if (process.env.NODE_ENV === 'production' && !/^https:\/\//.test(process.env.APP_ORIGIN || '')) throw new Error('Production requires APP_ORIGIN with the public HTTPS URL.');
const db = openDatabase();
const port = Number(process.env.PORT || 3001), host = process.env.HOST || '127.0.0.1';
const render = existsSync('dist/server/entry-server.js') ? (await import('../dist/server/entry-server.js')).render : undefined;
const server = createApp(db, { render }).listen(port, host, () => console.log(`Nucleus server ready at http://${host}:${port}`));
function shutdown() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
=======
import { existsSync } from 'node:fs';
import { openDatabase } from './db.mjs';
import { createApp } from './app.mjs';

if (existsSync('.env')) process.loadEnvFile('.env');
if (process.env.NODE_ENV === 'production' && !/^https:\/\//.test(process.env.APP_ORIGIN || '')) throw new Error('Production requires APP_ORIGIN with the public HTTPS URL.');
const db = openDatabase();
const port = Number(process.env.PORT || 3001), host = process.env.HOST || '127.0.0.1';
const render = existsSync('dist/server/entry-server.js') ? (await import('../dist/server/entry-server.js')).render : undefined;
const server = createApp(db, { render }).listen(port, host, () => console.log(`Nucleus server ready at http://${host}:${port}`));
setInterval(() => {}, 1 << 30); // Prevent Node from exiting prematurely
function shutdown() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
>>>>>>> 24551fe568b8ad3d66a35507c45e3569b24f2d26
