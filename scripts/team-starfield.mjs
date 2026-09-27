import { mkdirSync, writeFileSync } from 'node:fs';

// A deterministic SVG keeps the no-WebGL / reduced-motion first frame complete.
let seed = 647;
const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
const stars = Array.from({ length: 460 }, () => {
  const x = (random() * 1600).toFixed(1), y = (random() * 1000).toFixed(1);
  const radius = (0.35 + random() ** 4 * 1.1).toFixed(2);
  return `<circle cx="${x}" cy="${y}" r="${radius}" opacity="${(0.15 + random() * 0.55).toFixed(2)}"/>`;
}).join('');
mkdirSync('public/team', { recursive: true });
writeFileSync('public/team/starfield.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="#000"/><g fill="#cad9d2">${stars}</g></svg>`);
