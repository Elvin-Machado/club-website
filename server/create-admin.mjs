import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { Writable } from 'node:stream';
import { z } from 'zod';
import { hashPassword, openDatabase } from './db.mjs';

if (existsSync('.env')) process.loadEnvFile('.env');
let muted = false;
const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
let db;
try {
  const email = z.email().parse((await rl.question('Admin email: ')).trim().toLowerCase());
  process.stdout.write('Password (12+ characters; hidden): '); muted = true;
  const password = await rl.question('');
  muted = false; process.stdout.write('\n');
  if (password.length < 12 || password.length > 256) throw new Error('Use a password between 12 and 256 characters.');
  process.stdout.write('Confirm password (hidden): '); muted = true;
  const confirmation = await rl.question(''); muted = false; process.stdout.write('\n');
  if (password !== confirmation) throw new Error('Passwords do not match.');
  db = openDatabase();
  if (db.prepare('SELECT id FROM admins WHERE email=?').get(email)) throw new Error('That administrator already exists.');
  db.prepare('INSERT INTO admins VALUES(?,?,?)').run(randomUUID(), email, hashPassword(password));
  console.log('Administrator created. Sign in at /admin.');
} catch (error) { muted = false; console.error(error.message); process.exitCode = 1; }
finally { rl.close(); db?.close(); }
