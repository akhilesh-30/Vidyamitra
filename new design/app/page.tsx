'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, BookOpen, Brain, Check, ChevronRight, Clock3, Leaf, Menu, Pause, Play, Sparkles, Volume2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const subjects = [
  { name: 'Mathematics', topic: 'Calculus · Integration', note: 'Continue your thread', tone: 'ember' },
  { name: 'Physics', topic: 'Electromagnetism', note: 'A quiet review awaits', tone: 'sage' },
  { name: 'History', topic: 'The Silk Road', note: 'New connection detected', tone: 'sand' },
]

function LearningCore({ paused }: { paused: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (paused || !group.current) return
    group.current.rotation.y = state.clock.elapsedTime * 0.12 + state.pointer.x * 0.18
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.28) * 0.08 + state.pointer.y * 0.08
  })
  return <group ref={group} scale={0.62}>
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
}

function HeroObject() {
  const [isHidden, setIsHidden] = useState(false)
  const [isLowPower, setIsLowPower] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const [shouldRender3D, setShouldRender3D] = useState(false)
  const invalidate = useRef<(() => void) | null>(null)

  useEffect(() => {
    const renderTimer = window.setTimeout(() => setShouldRender3D(true), 600)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)')
    const updatePowerMode = () => setIsLowPower(reduced.matches || mobile.matches)
    const updateVisibility = () => setIsHidden(document.hidden)
    updatePowerMode()
    updateVisibility()
    reduced.addEventListener('change', updatePowerMode)
    mobile.addEventListener('change', updatePowerMode)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      window.clearTimeout(renderTimer)
      reduced.removeEventListener('change', updatePowerMode)
      mobile.removeEventListener('change', updatePowerMode)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  useEffect(() => {
    if (isHidden || isLowPower || !canvasReady) return
    const interval = window.setInterval(() => invalidate.current?.(), 1000 / 30)
    return () => window.clearInterval(interval)
  }, [isHidden, isLowPower, canvasReady])

  const fallback = isLowPower || isHidden || !shouldRender3D
  return <div className={`hero-object ${fallback ? 'hero-object-fallback' : ''}`} aria-label="Interactive glowing learning core">
    {!isLowPower && shouldRender3D && <Canvas frameloop="demand" camera={{ position: [0, 0, 5.4], fov: 38 }} dpr={[1, 1.5]} onCreated={({ invalidate: nextInvalidate }) => { invalidate.current = nextInvalidate; setCanvasReady(true) }}>
      <ambientLight intensity={0.18} /><directionalLight position={[3, 4, 4]} intensity={2.2} color="#f7e4c2" /><LearningCore paused={isHidden} />
    </Canvas>}
    <div className="hero-fallback-core" aria-hidden="true" />
    <div className="object-caption"><span>01</span> {isLowPower ? 'lightweight learning field' : 'knowledge in motion'} <b>{isLowPower ? 'low power mode' : 'move your cursor'}</b></div>
  </div>
}

function Mark() { return <div className="mark" aria-label="Vidyamitra home"><span /><span /><span /><span /></div> }
function Header({ onHome, onDashboard, dashboard }: { onHome: () => void; onDashboard: () => void; dashboard: boolean }) {
  return <header className="site-header"><button className="brand" onClick={onHome}><Mark /><span>VIDYAMITRA</span></button><nav><button className={dashboard ? 'active' : ''} onClick={onDashboard}>My learning</button><button onClick={onHome}>The approach</button><button onClick={onHome}>For institutions</button></nav><button className="menu-button" aria-label="Open menu"><Menu /></button></header>
}

function Landing({ onStart }: { onStart: () => void }) {
  return <motion.main className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="landing-orbit-label"><span>VIDYAMITRA / 001</span><span>ADAPTIVE LEARNING SYSTEM</span></div>
    <HeroObject />
    <div className="landing-copy"><p className="eyebrow"><span className="eyebrow-dot" /> A companion for curious minds</p><h1>Make knowledge<br /><span>move.</span></h1><p className="lede">An adaptive learning space that turns scattered attention into a living rhythm of understanding.</p><div className="hero-actions"><button className="button button-primary" onClick={onStart}>Enter your field <ArrowUpRight /></button><button className="text-button" onClick={onStart}>Explore the system <ChevronRight /></button></div><div className="trust-line"><span>Personal rhythm</span><span className="line" /><span>Deep focus</span><span className="line" /><span>Quiet progress</span></div></div><div className="landing-footer"><span>THE FUTURE OF LEARNING IS FLUID</span><span>SCROLL TO EXPLORE <span className="down-arrow">↓</span></span></div>
  </motion.main>
}

function Constellation() {
  return <div className="constellation"><svg viewBox="0 0 520 250" role="img" aria-label="Organic visualization of learning connections"><path className="root-line" d="M258 240 C258 190 235 170 238 133 C241 99 206 72 157 61 M258 190 C283 157 328 149 360 114 C382 91 399 67 407 35 M237 139 C205 128 159 128 124 103 C101 87 90 57 94 28 M258 188 C238 160 223 149 198 133" /><path className="root-line thin" d="M360 114 C334 89 327 70 337 43 M157 61 C181 41 191 29 187 9 M124 103 C87 105 61 91 42 66 M198 133 C170 110 167 88 177 70" /><g className="node node-main"><circle cx="258" cy="190" r="8" /><circle cx="258" cy="190" r="15" /></g><g className="node"><circle cx="157" cy="61" r="6" /><circle cx="407" cy="35" r="7" /><circle cx="94" cy="28" r="5" /><circle cx="124" cy="103" r="4" /><circle cx="198" cy="133" r="5" /><circle cx="360" cy="114" r="5" /><circle cx="337" cy="43" r="4" /><circle cx="187" cy="9" r="4" /><circle cx="42" cy="66" r="4" /><circle cx="177" cy="70" r="3" /></g></svg><div className="constellation-label label-a">Calculus</div><div className="constellation-label label-b">Curiosity</div><div className="constellation-label label-c">Momentum</div><div className="constellation-center">your understanding<br /><strong>is taking root</strong></div></div>
}

function Dashboard({ onBreak }: { onBreak: () => void }) {
  const [checked, setChecked] = useState(false)
  return <motion.main className="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="dashboard-top"><div><p className="eyebrow">Tuesday, September 8 <span className="eyebrow-dot" /></p><h2>Good morning, <em>Aarav.</em></h2><p className="muted">Let&apos;s pick up where your curiosity left off.</p></div><div className="streak"><span>YOUR RHYTHM</span><strong>4 <small>days</small></strong><div className="rhythm-dots"><i /><i /><i /><i /><i className="empty" /><i className="empty" /><i className="empty" /></div></div></div><section className="focus-section"><div className="section-heading"><div><span className="section-kicker">YOUR LEARNING FIELD</span><h3>Where your attention is <em>growing</em></h3></div><button className="icon-button" aria-label="Open learning field"><ArrowUpRight /></button></div><div className="field-grid"><div className="constellation-wrap"><Constellation /><p className="field-note"><Sparkles /> Vidyamitra noticed a connection between your work in calculus and physics.</p></div><div className="subject-list">{subjects.map((subject, index) => <motion.button whileHover={{ x: 4 }} className={`subject subject-${subject.tone}`} key={subject.name}><span className="subject-index">0{index + 1}</span><span><strong>{subject.name}</strong><small>{subject.topic}</small></span><span className="subject-note">{subject.note}</span><ChevronRight /></motion.button>)}</div></div></section><section className="wellness"><div className="wellness-copy"><span className="section-kicker">A SMALL CHECK-IN</span><h3>How is your mind<br /><em>feeling today?</em></h3><p>There is no right answer. This helps us shape the space around you.</p></div><div className="wellness-actions">{['Clear', 'Scattered', 'Tired'].map((label) => <button key={label} className={checked && label === 'Tired' ? 'feeling selected' : 'feeling'} onClick={() => setChecked(true)}><span className="feeling-icon">{label === 'Clear' ? '◌' : label === 'Scattered' ? '∿' : '◒'}</span>{label}{checked && label === 'Tired' && <Check />}</button>)}<button className="break-link" onClick={onBreak}><Leaf /> I need a pause <ArrowUpRight /></button></div></section></motion.main>
}

function Breathing({ onReturn }: { onReturn: () => void }) {
  const [active, setActive] = useState(false)
  return <motion.main className="breathing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><button className="close-break" onClick={onReturn} aria-label="Return to learning"><X /></button><div className="breathing-copy"><span className="section-kicker">A QUIET MOMENT</span><h2>Let&apos;s make a little<br /><em>room.</em></h2><p>Before we continue, let&apos;s give your mind a moment to settle. Follow the circle at your own pace.</p></div><div className={`breath-orb ${active ? 'is-active' : ''}`}><div className="breath-ring" /><div className="breath-ring ring-two" /><div className="breath-core"><span>{active ? 'Inhale' : 'Ready?'}</span><small>4 · 7 · 8</small></div></div><div className="breathing-controls"><button className="button button-primary" onClick={() => setActive(!active)}>{active ? <><Pause /> Pause practice</> : <><Play /> Begin practice</>}</button><button className="sound-button"><Volume2 /> Sound on</button></div><p className="breath-note">A three-minute reset can change the shape of the next hour.</p><button className="return-study" onClick={onReturn}>I feel ready to return <ArrowUpRight /></button></motion.main>
}

export default function Page() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'breathing'>('landing')
  return <div className={`app-shell view-${view}`}><Header dashboard={view !== 'landing'} onHome={() => setView('landing')} onDashboard={() => setView('dashboard')} /><AnimatePresence mode="wait">{view === 'landing' && <Landing key="landing" onStart={() => setView('dashboard')} />}{view === 'dashboard' && <Dashboard key="dashboard" onBreak={() => setView('breathing')} />}{view === 'breathing' && <Breathing key="breathing" onReturn={() => setView('dashboard')} />}</AnimatePresence><footer className="site-footer"><span>© 2026 Vidyamitra</span><span>Learn in your own light <span className="footer-mark">✦</span></span></footer></div>
}
