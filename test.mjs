import { existsSync } from 'node:fs';
import { openDatabase } from './server/db.mjs';
import { createApp } from './server/app.mjs';

const db = openDatabase();
const port = 3001;
const render = undefined;
const server = createApp(db, { render }).listen(port, () => console.log(`Nucleus server ready at http://127.0.0.1:${port}`));
