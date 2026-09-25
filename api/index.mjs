import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';

const db = openDatabase();
const app = createApp(db);

export default app;
