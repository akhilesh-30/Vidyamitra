"use client";

/* v0 landing — "knowledge field" hero. Faithful port of new design/app/page.tsx
   (Landing view only; header/footer stay in the shared v0 shell). */

import { Canvas, useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function LearningCore({ paused }: { paused: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (paused || !group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.12 + state.pointer.x * 0.18;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.28) * 0.08 + state.pointer.y * 0.08;
  });
  return (
    <group ref={group} scale={0.62}>
      <mesh>
        <icosahedronGeometry args={[1.12, 2]} />
        <meshPhysicalMaterial color="#b87333" emissive="#4d2d13" emissiveIntensity={0.9} roughness={0.28} metalness={0.35} clearcoat={0.7} transmission={0.05} />
      </mesh>
      <mesh scale={1.22}>
        <icosahedronGeometry args={[1.12, 1]} />
        <meshBasicMaterial color="#d4a04a" wireframe transparent opacity={0.2} />
      </mesh>
      <pointLight position={[1.3, 1.7, 2]} color="#d4a04a" intensity={5} distance={4} />
    </group>
  );
}

function HeroObject() {
  const [isHidden, setIsHidden] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [shouldRender3D, setShouldRender3D] = useState(false);
  const invalidate = useRef<(() => void) | null>(null);

  useEffect(() => {
    const renderTimer = window.setTimeout(() => setShouldRender3D(true), 600);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const updatePowerMode = () => setIsLowPower(reduced.matches || mobile.matches);
    const updateVisibility = () => setIsHidden(document.hidden);
    updatePowerMode();
    updateVisibility();
    reduced.addEventListener("change", updatePowerMode);
    mobile.addEventListener("change", updatePowerMode);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      window.clearTimeout(renderTimer);
      reduced.removeEventListener("change", updatePowerMode);
      mobile.removeEventListener("change", updatePowerMode);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (isHidden || isLowPower || !canvasReady) return;
    const interval = window.setInterval(() => invalidate.current?.(), 1000 / 30);
    return () => window.clearInterval(interval);
  }, [isHidden, isLowPower, canvasReady]);

  const fallback = isLowPower || isHidden || !shouldRender3D;
  return (
    <div className={`hero-object ${fallback ? "hero-object-fallback" : ""}`} aria-label="Interactive glowing learning core">
      {!isLowPower && shouldRender3D && (
        <Canvas frameloop="demand" camera={{ position: [0, 0, 5.4], fov: 38 }} dpr={[1, 1.5]} onCreated={({ invalidate: nextInvalidate }) => { invalidate.current = nextInvalidate; setCanvasReady(true); }}>
          <ambientLight intensity={0.18} />
          <directionalLight position={[3, 4, 4]} intensity={2.2} color="#f7e4c2" />
          <LearningCore paused={isHidden} />
        </Canvas>
      )}
      <div className="hero-fallback-core" aria-hidden="true" />
      <div className="object-caption"><span>01</span> {isLowPower ? "lightweight learning field" : "knowledge in motion"} <b>{isLowPower ? "low power mode" : "move your cursor"}</b></div>
    </div>
  );
}

export function V0Landing({ onStart }: { onStart: () => void }) {
  return (
    <motion.main className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="landing-orbit-label"><span>VIDYAMITRA / 001</span><span>ADAPTIVE LEARNING SYSTEM</span></div>
      <HeroObject />
      <div className="landing-copy">
        <p className="eyebrow"><span className="eyebrow-dot" /> A companion for curious minds</p>
        <h1>Make knowledge<br /><span>move.</span></h1>
        <p className="lede">An adaptive learning space that turns scattered attention into a living rhythm of understanding.</p>
        <div className="hero-actions">
          <button className="button button-primary" onClick={onStart}>Enter your field <ArrowUpRight /></button>
          <button className="text-button" onClick={onStart}>Explore the system <ChevronRight /></button>
        </div>
        <div className="trust-line"><span>Personal rhythm</span><span className="line" /><span>Deep focus</span><span className="line" /><span>Quiet progress</span></div>
      </div>
      <div className="landing-footer"><span>THE FUTURE OF LEARNING IS FLUID</span><span>SCROLL TO EXPLORE <span className="down-arrow">↓</span></span></div>
    </motion.main>
  );
}
