"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { motion, useScroll, useTransform, type HTMLMotionProps, type MotionValue } from 'motion/react';
import { cn } from '../../lib/utils';
import './text-reveal.css';

export interface TextRevealProps extends Omit<HTMLMotionProps<'span'>, 'children'> {
  text: string;
  mode?: 'letter' | 'word';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  delay?: number;
  stagger?: number;
  duration?: number;
  blur?: string;
  y?: number;
  /** False ties the stagger to scroll position, including reverse scrolling. */
  once?: boolean;
}

function RevealUnit({ children, progress, start, end, blur, y, enabled }: {
  children: string; progress: MotionValue<number>; start: number; end: number;
  blur: number; y: number; enabled: boolean;
}) {
  const amount = useTransform(progress, [start, end], [0, 1]);
  const opacity = useTransform(amount, value => 1 - Math.pow(1 - value, 2));
  const filter = useTransform(amount, value => value >= 1 ? 'none' : `blur(${((1 - value) * blur).toFixed(2)}px)`);
  const translateY = useTransform(amount, value => (1 - value) * y);
  return <motion.span className="text-reveal__unit" style={enabled ? { opacity, filter, y: translateY } : undefined}>{children}</motion.span>;
}

/** The supplied blur/stagger effect, driven by scroll rather than a one-shot timer. */
export function TextReveal({
  text, mode = 'letter', as = 'span', delay = .05, stagger = .025,
  duration = .5, blur = '6px', y = 10, once = false, className, ...props
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(false);
  const held = useRef(0);
  // A longer travel gives each letter time to resolve, then retraces the same
  // opacity, blur, and lift when the reader scrolls back toward the start.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.94', 'start 0.46'] });
  const progress = useTransform(scrollYProgress, value => {
    held.current = once ? Math.max(held.current, value) : value;
    return held.current;
  });
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnabled(!preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const count = words.reduce((total, word) => /^\s*$/.test(word) ? total : total + (mode === 'word' ? 1 : Array.from(word).length), 0);
  const total = Math.max(.01, delay + duration + Math.max(0, count - 1) * stagger);
  const blurPixels = Math.min(8, Math.max(0, parseFloat(blur) || 0));
  const Tag = motion[as] as ComponentType<HTMLMotionProps<'span'>>;
  let index = 0;

  return <Tag {...props} ref={ref} initial={false} className={cn('text-reveal', className)} data-text-reveal="" data-reveal-ready={enabled ? 'true' : 'false'}>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true">{words.map((word, wordIndex) => /^\s*$/.test(word) ? word : <span className="text-reveal__word" key={wordIndex}>
      {(mode === 'word' ? [word] : Array.from(word)).map((unit, unitIndex) => {
        const start = (delay + index++ * stagger) / total;
        return <RevealUnit key={unitIndex} progress={progress} start={start} end={start + duration / total} blur={blurPixels} y={y} enabled={enabled}>
          {unit}
        </RevealUnit>;
      })}
    </span>)}</span>
  </Tag>;
}
