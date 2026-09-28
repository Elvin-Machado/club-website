const fs = require('fs');
let code = fs.readFileSync('src/lib/event-world.ts', 'utf8');

code = code.replace('let mode: string = \'\',', 'let routeIndex = 1;\n  let mode: string = \'\',');

const cmdRegex = /if \(command !== props\.command\.serial\) \{[\s\S]*?if \(props\.mode === 'explore'\) focus\(\);\s*\}/;
const cmdReplace = `if (command !== props.command.serial) {
      command = props.command.serial;
      const destination = props.command.station;
      position = destination === null ? { ...SPAWN } : { ...stations[destination].position };
      let nearestIdx = 1;
      let minDist = Infinity;
      for (let i = 1; i < WORLD.route.length; i++) {
        const p = WORLD.route[i];
        const d = Math.hypot(p[0] - position.x, p[1] - position.z);
        if (d < minDist) { minDist = d; nearestIdx = i; }
      }
      routeIndex = nearestIdx < WORLD.route.length - 1 ? nearestIdx + 1 : nearestIdx;
      yaw = START_YAW; pitch = 0; resetInput();
      arrival = { candidate: null, stillFor: 0, dismissed: destination };
      if (props.mode === 'explore') focus();
    }`;
code = code.replace(cmdRegex, cmdReplace);

const exploreRegex = /if \(mode === 'explore'\) \{[\s\S]*?else \{ keys\.clear\(\); arrival\.stillFor = 0; \}\s*camera\.position\.set\(position\.x, EYE, position\.z\);\s*camera\.rotation\.set\(pitch, yaw, 0, 'YXZ'\);\s*\}/;
const exploreReplace = `if (mode === 'explore') {
      const active = !paused;
      if (active) {
        let targetPoint = WORLD.route[routeIndex];
        let dx = targetPoint[0] - position.x;
        let dz = targetPoint[1] - position.z;
        let distToTarget = Math.hypot(dx, dz);
        
        const speed = WALK_SPEED * 0.8;
        let moveDist = speed * dt;
        
        if (distToTarget <= moveDist) {
          position.x = targetPoint[0];
          position.z = targetPoint[1];
          if (routeIndex < WORLD.route.length - 1) {
             routeIndex++;
          }
        } else {
          position.x += (dx / distToTarget) * moveDist;
          position.z += (dz / distToTarget) * moveDist;
        }

        if (distToTarget > 0.001) {
           let targetYaw = Math.atan2(dx, dz) + Math.PI;
           // Smooth yaw interpolation
           let yawDiff = Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw));
           yaw += yawDiff * Math.min(1, dt * 6.0);
        }

        moving = true;
        const next = updateArrival(arrival, position, moving, dt, stations);
        arrival = next;
        if (next.arrived !== null) openStation(next.arrived);
      } else { arrival.stillFor = 0; }
      
      camera.position.set(position.x, EYE, position.z);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }`;
code = code.replace(exploreRegex, exploreReplace);

fs.writeFileSync('src/lib/event-world.ts', code);
