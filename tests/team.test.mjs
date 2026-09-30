import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { organiseTeam, memberIntroduction } from '../src/lib/team.ts';

const seed = JSON.parse(readFileSync(new URL('../shared/public-data.json', import.meta.url), 'utf8'));

test('team keeps the requested core order and preserves every existing person', () => {
  const { core, members } = organiseTeam(seed.team);
  assert.deepEqual(core.map(role => role.title), ['President', 'Vice President', 'Secretary', 'Tech Lead', 'AI & ML Lead', 'Dev Lead', 'DSA Lead', 'System Design Lead', 'Treasurer', 'Plan & Strategy Lead', 'Media Lead', 'Discipline Head']);
  assert.equal(core[0].people[0].name, 'Poorvik Kuthyala');
  assert.equal(core[3].people[0].id, 'prajwal');
  assert.equal(core[7].people.length, 0, 'Do not invent a System Design Lead');
  assert.ok(members.some(member => member.id === 'deona' && member.role === 'Event Lead'));
  const displayed = [...core.flatMap(role => role.people), ...members].map(member => member.id);
  assert.equal(new Set(displayed).size, seed.team.length);
  assert.deepEqual(displayed.toSorted(), seed.team.map(member => member.id).toSorted());
});

test('team accepts common role aliases, shared roles, and an updated roster', () => {
  const person = (id, role) => ({ id, role, name: id, initials: id.slice(0, 2) });
  const team = [person('a', ' TECH LEAD '), person('b', 'AIML Lead'), person('c', 'Dev Lead'), person('d', 'Plan and Strategy Lead'), person('e', 'System Design Lead'), person('f', 'Technical Lead'), person('g', 'Member')];
  const { core, members } = organiseTeam(team);
  assert.equal(core[3].people.length, 2);
  assert.equal(core[4].people[0].id, 'b');
  assert.equal(core[5].people[0].id, 'c');
  assert.equal(core[7].people[0].id, 'e');
  assert.equal(core[9].people[0].id, 'd');
  assert.deepEqual(members.map(member => member.id), ['g']);
  assert.equal(organiseTeam([]).core.length, 12);
  assert.equal(organiseTeam([]).members.length, 0);
});

test('introductions prefer saved biographies and fall back without inventing personal achievements', () => {
  const member = seed.team.find(member => member.id === 'salim');
  assert.equal(memberIntroduction(member), member.bio);
  assert.match(memberIntroduction({ ...member, bio: '' }), /Salim Pallikal/);
  assert.equal(memberIntroduction({ ...member, bio: '  I enjoy building tools for campus.  ' }), 'I enjoy building tools for campus.');
  assert.match(memberIntroduction({ ...member, bio: ' ' }), /Nucleus community/);
  assert.match(memberIntroduction({ ...seed.team.find(member => member.id === 'deona'), bio: '' }), /Event Lead/);
});
