import { useEffect, useRef } from 'react';

/** Decorative only: the CSS orbit remains available without WebGL. */
export default function TeamOrbit() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current!;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let cleanup: (() => void) | undefined;
    let loading = false;

    async function start() {
      if (loading || preference.matches || disposed) return;
      loading = true;
      try {
        const THREE = await import('three');
        if (disposed || preference.matches) return;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearColor(0x080d12, 0);
        element.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
        camera.position.z = 9;
        const group = new THREE.Group();
        scene.add(group);
        const materials: import('three').Material[] = [];
        const geometries: import('three').BufferGeometry[] = [];
        const nodeGeometry = new THREE.SphereGeometry(0.055, 12, 8);
        const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xb6efd3 });
        geometries.push(nodeGeometry); materials.push(nodeMaterial);
        for (let ring = 0; ring < 3; ring++) {
          const orbit = new THREE.Group();
          orbit.rotation.set(0.8 + ring * 0.65, ring * 1.1, ring * 0.45);
          const points = Array.from({ length: 161 }, (_, i) => {
            const angle = i / 160 * Math.PI * 2;
            return new THREE.Vector3(Math.cos(angle) * 2.3, Math.sin(angle) * 2.3, 0);
          });
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: ring === 2 ? 0xe2c597 : 0xb6efd3, transparent: true, opacity: 0.26 });
          geometries.push(geometry); materials.push(material);
          orbit.add(new THREE.LineLoop(geometry, material));
          for (let node = 0; node < 4; node++) {
            const dot = new THREE.Mesh(nodeGeometry, nodeMaterial);
            const angle = node * Math.PI / 2 + ring * 0.4;
            dot.position.set(Math.cos(angle) * 2.3, Math.sin(angle) * 2.3, 0);
            orbit.add(dot);
          }
          group.add(orbit);
        }
        let visible = false;
        let lost = false;
        let frame = 0;
        let previous = 0;
        const draw = (time: number) => {
          if (!visible || document.hidden || lost || preference.matches) { frame = 0; return; }
          const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
          previous = time;
          group.rotation.y += delta * 0.075;
          group.rotation.z += delta * 0.025;
          renderer.render(scene, camera);
          frame = requestAnimationFrame(draw);
        };
        const sync = () => {
          if (visible && !document.hidden && !lost && !preference.matches && !frame) { previous = 0; frame = requestAnimationFrame(draw); }
          else if ((!visible || document.hidden || lost || preference.matches) && frame) { cancelAnimationFrame(frame); frame = 0; }
        };
        const resize = new ResizeObserver(() => {
          const { width, height } = element.getBoundingClientRect();
          renderer.setSize(width, height);
          camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
        });
        resize.observe(element);
        const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
        visibility.observe(element);
        const contextLost = (event: Event) => { event.preventDefault(); lost = true; element.classList.remove('orbit-ready'); sync(); };
        renderer.domElement.addEventListener('webglcontextlost', contextLost);
        document.addEventListener('visibilitychange', sync);
        preference.addEventListener('change', sync);
        element.classList.add('orbit-ready');
        cleanup = () => {
          cancelAnimationFrame(frame); resize.disconnect(); visibility.disconnect();
          document.removeEventListener('visibilitychange', sync); preference.removeEventListener('change', sync);
          renderer.domElement.removeEventListener('webglcontextlost', contextLost);
          geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
          renderer.dispose(); renderer.domElement.remove(); element.classList.remove('orbit-ready');
        };
      } catch { /* The static illustration is the fallback when WebGL is unavailable. */ }
    }
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) void start(); }, { rootMargin: '200px' });
    observer.observe(element);
    const change = () => { if (!preference.matches) { loading = !!cleanup; void start(); } };
    preference.addEventListener('change', change);
    return () => { disposed = true; observer.disconnect(); preference.removeEventListener('change', change); cleanup?.(); };
  }, []);

  return <div className="team-orbit" ref={host} aria-hidden="true">
    <div className="team-orbit-fallback"><i /><i /><i /></div>
    <img src="/brain-mark.svg" alt="" width="190" height="190" />
    <span className="orbit-caption orbit-caption-top">MANY MINDS. ONE NUCLEUS.</span>
    <span className="orbit-caption orbit-caption-bottom"><i className="status-dot" /> A CONNECTION WORTH MAKING</span>
    <span className="orbit-coordinate">12.9101° N<br />74.8981° E</span>
    <span className="orbit-star">✳</span>
  </div>;
}
