// Fixed, fictional example portraits. Run once to refresh the local assets.
// Photos: Unsplash. Display font: Space Grotesk (SIL Open Font License).
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('public/team', { recursive: true });
await mkdir('public/fonts', { recursive: true });
const ids = [
  'photo-1506794778202-cad84cf45f1d', 'photo-1534528741775-53994a69daeb',
  'photo-1500648767791-00dcc994a43e', 'photo-1524504388940-b1c1722653e1',
  'photo-1519085360753-af0119f7cbe7', 'photo-1524250502761-1ac6f2e30d43',
  'photo-1519345182560-3f2917c472ef', 'photo-1517841905240-472988babdf9',
];
for (const [index, id] of ids.entries()) {
  const response = await fetch(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&h=1500&q=85`);
  if (!response.ok) throw new Error(`Portrait ${index + 1}: ${response.status}`);
  await writeFile(`public/team/portrait-${index + 1}.jpg`, Buffer.from(await response.arrayBuffer()));
  console.log(`Saved portrait ${index + 1}`);
}
const fontCSS = await fetch('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(response => response.text());
const fontURL = [...fontCSS.matchAll(/url\((https:[^)]+)\)/g)].at(-1)?.[1];
if (!fontURL) throw new Error('No font URL found');
const font = await fetch(fontURL);
if (!font.ok) throw new Error(`Font: ${font.status}`);
await writeFile('public/fonts/space-grotesk.ttf', Buffer.from(await font.arrayBuffer()));
const license = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/OFL.txt');
if (!license.ok) throw new Error(`Font license: ${license.status}`);
await writeFile('public/fonts/SPACE-GROTESK-LICENSE.txt', await license.text());
console.log('Saved Space Grotesk and font license');
