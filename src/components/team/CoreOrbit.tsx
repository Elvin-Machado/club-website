'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationFrame } from 'framer-motion';
import { Pause, Play, RotateCcw } from 'lucide-react';
import MemberPhoto from './MemberPhoto';
import { LOGO_URL } from '../../lib/logo-url';
import type { CoreMember } from './types';

interface OrbitProps {
  core: CoreMember[];
  selectedId: string | null;
  onSelect: (member: CoreMember) => void;
  active: boolean;
  reducedMotion: boolean;
}

type Point = { x: number; y: number; distance: number };

// Equal distances around an ellipse keep portraits apart at its narrow ends.
function orbitPath(rx: number, ry: number) {
  const points: Point[] = [];
  let distance = 0;
  for (let i = 0; i <= 240; i++) {
    const angle = i / 240 * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * rx, y = Math.sin(angle) * ry;
    if (i) distance += Math.hypot(x - points[i - 1].x, y - points[i - 1].y);
    points.push({ x, y, distance });
  }
  return points;
}

function pointAt(path: Point[], fraction: number) {
  const distance = ((fraction % 1 + 1) % 1) * path[path.length - 1].distance;
  const end = path.findIndex(point => point.distance >= distance);
  const a = path[Math.max(0, end - 1)], b = path[end];
  const t = (distance - a.distance) / (b.distance - a.distance || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export default function CoreOrbit({ core, selectedId, onSelect, active, reducedMotion }: OrbitProps) {
  const space = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const phase = useRef(0);
  const layout = useRef({ rx: 0, ry: 0, compact: true, path: [] as Point[] });
  const dragging = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  const placeMembers = useCallback(() => {
    const { rx, ry, compact, path } = layout.current;
    if (!path.length || !ry) return;
    const compactRows = new Map<number, number>();
    if (compact) {
      const split = Math.ceil(core.length / 2);
      const sides = [Array.from({ length: split }, (_, index) => index), Array.from({ length: core.length - split }, (_, index) => core.length - 1 - index)];
      for (const side of sides) {
        const heights = side.map(index => nodes.current[index]?.offsetHeight ?? 0);
        const gap = (ry * 2 - heights.reduce((sum, height) => sum + height, 0)) / side.length;
        let cursor = -ry + gap / 2;
        side.forEach((index, row) => {
          compactRows.set(index, cursor + heights[row] / 2);
          cursor += heights[row] + gap;
        });
      }
    }
    nodes.current.forEach((node, index) => {
      if (!node) return;
      let point;
      if (compact) {
        // Two evenly spaced sides leave a clear centre on narrow screens.
        // All members remain present, including without WebGL or motion.
        const right = index < Math.ceil(core.length / 2);
        const y = compactRows.get(index) ?? 0;
        point = { x: (right ? 1 : -1) * rx * Math.sqrt(1 - (y / ry) ** 2), y };
      } else point = pointAt(path, phase.current + index / core.length);
      node.style.transform = `translate(-50%, -50%) translate3d(${point.x}px, ${point.y}px, 0)`;
    });
  }, [core.length]);

  useEffect(() => {
    const element = space.current!, ring = track.current!;
    const measure = () => {
      // Client dimensions are unaffected by the scroll-linked parent scale.
      const rx = ring.clientWidth / 2, ry = ring.clientHeight / 2;
      layout.current = { rx, ry, compact: window.matchMedia('(max-width: 700px)').matches, path: orbitPath(rx, ry) };
      placeMembers();
      element.dataset.ready = 'true';
    };
    const observer = new ResizeObserver(measure);
    observer.observe(ring);
    nodes.current.forEach(node => { if (node) observer.observe(node); });
    measure();
    return () => observer.disconnect();
  }, [placeMembers]);

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useAnimationFrame((_time, delta) => {
    if (!active || !pageVisible || reducedMotion || paused || hovered || focused || selectedId || layout.current.compact || dragging.current !== null) return;
    phase.current += Math.min(delta, 50) / 220_000;
    placeMembers();
  });

  return <div className="core-orbit" onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }}>
    <div ref={space} className="orbit-space" role="group" aria-label="Core team constellation" onPointerDown={event => {
      if (layout.current.compact || reducedMotion || event.pointerType !== 'mouse' || (event.target as HTMLElement).closest('button')) return;
      dragging.current = event.clientX;
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={event => {
      if (dragging.current === null) return;
      phase.current += (event.clientX - dragging.current) / 1600;
      dragging.current = event.clientX;
      placeMembers();
    }} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}>
      <div ref={track} className="orbit-track" aria-hidden="true">
        <svg className="orbit-path" width="100%" height="100%"><ellipse cx="50%" cy="50%" rx="49.8%" ry="49.8%" /></svg>
      </div>
      <div className="constellation-center">
        {/* Crop only the transparent padding; retain the official source asset. */}
        <svg className="constellation-logo" viewBox="420 118 692 645" role="img" aria-label="NUCLEUS logo">
          <image href={LOGO_URL} width="1599" height="899" />
        </svg>
        <h1 id="galaxy-title" className="constellation-title">NUCLEUS</h1>
      </div>
      {core.map((member, index) => <button ref={node => { nodes.current[index] = node; }} key={member.id} type="button"
        className="orbit-node-card orbit-node-label" data-member-id={member.id}
        onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
        onClick={() => onSelect(member)} aria-label={`Meet ${member.name}, ${member.role}`} aria-haspopup="dialog">
        <span className="orbit-portrait-frame" aria-hidden="true"><MemberPhoto src={member.image} name={member.name} sizes="(max-width: 599px) 52px, 80px" /></span>
        <span className="orbit-node-info"><span className="orbit-node-name">{member.name}</span><span className="orbit-node-role">{member.role}</span></span>
      </button>)}
    </div>
    <div className="orbit-interface">
      <span className="orbit-instruction">SELECT A MEMBER TO MEET THE CORE</span>
      {!reducedMotion && <div className="orbit-controls">
        <button type="button" className="team-icon-button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume orbit rotation' : 'Pause orbit rotation'} aria-pressed={paused}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
        <button type="button" className="team-icon-button" onClick={() => { phase.current = 0; placeMembers(); }} aria-label="Reset orbit view"><RotateCcw size={15} /></button>
      </div>}
    </div>
  </div>;
}
