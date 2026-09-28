'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Instagram, Linkedin, Mail, Twitter, X } from 'lucide-react';
import { SOCIAL_ORDER, socialHref, speakerLayout, type Speaker, type SpeakerSocials } from './types';

const SOCIAL_ICONS: Record<keyof SpeakerSocials, typeof Twitter> = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  email: Mail,
};

const SOCIAL_LABELS: Record<keyof SpeakerSocials, string> = {
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  email: 'Email',
};

export interface SpeakerModalProps {
  speaker: Speaker | null;
  onClose: () => void;
}

export default function SpeakerModal({ speaker, onClose }: SpeakerModalProps) {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!speaker) return;
    const root = document.documentElement;
    const body = document.body;
    const prev = { rootOverflow: root.style.overflow, rootPadding: root.style.paddingRight, bodyOverflow: body.style.overflow };
    const gap = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (gap > 0) root.style.paddingRight = `${gap}px`;
    return () => {
      root.style.overflow = prev.rootOverflow;
      root.style.paddingRight = prev.rootPadding;
      body.style.overflow = prev.bodyOverflow;
    };
  }, [speaker]);

  useEffect(() => {
    if (!speaker) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.getElementById(speakerLayout.trigger(speaker.id))?.focus({ preventScroll: true });
    };
  }, [speaker, onClose]);

  const socials = speaker
    ? SOCIAL_ORDER.flatMap(network => {
        const value = speaker.socials?.[network]?.trim();
        return value ? [{ network, href: socialHref(network, value), Icon: SOCIAL_ICONS[network] }] : [];
      })
    : [];

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {speaker && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-8">
          <motion.div
            key="speaker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />
          <motion.div
            ref={dialogRef}
            key={speakerLayout.card(speaker.id)}
            layoutId={speakerLayout.card(speaker.id)}
            role="dialog"
            aria-modal="true"
            aria-labelledby={speakerLayout.heading(speaker.id)}
            className="relative grid w-full max-w-5xl overflow-hidden bg-zinc-950 shadow-[0_40px_120px_rgba(0,0,0,0.9)] ring-1 ring-white/10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]"
          >
            <div className="relative aspect-4/5 w-full overflow-hidden bg-zinc-900 md:aspect-auto md:h-full">
              <motion.img
                layoutId={speakerLayout.image(speaker.id)}
                src={speaker.image}
                alt={`Portrait of ${speaker.name}`}
                className="h-full w-full object-cover"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"
              />
            </div>
            <div className="flex flex-col justify-between gap-10 p-6 sm:p-10">
              <div>
                <span className="font-mono! text-[10px] tracking-[0.3em] text-zinc-500 uppercase">Profile</span>
                <motion.h2
                  id={speakerLayout.heading(speaker.id)}
                  layoutId={speakerLayout.name(speaker.id)}
                  className="mt-4 text-3xl font-bold tracking-tight text-white uppercase sm:text-4xl"
                >
                  {speaker.name}
                </motion.h2>
                <p className="mt-2 font-mono! text-[11px] tracking-[0.18em] text-zinc-400 uppercase">
                  ({speaker.role})
                </p>
                {speaker.bio && (
                  <p className="mt-6 max-w-prose text-sm leading-relaxed text-zinc-300">{speaker.bio}</p>
                )}
                {speaker.quote && (
                  <blockquote className="mt-8 border-l border-white/20 pl-5">
                    <p className="text-base leading-snug text-white italic">&ldquo;{speaker.quote}&rdquo;</p>
                  </blockquote>
                )}
              </div>
              {socials.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  {socials.map(({ network, href, Icon }) => (
                    <a
                      key={network}
                      href={href}
                      target={network === 'email' ? undefined : '_blank'}
                      rel="noreferrer"
                      aria-label={`${speaker.name} on ${SOCIAL_LABELS[network]}`}
                      className="inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 font-mono! text-[10px] tracking-[0.18em] text-zinc-300 uppercase transition-colors duration-300 hover:border-white/40 hover:text-white!"
                    >
                      <Icon size={14} />
                      {SOCIAL_LABELS[network]}
                      <ArrowUpRight size={12} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={`Close ${speaker.name}'s profile`}
              className="absolute top-4 right-4 z-10 inline-flex h-11 w-11 cursor-pointer items-center justify-center bg-black/60 text-white! backdrop-blur-sm transition-colors duration-300 hover:bg-white hover:text-black!"
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
