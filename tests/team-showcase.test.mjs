import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleCore, exampleMembers } from '../src/components/team/team-data.ts';
import { filterRoster, groupRoster } from '../src/components/team/roster.ts';

test('example constellation contains 8 unique core and 30 roster members across 6 teams', () => {
  assert.equal(exampleCore.length, 8);
  assert.equal(exampleMembers.length, 30);
  assert.equal(new Set([...exampleCore, ...exampleMembers].map(person => person.id)).size, 38);
  assert.equal(groupRoster(exampleMembers).length, 6);
  assert.ok(groupRoster(exampleMembers).every(([, people]) => people.length === 5));
});

test('roster searches names, teams, and roles case-insensitively and combines terms', () => {
  assert.equal(filterRoster(exampleMembers, '  TECH  ').length, 5);
  assert.deepEqual(filterRoster(exampleMembers, 'aditya tech').map(person => person.name), ['Aditya Bhat']);
  assert.equal(filterRoster(exampleMembers, 'developer').length, 5);
  assert.equal(filterRoster(exampleMembers, 'not-a-member').length, 0);
  assert.equal(filterRoster(exampleMembers, '   ').length, 30);
  assert.equal(filterRoster(exampleMembers, 'joel').length, 1);
});

test('grouping preserves names and first-seen team order including unusual category names', () => {
  const people = [{ id: '1', name: 'One', team: '__proto__', role: 'Member' }, { id: '2', name: 'Two', team: 'Design', role: 'Member' }, { id: '3', name: 'Three', team: '__proto__', role: 'Member' }];
  const groups = groupRoster(people);
  assert.deepEqual(groups.map(([name]) => name), ['__proto__', 'Design']);
  assert.deepEqual(groups[0][1].map(person => person.id), ['1', '3']);
  assert.deepEqual(groupRoster([]), []);
});
