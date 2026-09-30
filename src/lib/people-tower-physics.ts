import { Body, Box, ContactMaterial, Cylinder, GSSolver, Material, Plane, PointToPointConstraint, SAPBroadphase, Vec3, World } from 'cannon-es';
import { BLOCK_SIZE, LAYER_HEIGHT, towerSlots } from './people-tower-motion.ts';

export const PHYSICS_STEP = 1 / 120;
type Point = { x: number; y: number; z: number };
type Slots = ReturnType<typeof towerSlots>;

/** Fixed-step rigid bodies. Only the pointer anchor is kinematic; every plank
 * stays dynamic while dragged or pulled, so contact forces reach its neighbours. */
export function createTowerPhysics(slots: Slots) {
  const floorY = -(Math.ceil(slots.length / 3) - 1) * LAYER_HEIGHT / 2 - BLOCK_SIZE[1] / 2;
  const world = new World({ gravity: new Vec3(0, -9.82, 0), allowSleep: true });
  world.broadphase = new SAPBroadphase(world);
  const solver = world.solver as GSSolver;
  solver.iterations = 24; solver.tolerance = 1e-6;
  const wood = new Material('tower-block'), stone = new Material('tower-foundation');
  const contact = { friction: .38, restitution: 0, contactEquationStiffness: 1e8, contactEquationRelaxation: 4 };
  world.addContactMaterial(new ContactMaterial(wood, wood, contact));
  world.addContactMaterial(new ContactMaterial(wood, stone, { ...contact, friction: .55 }));
  const floor = new Body({ mass: 0, material: stone, shape: new Plane(), position: new Vec3(0, floorY - .28, 0) });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(floor);
  const plinth = new Body({ mass: 0, material: stone, shape: new Cylinder(2.6, 2.75, .28, 24), position: new Vec3(0, floorY - .14, 0) });
  world.addBody(plinth);
  const shape = new Box(new Vec3(BLOCK_SIZE[0] / 2, BLOCK_SIZE[1] / 2, BLOCK_SIZE[2] / 2));
  const bodies = slots.map(slot => {
    const body = new Body({ mass: .36, material: wood, shape, position: new Vec3(...slot.position),
      linearDamping: .08, angularDamping: .18, sleepSpeedLimit: .07, sleepTimeLimit: .8 });
    body.quaternion.setFromEuler(0, slot.yaw, 0); world.addBody(body); return body;
  });
  const anchor = new Body({ type: Body.KINEMATIC, collisionFilterGroup: 0, collisionFilterMask: 0 });
  const target = new Vec3(), pivot = new Vec3(), velocity = new Vec3(), pullStart = new Vec3(), pullEnd = new Vec3();
  let joint: PointToPointConstraint | undefined, held = -1, pullTime = -1, accumulator = 0, disposed = false;

  const wake = () => bodies.forEach(body => { if (body.world) body.wakeUp(); });
  function release() {
    // A plank held still in the air can sleep. Removing its constraint must
    // wake it again so gravity takes over immediately after pointer release.
    if (held >= 0) bodies[held].wakeUp();
    if (joint) world.removeConstraint(joint);
    if (anchor.world) world.removeBody(anchor);
    joint = undefined; held = -1; pullTime = -1; anchor.velocity.setZero();
  }
  function grab(index: number, point: Point) {
    release();
    const body = bodies[index];
    if (!body?.world) return false;
    held = index; anchor.position.set(point.x, point.y, point.z); target.copy(anchor.position);
    body.pointToLocalFrame(anchor.position, pivot);
    world.addBody(anchor);
    joint = new PointToPointConstraint(body, pivot, anchor, new Vec3(), 100);
    joint.collideConnected = false; world.addConstraint(joint); wake(); return true;
  }
  function move(point: Point) {
    if (!joint) return;
    target.set(Math.max(-10, Math.min(10, point.x)), Math.max(floorY + .1, Math.min(14, point.y)), Math.max(-10, Math.min(10, point.z)));
  }
  function pull(index: number) {
    const body = bodies[index];
    if (!body?.world || !grab(index, body.position)) return;
    pullStart.copy(body.position);
    body.quaternion.vmult(new Vec3(slots[index].direction * 4.5, 0, 0), pullEnd);
    pullEnd.vadd(pullStart, pullEnd); pullTime = 0;
  }
  function remove(index: number) {
    if (held === index) release();
    const body = bodies[index];
    if (body?.world) { world.removeBody(body); wake(); }
  }
  function reset(completed = 0) {
    release(); accumulator = 0;
    bodies.forEach((body, index) => {
      const slot = slots[index];
      body.position.set(...slot.position); body.quaternion.setFromEuler(0, slot.yaw, 0);
      body.previousPosition.copy(body.position); body.interpolatedPosition.copy(body.position);
      body.previousQuaternion.copy(body.quaternion); body.interpolatedQuaternion.copy(body.quaternion);
      body.velocity.setZero(); body.angularVelocity.setZero(); body.force.setZero(); body.torque.setZero();
      body.aabbNeedsUpdate = true;
      if (index < completed) { if (body.world) world.removeBody(body); }
      else { if (!body.world) world.addBody(body); body.wakeUp(); }
    });
    world.broadphase.dirty = true;
  }
  const moving = () => held >= 0 || bodies.some(body => body.world && body.sleepState !== Body.SLEEPING);
  function step(delta: number) {
    if (disposed || !moving()) return false;
    accumulator += Math.min(.05, Math.max(0, delta));
    let changed = false;
    while (accumulator >= PHYSICS_STEP) {
      if (joint) {
        if (pullTime >= 0) {
          pullTime += PHYSICS_STEP;
          pullStart.lerp(pullEnd, Math.min(1, pullTime / .7), target);
        }
        target.vsub(anchor.position, velocity); velocity.scale(18, velocity);
        const speed = velocity.length(); if (speed > 7) velocity.scale(7 / speed, velocity);
        anchor.velocity.copy(velocity);
      }
      world.step(PHYSICS_STEP); accumulator -= PHYSICS_STEP; changed = true;
      if (pullTime >= 1) release();
    }
    return changed;
  }
  function dispose() {
    if (disposed) return;
    release(); disposed = true;
    [...world.bodies].forEach(body => world.removeBody(body));
    world.contacts.length = 0; world.frictionEquations.length = 0;
  }
  return { world, bodies, floorY, step, moving, grab, move, release, pull, remove, reset, dispose };
}
