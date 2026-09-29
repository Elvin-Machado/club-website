import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleCore, exampleMembers } from '../src/components/team/team-data.ts';
import { filterRoster, groupRoster } from '../src/components/team/roster.ts';
import { currentTeam } from '../src/components/team/alumni-data.ts';

test('example constellation contains 12 unique core and 3 roster members in 1 team', () => {
  assert.equal(exampleCore.length, 12);
  assert.equal(exampleMembers.length, 3);
  assert.equal(new Set([...exampleCore, ...exampleMembers].map(person => person.id)).size, 15);
  assert.equal(groupRoster(exampleMembers).length, 1);
  const [community] = groupRoster(exampleMembers);
  assert.equal(community[0], 'Community');
  assert.equal(community[1].length, 3);
});

test('the core orbit covers every leadership seat and leaves no placeholder', () => {
  const roles = exampleCore.map(person => person.role);
  // Discipline Head fills the seat vacated by System Design Lead.
  assert.deepEqual(roles, [
    'President', 'Vice President', 'Secretary', 'Tech Lead', 'AI & ML Lead',
    'Dev Lead', 'DSA Lead', 'Discipline Head', 'Treasurer', 'Event Lead',
    'Planning & Strategy Lead', 'Media Lead',
  ]);
  assert.ok(!roles.includes('System Design Lead'));
  assert.ok(exampleCore.every(person => person.name.trim().length > 0));
  assert.ok(exampleCore.every(person => person.bio && person.bio.length > 40));
});

test('roster searches names, teams, and roles case-insensitively and combines terms', () => {
  assert.equal(filterRoster(exampleMembers, '  community  ').length, 3);
  assert.deepEqual(filterRoster(exampleMembers, 'salim community').map(person => person.name), ['Salim Pallikal']);
  assert.equal(filterRoster(exampleMembers, 'not-a-member').length, 0);
  assert.equal(filterRoster(exampleMembers, '   ').length, 3);
  // Core members are not part of the roster index.
  assert.equal(filterRoster(exampleMembers, 'manvitha').length, 0);
  assert.equal(filterRoster(exampleMembers, 'discipline').length, 0);
});

test('grouping preserves names and first-seen team order including unusual category names', () => {
  const people = [{ id: '1', name: 'One', team: '__proto__', role: 'Member' }, { id: '2', name: 'Two', team: 'Design', role: 'Member' }, { id: '3', name: 'Three', team: '__proto__', role: 'Member' }];
  const groups = groupRoster(people);
  assert.deepEqual(groups.map(([name]) => name), ['__proto__', 'Design']);
  assert.deepEqual(groups[0][1].map(person => person.id), ['1', '3']);
  assert.deepEqual(groupRoster([]), []);
});

test('moving verified IDs to alumni keeps current pages separate without changing the source directory', () => {
  const alumni = [exampleCore[0], exampleMembers[0]];
  const current = currentTeam(exampleCore, exampleMembers, alumni);
  assert.equal(current.core.length, exampleCore.length - 1);
  assert.equal(current.members.length, exampleMembers.length - 1);
  assert.ok(!current.core.some(member => member.id === alumni[0].id));
  assert.ok(!current.members.some(member => member.id === alumni[1].id));
  assert.deepEqual([...current.core, ...current.members, ...alumni].map(member => member.id).sort(), [...exampleCore, ...exampleMembers].map(member => member.id).sort());
  assert.equal(exampleCore.length, 12);
  assert.equal(exampleMembers.length, 3);
});
