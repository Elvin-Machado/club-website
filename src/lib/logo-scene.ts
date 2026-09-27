import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const LOGO_WIDTH = 6;
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

// The reference converges over eight seconds: points arrive first, the contour
// appears at 3.6s, and a soft light pulse passes over it between 4.4s and 6.8s.
const particleVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uCameraZ;
  uniform vec2 uViewport;
  uniform vec2 uPointer;
  attribute vec3 aStart;
  attribute vec4 aMotion;
  varying float vAlpha;

  void main() {
    float progress = min(uTime / 8.0, 1.0);
    float formation = clamp((progress - 0.03) / 0.62, 0.0, 1.0);
    float arrival = clamp((formation - aMotion.x) / 0.55, 0.0, 1.0);
    float ease = 1.0 - pow(1.0 - arrival, 4.0);
    float reveal = clamp((progress - 0.45) / 0.2, 0.0, 1.0);
    vec3 start = vec3(aStart.xy * max(uViewport.x, uViewport.y), aStart.z);
    vec3 target = position;
    target.xy += uPointer;
    vec3 p = mix(start, target, ease);
    // Depth collapses with the assembly, leaving the original silhouette exact.
    p.z += sin(uTime * 0.3 + aMotion.z) * 0.18 * (1.0 - ease);
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(aMotion.y * (1.6 - 0.7 * ease) * 2.0 * uPixelRatio
      * uCameraZ / -view.z, 1.0, 12.0 * uPixelRatio);
    float twinkle = 0.0;
    vAlpha = min(1.0, mix(aMotion.w, 1.0, ease) + twinkle * (1.0 - ease))
      * max(0.0, 1.0 - reveal * 1.2) * smoothstep(0.0, 0.3, uTime);
  }
`;

const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uCameraZ;
  uniform vec2 uViewport;
  uniform vec2 uPointer;
  attribute vec4 aMotion;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.xy = (fract(p.xy + aMotion.xy * uTime * 0.002) - 0.5) * uViewport * 1.5;
    p.xy += uPointer * (0.15 + p.z * 0.04);
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;
    float twinkle = 0.0;
    gl_PointSize = clamp(aMotion.z * uPixelRatio * uCameraZ / -view.z,
      0.7 * uPixelRatio, 6.0 * uPixelRatio);
    vAlpha = (0.12 + twinkle * 0.2) * smoothstep(0.0, 0.8, uTime);
  }
`;

const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    float alpha = (1.0 - smoothstep(0.45, 1.0, radius)) * vAlpha;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`;

type Contour = { segments: number[]; lengths: number[]; totalLength: number };

// Marching squares traces the PNG's alpha, including the holes between the
// neural paths. No approximation of the brain or external logo model is used.
function traceLogo(image: HTMLImageElement): Contour {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1024 / image.naturalWidth);
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Logo sampling is unavailable');
  // Suppress subpixel fringe in the raster alpha before tracing the contour.
  ctx.filter = 'blur(0.8px)';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const alpha = (x: number, y: number) => data[(y * canvas.width + x) * 4 + 3] / 255;
  let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (alpha(x, y) < 0.5) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right <= left) throw new Error('The logo has no visible pixels');
  const factor = LOGO_WIDTH / (right - left);
  const centerX = (left + right) / 2, centerY = (top + bottom) / 2;
  const segments: number[] = [], lengths: number[] = [];
  let totalLength = 0;

  for (let y = Math.max(0, top - 1); y <= Math.min(bottom, canvas.height - 2); y++) {
    for (let x = Math.max(0, left - 1); x <= Math.min(right, canvas.width - 2); x++) {
      const corners = [alpha(x, y), alpha(x + 1, y), alpha(x + 1, y + 1), alpha(x, y + 1)];
      const coordinates = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
      const crossings: number[][] = [];
      for (let edge = 0; edge < 4; edge++) {
        const next = (edge + 1) % 4;
        if ((corners[edge] >= 0.5) === (corners[next] >= 0.5)) continue;
        const t = (0.5 - corners[edge]) / (corners[next] - corners[edge]);
        crossings.push([
          (THREE.MathUtils.lerp(coordinates[edge][0], coordinates[next][0], t) - centerX) * factor,
          (centerY - THREE.MathUtils.lerp(coordinates[edge][1], coordinates[next][1], t)) * factor,
        ]);
      }
      for (let index = 0; index < crossings.length - 1; index += 2) {
        const [a, b] = [crossings[index], crossings[index + 1]];
        segments.push(a[0], a[1], 0, b[0], b[1], 0);
        totalLength += Math.hypot(b[0] - a[0], b[1] - a[1]);
        lengths.push(totalLength);
      }
    }
  }
  return { segments, lengths, totalLength };
}

export async function createLogoScene(host: HTMLDivElement, url: string, onError: () => void) {
  const source = new Image();
  source.src = url;
  await source.decode();
  const contour = traceLogo(source);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  let frame = 0, stopped = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
  const viewport = new THREE.Vector2();
  const pointer = new THREE.Vector2();
  const desiredPointer = new THREE.Vector2();
  const style = getComputedStyle(host);
  const mint = new THREE.Color(style.getPropertyValue('--mint').trim());
  renderer.setClearColor(style.getPropertyValue('--bg').trim());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');

  let seed = 26;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uCameraZ: { value: 1 },
    uViewport: { value: viewport },
    uPointer: { value: pointer },
    uColor: { value: mint },
  };

  function makePoints(geometry: THREE.BufferGeometry, vertexShader: string) {
    const material = new THREE.ShaderMaterial({
      uniforms, vertexShader, fragmentShader: particleFragment,
      transparent: true, depthWrite: false, depthTest: false,
    });
    geometries.push(geometry); materials.push(material);
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    return points;
  }

  const count = host.clientWidth < 768 ? 900 : 1400;
  const positions = new Float32Array(count * 3);
  const starts = new Float32Array(count * 3);
  const motion = new Float32Array(count * 4);
  let segment = 0;
  for (let i = 0; i < count; i++) {
    const distance = (i + 0.5) / count * contour.totalLength;
    while (contour.lengths[segment] < distance) segment++;
    const previousLength = segment ? contour.lengths[segment - 1] : 0;
    const t = (distance - previousLength) / (contour.lengths[segment] - previousLength);
    const offset = segment * 6;
    const x = THREE.MathUtils.lerp(contour.segments[offset], contour.segments[offset + 3], t);
    const y = THREE.MathUtils.lerp(contour.segments[offset + 1], contour.segments[offset + 4], t);
    positions.set([x, y, 0], i * 3);
    const angle = random() * TAU, radius = 0.5 + random() * 0.6;
    starts.set([Math.cos(angle) * radius, Math.sin(angle) * radius, (random() - 0.5) * 10], i * 3);
    motion.set([Math.hypot(x, y) / LOGO_WIDTH * 0.3 + random() * 0.125, 1 + random() * 0.8,
      random() * TAU, 0.25 + random() * 0.25], i * 4);
  }
  const particles = new THREE.BufferGeometry();
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles.setAttribute('aStart', new THREE.BufferAttribute(starts, 3));
  particles.setAttribute('aMotion', new THREE.BufferAttribute(motion, 4));
  const assembly = makePoints(particles, particleVertex);

  const dustCount = host.clientWidth < 768 ? 160 : 350;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustMotion = new Float32Array(dustCount * 4);
  for (let i = 0; i < dustCount; i++) {
    dustPositions.set([random(), random(), (random() - 0.6) * 10], i * 3);
    dustMotion.set([random() - 0.5, random() - 0.5, 0.6 + Math.pow(random(), 3) * 3.6, random() * TAU], i * 4);
  }
  const dust = new THREE.BufferGeometry();
  dust.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dust.setAttribute('aMotion', new THREE.BufferAttribute(dustMotion, 4));
  makePoints(dust, dustVertex);

  const logo = new THREE.Group();
  scene.add(logo);
  const lineGeometry = new LineSegmentsGeometry();
  lineGeometry.setPositions(contour.segments);
  geometries.push(lineGeometry);
  function makeContour(width: number) {
    const material = new LineMaterial({ color: mint, linewidth: width, transparent: true, opacity: 0,
      depthWrite: false, depthTest: false });
    materials.push(material);
    const line = new LineSegments2(lineGeometry, material);
    line.frustumCulled = false;
    logo.add(line);
    return material;
  }
  const glow = makeContour(9);
  const edge = makeContour(2);

  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
    const logoPixels = Math.min(480, width * 0.6, height * 0.55);
    viewport.set(width / logoPixels * LOGO_WIDTH, height / logoPixels * LOGO_WIDTH);
    camera.aspect = width / height;
    camera.position.z = viewport.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.y = -0.07 * viewport.y;
    camera.updateProjectionMatrix();
    uniforms.uCameraZ.value = camera.position.z;
    uniforms.uPixelRatio.value = pixelRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    edge.resolution.set(width, height); glow.resolution.set(width, height);
  };

  let elapsed = 0, previous = 0;
  let offscreen = false;

  // Stop rendering when the logo section is completely off-screen (saves GPU during parallax scroll)
  const io = new IntersectionObserver(
    ([entry]) => {
      offscreen = !entry.isIntersecting;
      cancelAnimationFrame(frame);
      previous = 0;
      if (!offscreen && !stopped && !document.hidden) frame = requestAnimationFrame(animate);
    },
    { threshold: 0 }
  );
  io.observe(host);

  function animate(now: number) {
    if (stopped || document.hidden || offscreen) {
      frame = 0;
      return;
    }
    const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    elapsed += dt;
    uniforms.uTime.value = elapsed;
    pointer.lerp(desiredPointer, 1 - Math.exp(-dt * 3.7));
    const progress = Math.min(elapsed / 8, 1);
    const reveal = clamp((progress - 0.45) / 0.2, 0, 1);
    edge.opacity = reveal * 1.0;
    glow.opacity = 0;
    logo.position.set(pointer.x, pointer.y, 0);
    assembly.visible = reveal < 0.84;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || elapsed < 4.4) return;
    const bounds = host.getBoundingClientRect();
    desiredPointer.set(
      ((event.clientX - bounds.left) / bounds.width - 0.5) * viewport.x * 0.035,
      (0.5 - (event.clientY - bounds.top) / bounds.height) * viewport.y * 0.035,
    );
  };
  const leave = () => desiredPointer.set(0, 0);
  const visibility = () => {
    cancelAnimationFrame(frame);
    previous = 0;
    if (!document.hidden && !stopped && !offscreen) frame = requestAnimationFrame(animate);
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    stopped = true;
    cancelAnimationFrame(frame);
    renderer.domElement.style.opacity = '0';
    onError();
  };
  const observer = new ResizeObserver(resize);
  function dispose() {
    stopped = true;
    cancelAnimationFrame(frame);
    io.disconnect();
    observer.disconnect();
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerleave', leave);
    document.removeEventListener('visibilitychange', visibility);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }

  try {
    resize();
    host.appendChild(renderer.domElement);
    observer.observe(host);
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    frame = requestAnimationFrame(animate);
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
}
