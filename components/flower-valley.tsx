"use client";

/* A night valley of glowing flowers, built with three.js against the design
   described for the landing hero: thousands of point-sprite flowers over a
   dark terrain, blooming as they come near the camera, drifting forward on
   their own, flying faster as the page scrolls, and pushed away from the
   cursor with a glow that follows the pointer.

   The reference engine (a compiled WebGL bundle plus a .glb camera path) is
   not part of this project, so the behaviours are rebuilt here rather than
   loaded: no external assets, no audio files, ~one shader pair. */

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  /** Eases the flight to a stop and disperses the flowers (arrow hover). */
  hover: boolean;
  onReady?: () => void;
  onIntro?: () => void;
}

const DEPTH = 420; // length of the endless corridor, in world units
const COUNT = 6000; // flowers + leaves on the ground
const FIREFLIES = 1500; // dim motes in the air, so the sky isn't empty

const FLOWER_COLORS = ["#f5efe2", "#f0b25a", "#a8d6b0", "#9ec8e8", "#c0b3ec"];

function groundY(x: number, z: number): number {
  return Math.sin(x * 0.05) * 2.0 + Math.cos(z * 0.032) * 2.6 - 4;
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uTravel;
  uniform vec2 uMouse;
  uniform float uDisperse;
  uniform float uDepth;

  attribute float aScale;
  attribute float aPhase;
  attribute float aLeaf;
  attribute vec3 aColor;

  varying float vGlow;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    /* travel: wrap each point through the corridor so the valley is endless */
    float z = mod(position.z + uTravel, uDepth) - (uDepth - 60.0);

    vec3 p = position;
    p.z = z;
    /* a slow sway, so nothing looks frozen */
    p.x += sin(uTime * 0.8 + aPhase * 6.283) * 0.22 * (1.0 + aLeaf);
    p.y += cos(uTime * 0.6 + aPhase * 4.0) * 0.14;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = max(-mv.z, 0.001);

    /* hover: drift outward into floating glowing particles */
    vec3 outward = normalize(vec3(p.x * 0.35, p.y + 0.6, 0.4));
    mv.xyz += outward * uDisperse * (2.0 + aPhase * 6.0);

    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / max(abs(clip.w), 0.001);

    /* mouse: push every point away from the cursor, strongest close by */
    vec2 d = ndc - uMouse;
    float push = smoothstep(0.62, 0.0, length(d));
    clip.xy += normalize(d + vec2(0.0001)) * push * 0.085 * clip.w;

    gl_Position = clip;

    float near = smoothstep(0.0, 4.0, dist);
    float far = 1.0 - smoothstep(150.0, 370.0, dist);
    float bloom = 1.0 - smoothstep(5.0, 70.0, dist);

    /* flowers bloom near the camera, leaves stay small and further back */
    float size = aScale * mix(0.25, 1.0, bloom) * (1.0 - aLeaf * 0.55);
    gl_PointSize = clamp(size * (270.0 / dist), 0.0, 44.0);

    vGlow = (mix(0.5, 1.55, bloom) + push * 1.7) * (1.0 - aLeaf * 0.62) * (1.0 + uDisperse * 0.45);
    vColor = aColor;
    vAlpha = near * far;
  }
`;

const FRAG = /* glsl */ `
  varying float vGlow;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.04, d);
    float halo = smoothstep(0.5, 0.2, d) * 0.5;
    float a = (core + halo) * vGlow * vAlpha;
    if (a < 0.004) discard;

    gl_FragColor = vec4(vColor * (0.7 + vGlow * 0.5), a);
  }
`;

export default function FlowerValley({ hover, onReady, onIntro }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;

  const readyCb = useRef(onReady);
  readyCb.current = onReady;
  const introCb = useRef(onIntro);
  introCb.current = onIntro;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = (() => {
      try {
        // transparent, so the CSS sky (stars, gradient, horizon glow) shows above the flowers
        return new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
      } catch {
        return null;
      }
    })();

    if (!renderer) {
      // No WebGL: the CSS sky behind the canvas still reads as a night valley.
      readyCb.current?.();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.4, 520);
    camera.position.set(0, 1.6, 26);
    camera.lookAt(0, 0.6, -60);

    /* ---------- the valley floor, to hide points below the horizon ---------- */
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 1000),
      new THREE.MeshBasicMaterial({ color: 0x05090f, transparent: true, opacity: 0.78 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -4.4, -220);
    scene.add(floor);

    /* ---------- flowers + leaves on the ground, fireflies in the air ---------- */
    const TOTAL = COUNT + FIREFLIES;
    const positions = new Float32Array(TOTAL * 3);
    const colors = new Float32Array(TOTAL * 3);
    const scales = new Float32Array(TOTAL);
    const phases = new Float32Array(TOTAL);
    const leaves = new Float32Array(TOTAL);
    const tmp = new THREE.Color();

    for (let i = 0; i < TOTAL; i++) {
      const isFirefly = i >= COUNT;
      const isLeaf = !isFirefly && Math.random() < 0.28;

      // narrower in x than in z: a valley corridor
      const x = (Math.random() - 0.5) * 96 * (0.55 + Math.random() * 0.9);
      const z = -DEPTH + Math.random() * (DEPTH + 80);

      positions[i * 3] = x;
      positions[i * 3 + 1] = isFirefly
        ? groundY(x, z) + 5 + Math.random() * 28
        : groundY(x, z) + (isLeaf ? 0.2 + Math.random() * 1.2 : 0.6 + Math.random() * 2.4);
      positions[i * 3 + 2] = z;

      if (isFirefly) tmp.set(Math.random() < 0.5 ? "#cfe3d8" : "#f5efe2");
      else if (isLeaf) tmp.set(Math.random() < 0.5 ? "#4f7a58" : "#6f9a78");
      else tmp.set(FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)]);

      // vary brightness a little so the field isn't flat
      const shade = 0.65 + Math.random() * 0.55;
      colors[i * 3] = tmp.r * shade;
      colors[i * 3 + 1] = tmp.g * shade;
      colors[i * 3 + 2] = tmp.b * shade;

      scales[i] = isFirefly
        ? 1.1 + Math.random() * 1.8
        : isLeaf
          ? 2.2 + Math.random() * 2.4
          : 3.2 + Math.random() * 4.6;
      phases[i] = Math.random();
      // aLeaf also dims: leaves recede, fireflies stay as faint motes
      leaves[i] = isFirefly || isLeaf ? 1 : 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute("aLeaf", new THREE.BufferAttribute(leaves, 1));

    const uniforms = {
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uDisperse: { value: 0 },
      uDepth: { value: DEPTH },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const field = new THREE.Points(geometry, material);
    field.frustumCulled = false;
    scene.add(field);

    /* ---------- input ---------- */
    // start off-screen, so no permanent hole sits behind the headline
    const mouseTarget = new THREE.Vector2(6, 6);
    const mouseSmooth = new THREE.Vector2(6, 6);
    let scrollBoost = 0;

    const onPointerMove = (e: PointerEvent) => {
      mouseTarget.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const onScroll = () => {
      const height = window.innerHeight || 1;
      scrollBoost = Math.min(window.scrollY / height, 1.4);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* ---------- size ---------- */
    const resize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    /* ---------- loop ---------- */
    let raf = 0;
    let speed = 3.2; // world units per second when idle
    let disperse = 0;
    let intro = 0;
    let introFired = false;
    let readyFired = false;
    const started = performance.now();
    let last = started;

    /* The loader must never be able to stick. Animation frames are paused in a
       background tab (or when WebGL is unavailable), so the interface is also
       revealed on a plain timer. */
    const fireReady = () => {
      if (readyFired) return;
      readyFired = true;
      readyCb.current?.();
    };
    const fireIntro = () => {
      if (introFired) return;
      introFired = true;
      introCb.current?.();
    };
    const fallback = window.setTimeout(() => {
      fireReady();
      fireIntro();
    }, 2600);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = (now - started) / 1000;

      // ease toward the target pace: hovering brings it to a stop
      const target = hoverRef.current ? 0 : 3.2 + scrollBoost * 11;
      speed += (target - speed) * Math.min(dt * 2.2, 1);
      uniforms.uTravel.value += speed * dt;
      if (uniforms.uTravel.value > DEPTH) uniforms.uTravel.value -= DEPTH;

      disperse += ((hoverRef.current ? 1 : 0) - disperse) * Math.min(dt * 2.4, 1);
      uniforms.uDisperse.value = disperse;
      uniforms.uTime.value = t;

      mouseSmooth.lerp(mouseTarget, Math.min(dt * 3.2, 1));
      uniforms.uMouse.value.copy(mouseSmooth);

      // camera: slow drift, plus a slight tilt toward the cursor
      camera.position.x = Math.sin(t * 0.12) * 1.8;
      camera.position.y = 1.6 + Math.cos(t * 0.1) * 0.35;
      camera.lookAt(mouseSmooth.x * 9, 0.6 + mouseSmooth.y * 4.5, -80);

      renderer.render(scene, camera);

      // intro: hold the loader until the first frames are on screen
      if (intro < 1) {
        intro = Math.min(intro + dt / 0.9, 1);
        if (intro >= 1) fireReady();
      } else if (!introFired && t > 1.5) {
        fireIntro();
      }
    };

    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      geometry.dispose();
      material.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={hostRef} className="fh-canvas-container" aria-hidden="true" />;
}
