'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';
import MemberPhoto from './MemberPhoto';
import type { CoreMember } from './types';

interface OrbitProps {
  core: CoreMember[];
  selectedId: string | null;
  onSelect: (member: CoreMember) => void;
  active: boolean;
  reducedMotion: boolean;
  children: ReactNode;
}

export default function CoreOrbit({ core, selectedId, onSelect, active, reducedMotion, children }: OrbitProps) {
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const memberButtons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % core.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + core.length) % core.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = core.length - 1;
    else return;
    event.preventDefault();
    memberButtons.current[next]?.focus({ preventScroll: true });
  }

  const stopped = paused || hovered || focused || Boolean(selectedId) || !active || !pageVisible || reducedMotion;

  return <div className="core-orbit" data-paused={stopped}>
    <div className="orbit-space">
      {/* Only the satellites rotate; the branding is a stationary sibling.
          The original ~0.035 rad/s motion becomes a 180-second compositor
          animation, keeping the same layout accessible without WebGL. */}
      <div className="orbit-stage"
        onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
        onPointerLeave={() => setHovered(false)}>
        <svg className="orbit-path" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <circle cx="50" cy="50" r="50" vectorEffect="non-scaling-stroke" />
        </svg>
        <ul className="orbit-satellites" aria-label="Core team members" aria-describedby="orbit-help"
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
          {core.map((member, index) => {
            const angle = index / core.length * Math.PI * 2 - Math.PI / 2;
            const position = { left: (50 + Math.cos(angle) * 50) + '%', top: (50 + Math.sin(angle) * 50) + '%' } as CSSProperties;
            return <li key={member.id} className="orbit-position" style={position}>
              <button ref={element => { memberButtons.current[index] = element; }}
                type="button" className="orbit-node-label" data-member-id={member.id}
                onKeyDown={event => navigate(event, index)} onClick={() => onSelect(member)}
                aria-label={'Meet ' + member.name + ', ' + member.role} aria-haspopup="dialog">
                <span className="orbit-node-portrait" aria-hidden="true"><MemberPhoto src={member.image} name={member.name} sizes="(max-width: 767px) 44px, 56px" /></span>
                <span className="orbit-node-copy" aria-hidden="true"><span>{member.name}</span><small>{member.role}</small></span>
                <span className="orbit-node-short-name" aria-hidden="true">{member.name.split(' ')[0]}</span>
              </button>
            </li>;
          })}
        </ul>
        {children}
      </div>
    </div>
    <div className="orbit-interface">
      <p id="orbit-help" className="orbit-instruction"><span className="team-signal" /> {core.length ? 'SELECT A MIND. DISCOVER THEIR STORY.' : 'OUR NEXT CORE CONSTELLATION IS TAKING SHAPE.'}<span className="team-sr-only"> Use Tab or arrow keys to browse members, and Enter to open a profile.</span></p>
      {!reducedMotion && core.length > 0 && <button className="team-icon-button" type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume orbit rotation' : 'Pause orbit rotation'} aria-pressed={paused}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}
    </div>
  </div>;
}
