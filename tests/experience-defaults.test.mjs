import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { render } from '../dist/server/entry-server.js';
import { createExperienceStations } from '../src/lib/experience-stations.ts';
const data=JSON.parse(await readFile(new URL('../shared/public-data.json',import.meta.url),'utf8'));
test('a one-event site gets two clearly labelled preview stations on Experiences',()=>{
  const events=data.events.slice(0,1),stations=createExperienceStations(events);
  assert.equal(stations.length,3);assert.equal(stations.filter(s=>s.event===null).length,2);
  const html=render({...data,events},'/events');
  assert.match(html,/Nucleus roller coaster/);assert.match(html,/Events <span>3<\/span>/);assert.match(html,/Add Event/);
});
test('published additions remain visible in the server-rendered station count',()=>{
  const event={...data.events[0],id:'new-photo-event',trackPosition:.72};
  const html=render({...data,events:[...data.events,event]},'/events');
  assert.match(html,/Events <span>4<\/span>/);assert.doesNotMatch(html,/class="nx-joystick"/);
});
