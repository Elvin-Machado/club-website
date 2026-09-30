export const GLIMPSE_EXIT = 8;
export const GLIMPSE_FADE_IN = 1.2;
export const GLIMPSE_ENLARGE = 2.6;
export const GLIMPSE_HOLD = .8;
export const GLIMPSE_FADE_OUT = 1.4;
export const GLIMPSE_LIFETIME = GLIMPSE_FADE_IN + GLIMPSE_ENLARGE + GLIMPSE_HOLD + GLIMPSE_FADE_OUT;
export const GLIMPSE_INTERVAL = GLIMPSE_LIFETIME + .4;
export const GLIMPSE_SLOTS = 4;
export const GLIMPSE_FADE = .9;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

/** Present one photo at a time near alternating sides, with a quiet gap between shots. */
export function glimpseFrame(elapsed: number, slot: number, remaining: number) {
  const age = elapsed - slot * GLIMPSE_INTERVAL;
  const period = GLIMPSE_INTERVAL * GLIMPSE_SLOTS;
  const cycle = Math.max(0, Math.floor(age / period));
  const shotAge = age < 0 ? 0 : age % period;
  const fadeOutStart = GLIMPSE_LIFETIME - GLIMPSE_FADE_OUT;
  const fadeIn = smooth(shotAge / GLIMPSE_FADE_IN);
  const fadeOut = 1 - smooth((shotAge - fadeOutStart) / GLIMPSE_FADE_OUT);
  const proximityFade = smooth((remaining - GLIMPSE_EXIT) / 12);
  const opacity = age < 0 ? 0 : fadeIn * fadeOut * proximityFade;

  // Prepare the next photo only after this layer is fully transparent.
  const photoIndex = (cycle + (shotAge >= GLIMPSE_LIFETIME ? 1 : 0)) * GLIMPSE_SLOTS + slot;
  return {
    photoIndex,
    opacity,
    // Complete the push-in before the hold, then dissolve without moving.
    scale: .96 + .29 * smooth((shotAge - GLIMPSE_FADE_IN) / GLIMPSE_ENLARGE),
  };
}

/** Small, bounded camera impulses; phone framing has gentler lateral motion. */
export function cinematicCamera(speed: number, acceleration: number, slope: number, cruise: number, compact: boolean, reduced: boolean, boostFocus = 0) {
  const pace = Math.min(1.6, Math.abs(speed) / cruise);
  const focus = reduced ? 0 : clamp(boostFocus);
  return {
    fov: (compact ? 77 : 68) + (reduced ? 0 : pace * 9 + Math.max(0, -slope * Math.sign(speed)) * pace * 3) - focus * (compact ? 11 : 14),
    lift: reduced ? 0 : Math.max(-.1, Math.min(.1, -acceleration * .006)),
    pitch: reduced ? 0 : Math.max(-.025, Math.min(.025, acceleration * -.0018)) * (compact ? .6 : 1),
    bankScale: (compact ? .55 : .85) * (1 - focus * .3),
  };
}
