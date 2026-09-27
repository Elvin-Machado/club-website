'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export function useSceneCapabilities() {
  const reducedMotion = useReducedMotion();
  const [capabilities, setCapabilities] = useState({ ready: false, mobile: true, lowPower: true, webgl: false });
  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    const webgl = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    const update = () => setCapabilities({
      ready: true, mobile: mobileQuery.matches, webgl,
      lowPower: Boolean(device.connection?.saveData) || (device.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4,
    });
    update();
    mobileQuery.addEventListener('change', update);
    return () => mobileQuery.removeEventListener('change', update);
  }, []);
  return { ...capabilities, reducedMotion: Boolean(reducedMotion), canAnimate: capabilities.ready && capabilities.webgl && reducedMotion === false };
}
