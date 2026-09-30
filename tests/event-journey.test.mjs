import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoasterTrack, initialCoasterJourney, stepCoasterJourney, departCoasterStation, sampleTrack, approachScale, nextCoasterStop, COASTER_SPEED, BOOST_SPEED, APPROACH_FLOOR } from '../src/lib/event-coaster.ts';
import { createStationPlanner } from '../src/lib/event-layout.ts';
const track=createCoasterTrack(), length=track.getLength(), planner=createStationPlanner(track);

test('anticipation is directional, monotone, bounded and ignores a departed stop', () => {
  const stops = [{ distance: 100, radius: 22, name: 'Test' }];
  assert.equal(approachScale(0, stops, 200, 1), 1);
  assert.equal(approachScale(100, stops, 200, 1), APPROACH_FLOOR);
  assert.ok(APPROACH_FLOOR >= .75, 'approaches preserve cruising momentum');
  let previous = 1;
  for (let distance = 40; distance <= 100; distance++) {
    const scale = approachScale(distance, stops, 200, 1);
    assert.ok(scale <= previous && scale >= APPROACH_FLOOR); previous = scale;
    assert.equal(scale, approachScale(200 - distance, stops, 200, -1));
  }
  assert.equal(approachScale(100, stops, 200, 1, 0), 1);
  assert.equal(approachScale(0, [], 200, 1), 1);
  assert.equal(nextCoasterStop(190, stops, 200, 1).remaining, 110);
});

test('dilated docking stays exact at .45 and .12, in both directions and across the loop seam', () => {
  for (const scale of [.45, .12]) for (const direction of [1, -1]) {
    const stops = [{ distance: direction === 1 ? 5 : 195, radius: 10, name: 'Dock' }];
    let state = initialCoasterJourney(direction === 1 ? 165 : 35);
    state.motion.speed = direction * 15;
    for (let frame = 0; frame < 30000 && state.phase !== 'stopped'; frame++) state = stepCoasterJourney(state, direction, 0, scale / 60, 200, stops, false, { loop: true });
    assert.equal(state.phase, 'stopped'); assert.equal(state.motion.distance, stops[0].distance); assert.equal(state.motion.speed, 0);
  }
});

test('the current coaster docks at every default and procedural station in both directions',()=>{
  const stops=planner.defaults(); for(let i=0;i<4;i++)stops.push(planner.next(stops));
  let state=initialCoasterJourney();
  for(const direction of [1,-1]){
    const arrived=[];
    for(let frame=0;frame<50000;frame++){
      state=stepCoasterJourney(state,direction,sampleTrack(track,state.motion.distance).tangent.y,1/60,length,stops);
      if(state.phase==='stopped'){
        assert.ok(Math.abs(state.motion.distance-stops[state.station].distance)<.016);assert.equal(state.motion.speed,0);
        assert.deepEqual(stepCoasterJourney(state,direction,0,1/60,length,stops),state);
        arrived.push(state.station);state=departCoasterStation(state);
      }
      if(direction===1&&state.motion.distance===length||direction===-1&&state.motion.distance===0)break;
    }
    const order=stops.map((s,i)=>({i,d:s.distance})).sort((a,b)=>(a.d-b.d)*direction).map(s=>s.i);
    assert.deepEqual(arrived,order);
  }
});

test('adding a station preserves a running journey and docking ignores opposite throttle',()=>{
  const stops=planner.defaults();let state=initialCoasterJourney(stops[0].distance-30);
  for(let i=0;i<1000&&state.phase!=='braking';i++)state=stepCoasterJourney(state,1,0,1/60,length,stops);
  assert.equal(state.phase,'braking');const before=structuredClone(state);stops.push(planner.next(stops));assert.deepEqual(state,before);
  for(let i=0;i<1000&&state.phase!=='stopped';i++)state=stepCoasterJourney(state,-1,0,1/60,length,stops);
  assert.equal(state.phase,'stopped');assert.equal(state.station,0);assert.equal(state.motion.distance,stops[0].distance);
});

test('faster cruising and boosting dock without overshoot in both directions at 30 and 120fps', () => {
  for (const fps of [30, 120]) for (const speed of [COASTER_SPEED, BOOST_SPEED]) for (const direction of [-1, 1]) {
    const stops = [{ distance: direction > 0 ? 10 : 490, radius: 22, name: 'Across the seam' }];
    let state = initialCoasterJourney(direction > 0 ? 360 : 140);
    state.motion.speed = speed * direction;
    for (let i = 0; i < fps * 30 && state.phase !== 'stopped'; i++) {
      const scale = approachScale(state.motion.distance, stops, 500, direction);
      state = stepCoasterJourney(state, direction, 0, scale / fps, 500, stops, false, { loop: true, boost: true });
    }
    assert.equal(state.phase, 'stopped');
    assert.equal(state.motion.distance, stops[0].distance);
    assert.equal(state.motion.speed, 0);
  }
});
