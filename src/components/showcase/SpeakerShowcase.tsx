'use client';

import { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import SpeakerCard from './SpeakerCard';
import SpeakerModal from './SpeakerModal';
import type { Speaker, SpeakerShowcaseProps } from './types';

const COLUMN_LANES = 4;

export default function SpeakerShowcase({ date = 'Est. 2026', title = 'Our Team', speakers }: SpeakerShowcaseProps) {
  const [selected, setSelected] = useState<Speaker | null>(null);
  const reducedMotion = useReducedMotion();
  const select = useCallback((speaker: Speaker) => setSelected(speaker), []);
  const close = useCallback(() => setSelected(null), []);

  return (
    <div className="relative isolate bg-black text-white">
      <div className="relative h-[200vh]">
        <div className="pointer-events-none sticky top-0 flex h-screen flex-col items-center justify-center px-6 text-center">
          <motion.span
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono! text-[10px] tracking-[0.34em] text-zinc-400 uppercase"
          >
            Scroll down to see effect
          </motion.span>
          <motion.span
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.35 }}
            className="relative mt-8 block h-20 w-px overflow-hidden bg-white/15"
            aria-hidden="true"
          >
            <motion.span
              className="absolute inset-x-0 top-0 block h-1/2 bg-linear-to-b from-transparent via-white to-transparent"
              animate={reducedMotion ? undefined : { y: ['-110%', '210%'] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.span>
          <motion.h1
            initial={reducedMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mix-blend-exclusion mt-10 text-[clamp(3rem,18vw,20rem)] leading-[0.82] font-bold tracking-[-0.045em] text-white uppercase"
          >
            {title}
          </motion.h1>
          <motion.span
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="mt-8 font-mono! text-[10px] tracking-[0.3em] text-zinc-500 uppercase"
          >
            {date}
          </motion.span>
        </div>
      </div>

      {speakers.length === 0 ? (
        <p className="px-6 py-24 text-center font-mono! text-xs tracking-[0.2em] text-zinc-500 uppercase">
          The roster is being assembled.
        </p>
      ) : (
        <div className="relative z-[-1] mx-auto -mt-[100vh] grid max-w-[1600px] grid-cols-1 gap-x-6 gap-y-14 px-6 pb-32 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 xl:grid-cols-4">
          {speakers.map((speaker, index) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              lane={index % COLUMN_LANES}
              onSelect={select}
            />
          ))}
        </div>
      )}

      <SpeakerModal speaker={selected} onClose={close} />
    </div>
  );
}
