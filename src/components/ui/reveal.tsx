import { useEffect, useRef, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: 'rise' | 'pop';
  /** Stagger the marked data-reveal-item descendants as they enter view. */
  stagger?: number;
};

// Content is visible in SSR; only the enhanced client prepares an entrance.
export function Reveal({ children, className = '', delay = 0, variant = 'rise', stagger = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element || media.matches || !('IntersectionObserver' in window) || !element.animate) return;
    const compact = window.matchMedia('(max-width: 760px)').matches;
    const items = stagger > 0 ? Array.from(element.querySelectorAll<HTMLElement>('[data-reveal-item]')) : [];
    const targets = items.length ? items : [element];
    const animations = new Map<HTMLElement, Animation>();
    const frames: Keyframe[] = variant === 'pop' ? [
      { opacity: 0, transform: `translateY(${compact ? 20 : 34}px) scale(.94)`, offset: 0, easing: 'cubic-bezier(.16,1,.3,1)' },
      { opacity: 1, transform: `translateY(-2px) scale(${compact ? 1.006 : 1.012})`, offset: .72, easing: 'cubic-bezier(.33,0,.2,1)' },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 },
    ] : [
      { opacity: 0, transform: `translateY(${compact ? 20 : 32}px) scale(.985)` },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ];
    const observer = new IntersectionObserver(entries => {
      // Only stagger items entering together; a later row never waits for earlier rows.
      entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
        const target = entry.target as HTMLElement;
        const animation = animations.get(target);
        animation?.effect?.updateTiming({ delay: Math.max(0, Math.min(delay, 180)) + Math.min(index * stagger, compact ? 140 : 240) });
        animation?.play();
        observer.unobserve(target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -20px 0px' });
    targets.forEach(target => {
      const animation = target.animate(frames, {
        duration: compact ? 620 : 780,
        easing: variant === 'pop' ? 'linear' : 'cubic-bezier(.16,1,.3,1)',
        fill: 'both',
      });
      animation.pause();
      animation.currentTime = 0;
      animation.onfinish = () => { animation.cancel(); animations.delete(target); };
      animations.set(target, animation);
      observer.observe(target);
    });
    const clear = () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); animations.clear(); };
    const stop = () => { if (media.matches) clear(); };
    // Keyboard navigation should never wait for an entrance to reveal a control.
    const showFocused = (event: FocusEvent) => animations.forEach((animation, target) => {
      if (target.contains(event.target as Node)) { animation.cancel(); animations.delete(target); observer.unobserve(target); }
    });
    element.addEventListener('focusin', showFocused);
    media.addEventListener('change', stop);
    return () => { clear(); element.removeEventListener('focusin', showFocused); media.removeEventListener('change', stop); };
  }, [delay, variant, stagger]);
  return <div ref={ref} className={className}>{children}</div>;
}
