"use client";

/* Glowing 3D "Knowledge Brain" — two neural hemispheres of breathing particles,
   a pulsing core, synapse sparks and an orbiting thought-ring. Auto-rotates,
   leans gently toward the pointer. Client-only, performance-capped. */

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Deterministic PRNG so the build/Hydrate is stable per mount. */
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = ["#f0b25a", "#f7d9a4", "#d4903c", "#8fb996", "#e08b8b"];

function hemisphere(rand: () => number, side: -1 | 1, count: number) {
  const positions: number[] = [];
  const colors: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    // spheroid cluster, squeezed to form a lobe
    const u = rand();
    const v = rand();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 1.12 + (Math.sin(theta * 3 + side) * Math.cos(phi * 4)) * 0.16 + rand() * 0.14;
    const x = r * Math.sin(phi) * Math.cos(theta) * 0.82;
    const y = r * Math.sin(phi) * Math.sin(theta) * 1.08;
    const z = r * Math.cos(phi) * 1.28;
    positions.push(x * 0.92 + side * 0.42, y, z);
    c.set(PALETTE[Math.floor(rand() * PALETTE.length)]);
    colors.push(c.r, c.g, c.b);
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
}

function BrainModel({ paused }: { paused: boolean }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Points>(null);

  const { leftGeo, rightGeo, sparkGeo, ringGeo } = useMemo(() => {
    const rand = mulberry(20260914);
    const make = (positions: Float32Array, colors?: Float32Array) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      if (colors) g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return g;
    };
    const l = hemisphere(rand, -1, 620);
    const r = hemisphere(rand, 1, 620);
    const sparkP: number[] = [];
    for (let i = 0; i < 40; i++) {
      const side = rand() > 0.5 ? 1 : -1;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const rr = 1.34;
      sparkP.push(
        rr * Math.sin(phi) * Math.cos(theta) * 0.82 + side * 0.42,
        rr * Math.sin(phi) * Math.sin(theta) * 1.08,
        rr * Math.cos(phi) * 1.28
      );
    }
    const ringP: number[] = [];
    const N = 160;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const rr = 2.05 + Math.sin(i * 7.3) * 0.08;
      ringP.push(Math.cos(a) * rr, (rand() - 0.5) * 0.5, Math.sin(a) * rr);
    }
    return {
      leftGeo: make(l.positions, l.colors),
      rightGeo: make(r.positions, r.colors),
      sparkGeo: make(new Float32Array(sparkP)),
      ringGeo: make(new Float32Array(ringP)),
    };
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    if (!paused) {
      group.current.rotation.y += 0.0026;
      group.current.rotation.x = Math.sin(t * 0.3) * 0.06 - state.pointer.y * 0.12;
      group.current.position.y = Math.sin(t * 0.6) * 0.07;
      group.current.rotation.y += state.pointer.x * 0.0006;
    }
    if (core.current) {
      const s = 1 + Math.sin(t * 1.6) * 0.05;
      core.current.scale.setScalar(s);
    }
    if (ring.current) {
      ring.current.rotation.y -= 0.0011;
    }
  });

  const dot = (size: number, opacity: number) => (
    <pointsMaterial size={size} vertexColors transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
  );

  return (
    <group ref={group} scale={0.92}>
      <points geometry={leftGeo}>{dot(0.028, 0.85)}</points>
      <points geometry={rightGeo}>{dot(0.028, 0.85)}</points>
      <points geometry={sparkGeo}>
        <pointsMaterial size={0.075} color="#ffe3ae" transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={ring} geometry={ringGeo}>
        <pointsMaterial size={0.02} color="#8fb996" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh ref={core}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color="#f0b25a" emissive="#b87333" emissiveIntensity={1.6} roughness={0.25} transparent opacity={0.85} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.55, 24, 24]} />
        <meshBasicMaterial color="#f0b25a" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

export default function BrainCanvas({ paused = false }: { paused?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 4.6], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 3, 4]} intensity={12} color="#f0b25a" />
      <pointLight position={[-3, -2, -3]} intensity={6} color="#4a7c59" />
      <BrainModel paused={paused} />
    </Canvas>
  );
}
