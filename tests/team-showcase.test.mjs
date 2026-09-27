import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleCore, exampleMembers } from '../src/components/team/team-data.ts';
import { filterRoster, groupRoster } from '../src/components/team/roster.ts';

test('example constellation contains 12 unique core and 4 roster members across 2 teams', () => {
  assert.equal(exampleCore.length, 12);
  assert.equal(exampleMembers.length, 4);
  assert.equal(new Set([...exampleCore, ...exampleMembers].map(person => person.id)).size, 16);
  assert.equal(groupRoster(exampleMembers).length, 2);
  const groups = groupRoster(exampleMembers);
  const community = groups.find(([name]) => name === 'Community');
  assert.ok(community);
  assert.equal(community[1].length, 3);
});

test('roster searches names, teams, and roles case-insensitively and combines terms', () => {
  assert.equal(filterRoster(exampleMembers, '  operations  ').length, 1);
  assert.deepEqual(filterRoster(exampleMembers, 'salim community').map(person => person.name), ['Salim Pallikal']);
  assert.equal(filterRoster(exampleMembers, 'discipline').length, 1);
  assert.equal(filterRoster(exampleMembers, 'not-a-member').length, 0);
  assert.equal(filterRoster(exampleMembers, '   ').length, 4);
  assert.equal(filterRoster(exampleMembers, 'manvitha').length, 1);
});

test('grouping preserves names and first-seen team order including unusual category names', () => {
  const people = [{ id: '1', name: 'One', team: '__proto__', role: 'Member' }, { id: '2', name: 'Two', team: 'Design', role: 'Member' }, { id: '3', name: 'Three', team: '__proto__', role: 'Member' }];
  const groups = groupRoster(people);
  assert.deepEqual(groups.map(([name]) => name), ['__proto__', 'Design']);
  assert.deepEqual(groups[0][1].map(person => person.id), ['1', '3']);
  assert.deepEqual(groupRoster([]), []);
});
