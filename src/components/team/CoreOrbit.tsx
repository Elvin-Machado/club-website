'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { AdditiveBlending, Group, Mesh, PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Pause, Play, RotateCcw, MoveHorizontal } from 'lucide-react';
import CoreCarousel from './CoreCarousel';
import SceneBoundary from './SceneBoundary';
import type { CoreMember } from './types';

interface OrbitProps {
  core: CoreMember[];
  selectedId: string | null;
  onSelect: (member: CoreMember) => void;
  onFocused: () => void;
  active: boolean;
}

function Planet({ member, index, total, onSelect, frozen, radius }: { member: CoreMember; index: number; total: number; onSelect: (member: CoreMember, position: Vector3) => void; frozen: boolean; radius: number }) {
  const mesh = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const angle = index / total * Math.PI * 2 + 0.2;
  const select = () => { if (mesh.current && !frozen) onSelect(member, mesh.current.getWorldPosition(new Vector3())); };
  function click(event: ThreeEvent<MouseEvent>) { event.stopPropagation(); if (event.delta < 5) select(); }
  return <group position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
    <mesh ref={mesh} onClick={click} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <sphereGeometry args={[hovered ? 0.17 : 0.13, 24, 16]} /><meshBasicMaterial color={hovered ? '#ffffff' : '#b6efd3'} />
    </mesh>
    <mesh scale={hovered ? 1.4 : 1}><sphereGeometry args={[0.24, 16, 12]} /><meshBasicMaterial color="#b6efd3" transparent opacity={0.09} depthWrite={false} blending={AdditiveBlending} /></mesh>
    <mesh><sphereGeometry args={[0.39, 12, 8]} /><meshBasicMaterial color="#b6efd3" transparent opacity={0.025} depthWrite={false} blending={AdditiveBlending} /></mesh>
    <Html center position={[0, -0.29, 0]} style={{ pointerEvents: frozen ? 'none' : 'auto' }}>
      <button className={`orbit-node-label ${hovered ? 'is-hovered' : ''}`} onPointerDown={event => event.stopPropagation()} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} onClick={select} aria-label={`Meet ${member.name}, ${member.role}`} aria-haspopup="dialog" disabled={frozen}>
        <span>{member.name}</span><small>{member.role}</small>
      </button>
    </Html>
  </group>;
}

function OrbitWorld({ core, selectedId, onSelect, onFocused, paused, resetKey }: OrbitProps & { paused: boolean; resetKey: number }) {
  const radius = core.length <= 8 ? 4.6 : 5.8;
  const group = useRef<Group>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, clock } = useThree();
  const [labelsReady, setLabelsReady] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setLabelsReady(true)); return () => cancelAnimationFrame(id); }, []);
  const focusPoint = useRef(new Vector3());
  const startPosition = useRef(new Vector3());
  const startTarget = useRef(new Vector3());
  const originalPosition = useRef(new Vector3(0, 9, 11.5));
  const elapsed = useRef(0);
  const transitioning = useRef(false);
  const notified = useRef(false);
  const idleAt = useRef(0);
  const currentSelection = useRef<string | null>(null);
  const points = useMemo(() => Array.from({ length: 193 }, (_, i): [number, number, number] => { const angle = i / 192 * Math.PI * 2; return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius]; }), [radius]);
  const inner = useMemo(() => points.map(([x, y, z]): [number, number, number] => [x * 0.89, y, z * 0.89]), [points]);
  const destination = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const focusOffset = useMemo(() => new Vector3(0, 2, 3.7), []);

  useEffect(() => {
    if (resetKey > 0 && !selectedId) {
      camera.position.set(0, 9, 11.5);
      controls.current?.target.set(0, 0, 0);
      if (group.current) group.current.rotation.y = 0;
      controls.current?.update();
    }
  }, [resetKey, camera, selectedId]);

  useFrame((state, delta) => {
    const perspective = camera as PerspectiveCamera;
    if (currentSelection.current !== selectedId) {
      if (selectedId) originalPosition.current.copy(camera.position);
      currentSelection.current = selectedId;
      startPosition.current.copy(camera.position);
      startTarget.current.copy(controls.current?.target ?? new Vector3());
      elapsed.current = 0;
      transitioning.current = true;
      notified.current = false;
    }
    if (transitioning.current) {
      elapsed.current += Math.min(delta, 0.05);
      const progress = Math.min(elapsed.current / 0.85, 1);
      const ease = progress * progress * (3 - 2 * progress);
      if (selectedId) { destination.copy(focusPoint.current).add(focusOffset); lookTarget.copy(focusPoint.current); }
      else { destination.copy(originalPosition.current); lookTarget.set(0, 0, 0); }
      camera.position.lerpVectors(startPosition.current, destination, ease);
      controls.current?.target.lerpVectors(startTarget.current, lookTarget, ease);
      perspective.fov = selectedId ? 42 + ease * 13 : 55 - ease * 13;
      perspective.updateProjectionMatrix();
      camera.lookAt(controls.current?.target ?? lookTarget);
      if (selectedId && progress > 0.65 && !notified.current) { notified.current = true; onFocused(); }
      if (progress === 1) transitioning.current = false;
    } else if (!selectedId && !paused && state.clock.elapsedTime > idleAt.current && group.current) {
      group.current.rotation.y += Math.min(delta, 0.05) * 0.035;
    }
  });

  return <>
    <group ref={group}>
      <Line points={points} color="#b6efd3" transparent opacity={0.26} lineWidth={0.8} />
      <Line points={inner} color="#b6efd3" transparent opacity={0.09} lineWidth={0.65} dashed dashSize={0.055} gapSize={0.12} />
      {labelsReady && core.map((member, index) => <Planet key={member.id} member={member} index={index} total={core.length} frozen={Boolean(selectedId)} radius={radius} onSelect={(person, position) => { focusPoint.current.copy(position); onSelect(person); }} />)}
    </group>
    <Html center position={[0, 0, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}><div className="orbit-emblem"><Image src="/brain-mark.svg" alt="Nucleus emblem" width={80} height={80} /><span>NUCLEUS</span><small>OUR COMMON CENTRE</small></div></Html>
    <OrbitControls ref={controls} enabled={!selectedId} enableZoom={false} enablePan={false} enableDamping dampingFactor={0.07} rotateSpeed={0.4} minPolarAngle={0.5} maxPolarAngle={1.12} onStart={() => { idleAt.current = Infinity; }} onEnd={() => { idleAt.current = clock.elapsedTime + 3; }} />
  </>;
}

export default function CoreOrbit(props: OrbitProps) {
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => { if (lost && props.selectedId) props.onFocused(); }, [lost, props.selectedId, props.onFocused]);
  const fallback = <CoreCarousel core={props.core} reducedMotion={false} onSelect={member => { props.onSelect(member); props.onFocused(); }} />;
  if (lost) return fallback;
  return <SceneBoundary fallback={fallback}><div className="core-orbit">
    <div className="orbit-space" aria-label="Interactive core team constellation">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 9, 11.5], fov: 42 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} frameloop={props.active && pageVisible ? 'always' : 'never'} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', () => setLost(true), { once: true }); }}>
        <Suspense fallback={null}><OrbitWorld {...props} paused={paused} resetKey={resetKey} /></Suspense>
      </Canvas>
    </div>
    <div className="orbit-interface"><span className="orbit-instruction"><MoveHorizontal size={16} /> DRAG TO EXPLORE <i /> SELECT A MIND</span><div className="flex gap-2"><button className="team-icon-button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume orbit rotation' : 'Pause orbit rotation'} aria-pressed={paused}>{paused ? <Play size={14} /> : <Pause size={14} />}</button><button className="team-icon-button" onClick={() => setResetKey(key => key + 1)} aria-label="Reset orbit view"><RotateCcw size={15} /></button></div></div>
  </div></SceneBoundary>;
}
