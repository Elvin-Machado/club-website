'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdditiveBlending, type Group } from 'three';

function Starfield({ mobile, lowPower }: { mobile: boolean; lowPower: boolean }) {
  const group = useRef<Group>(null);
  const count = lowPower ? 450 : mobile ? 750 : 3200;
  const positions = useMemo(() => {
    let seed = 8392;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const points = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 2 + random() * 10;
      points[i * 3] = i % 3 === 0 ? Math.cos(angle) * radius : (random() - 0.5) * 30;
      points[i * 3 + 1] = i % 3 === 0 ? Math.sin(angle) * radius * 0.48 : (random() - 0.5) * 18;
      points[i * 3 + 2] = -random() * 16;
    }
    return points;
  }, [count]);
  const uniforms = useMemo(() => ({ uSize: { value: lowPower ? 18 : 24 } }), [lowPower]);
  useFrame((state, delta) => {
    if (!group.current) return;
    const step = Math.min(delta, 0.05);
    group.current.rotation.z += step * 0.006;
    if (!mobile && !lowPower) {
      state.camera.position.x += (state.pointer.x * 0.3 - state.camera.position.x) * step * 1.5;
      state.camera.position.y += (state.pointer.y * 0.2 - state.camera.position.y) * step * 1.5;
    }
  });
  return <group ref={group} rotation={[0, 0, -0.28]}><points frustumCulled={false}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <shaderMaterial transparent depthWrite={false} blending={AdditiveBlending} uniforms={uniforms}
      vertexShader={`uniform float uSize; varying float vAlpha; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_PointSize=clamp(uSize/-p.z,1.0,3.0); vAlpha=0.25+0.65*fract(position.x*17.31); }`}
      fragmentShader={`varying float vAlpha; void main(){ float d=length(gl_PointCoord-0.5); float glow=1.0-smoothstep(0.0,0.5,d); gl_FragColor=vec4(0.77,0.93,0.87,glow*vAlpha); }`} />
  </points></group>;
}

export default function GalaxyScene(props: { mobile: boolean; lowPower: boolean }) {
  const [active, setActive] = useState(true);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const update = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  if (lost) return null;
  return <Canvas dpr={[1, props.mobile || props.lowPower ? 1 : 1.5]} camera={{ position: [0, 0, 8], fov: 55 }} gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }} frameloop={active ? 'always' : 'never'} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', () => setLost(true), { once: true }); }}>
    <Starfield {...props} />
  </Canvas>;
}
