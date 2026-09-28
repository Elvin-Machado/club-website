'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { speakerLayout, type Speaker } from './types';

const LANE_SPRINGS = [
  { stiffness: 134, damping: 24 },
  { stiffness: 101, damping: 20 },
  { stiffness: 161, damping: 27 },
  { stiffness: 117, damping: 18 },
] as const;

export interface SpeakerCardProps {
  speaker: Speaker;
  lane?: number;
  onSelect: (speaker: Speaker) => void;
}

export default function SpeakerCard({ speaker, lane = 0, onSelect }: SpeakerCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.35'] });
  const rawScale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const rawOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [0, 1, 1]);
  const { stiffness, damping } = LANE_SPRINGS[lane % LANE_SPRINGS.length];
  const scale = useSpring(rawScale, { stiffness, damping, mass: 0.6 });
  const opacity = useSpring(rawOpacity, { stiffness: stiffness * 0.7, damping, mass: 0.5 });

  return (
    <motion.div ref={ref} style={reducedMotion ? undefined : { scale, opacity }} className="relative">
      <motion.div layoutId={speakerLayout.card(speaker.id)} className="group">
        <button
          type="button"
          id={speakerLayout.trigger(speaker.id)}
          onClick={() => onSelect(speaker)}
          aria-label={`Open profile for ${speaker.name}, ${speaker.role}`}
          className="block w-full cursor-pointer text-left"
        >
          <span className="relative block aspect-3/4 w-full overflow-hidden bg-zinc-900">
            <motion.img
              layoutId={speakerLayout.image(speaker.id)}
              src={speaker.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover grayscale transition-[filter,transform] duration-700 ease-out group-hover:scale-105 group-hover:grayscale-0"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent opacity-70 transition-opacity duration-700 group-hover:opacity-100"
            />
          </span>
          <span className="mt-4 block">
            <motion.span
              layoutId={speakerLayout.name(speaker.id)}
              className="block text-sm font-bold tracking-tight text-white uppercase"
            >
              {speaker.name}
            </motion.span>
            <span className="mt-1 block font-mono! text-[10px] tracking-[0.18em] text-zinc-400 uppercase">
              ({speaker.role})
            </span>
          </span>
        </button>
      </motion.div>
    </motion.div>
  );
}
