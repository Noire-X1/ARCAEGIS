"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Hero.module.css";

const STATES = {
  ACTIVE: { hex: 0x00f0ff, css: "#00F0FF", label: "VAULT ACTIVE" },
  RESTRICTED: { hex: 0xfbbf24, css: "#FBBF24", label: "VAULT RESTRICTED" },
  FROZEN: { hex: 0xf43f5e, css: "#F43F5E", label: "VAULT FROZEN" },
};
const STATE_KEYS = Object.keys(STATES);
const LOOP_STAGES = ["OBSERVE", "ANALYZE", "REASON", "DECIDE", "ACT", "VERIFY", "MONITOR"];

function hexBlendToward(hex, whiteRatio) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const mix = (c) => Math.round(c + (255 - c) * whiteRatio);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export default function Hero({ logoSrc = "/arcaegis-logo.png" }) {
  const canvasRef = useRef(null);
  const parallaxRef = useRef(null);
  const loopSectionRef = useRef(null);
  const rootRef = useRef(null);

  const [statusText, setStatusText] = useState(STATES.ACTIVE.label);
  const [connectText, setConnectText] = useState("Connect Wallet");
  const [connected, setConnected] = useState(false);
  const [loopVisible, setLoopVisible] = useState(false);
  const [stats, setStats] = useState({ collateral: 0, response: 0, signals: 0 });

  // --- Three.js scene: setup once on mount, fully torn down on unmount ---
  useEffect(() => {
    let disposed = false;
    let animationId;
    let renderer, composer, core, shell, bgPlane, bgTexture, camera;
    let keyLight, rimLight, coreMat, shellMat, bgPlaneMat;
    let current, target;
    let mouseX = 0, mouseY = 0;
    let stateIdx = 0;
    let stateInterval;

    async function init() {
      const THREE = await import("three");
      const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
      if (disposed) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 6);

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.8;

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.6, 0.4
      );
      composer.addPass(bloomPass);

      const ambient = new THREE.AmbientLight(0x1a2233, 1.0);
      scene.add(ambient);
      keyLight = new THREE.PointLight(0x00f0ff, 5, 20);
      keyLight.position.set(3, 2, 4);
      scene.add(keyLight);
      rimLight = new THREE.PointLight(0x00f0ff, 2, 20);
      rimLight.position.set(-3, -2, -3);
      scene.add(rimLight);

      const coreGeo = new THREE.IcosahedronGeometry(1.15, 1);
      coreMat = new THREE.MeshPhysicalMaterial({
        color: 0x0b2a30, emissive: 0x00f0ff, emissiveIntensity: 0.3,
        metalness: 0.65, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.3,
      });
      core = new THREE.Mesh(coreGeo, coreMat);
      scene.add(core);

      const shellGeo = new THREE.IcosahedronGeometry(1.55, 1);
      shellMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.28 });
      shell = new THREE.Mesh(shellGeo, shellMat);
      scene.add(shell);

      // aurora + grid texture drawn onto an offscreen canvas, applied to a
      // plane inside the scene itself (not a separate DOM layer) so it
      // renders every frame regardless of how the browser composites the
      // WebGL canvas relative to other page content
      const texCanvas = document.createElement("canvas");
      texCanvas.width = 1024; texCanvas.height = 1024;
      const tctx = texCanvas.getContext("2d");
      function drawBlob(x, y, r, hex, alpha) {
        const grad = tctx.createRadialGradient(x, y, 0, x, y, r);
        const a1 = Math.round(alpha * 255).toString(16).padStart(2, "0");
        grad.addColorStop(0, hex + a1);
        grad.addColorStop(1, hex + "00");
        tctx.fillStyle = grad;
        tctx.beginPath(); tctx.arc(x, y, r, 0, Math.PI * 2); tctx.fill();
      }
      drawBlob(230, 220, 430, "#00F0FF", 0.38);
      drawBlob(830, 800, 400, "#7C3AED", 0.24);
      drawBlob(780, 260, 340, "#475569", 0.30);
      tctx.strokeStyle = "rgba(148,163,184,0.14)";
      tctx.lineWidth = 1;
      for (let x = 0; x <= 1024; x += 48) { tctx.beginPath(); tctx.moveTo(x, 0); tctx.lineTo(x, 1024); tctx.stroke(); }
      for (let y = 0; y <= 1024; y += 48) { tctx.beginPath(); tctx.moveTo(0, y); tctx.lineTo(1024, y); tctx.stroke(); }

      bgTexture = new THREE.CanvasTexture(texCanvas);
      bgTexture.wrapS = THREE.RepeatWrapping;
      bgTexture.wrapT = THREE.RepeatWrapping;
      bgPlaneMat = new THREE.MeshBasicMaterial({ map: bgTexture, transparent: true, depthWrite: false, opacity: 0.95 });
      bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), bgPlaneMat);
      bgPlane.position.z = -9;
      bgPlane.renderOrder = -1;
      scene.add(bgPlane);

      current = new THREE.Color(STATES.ACTIVE.hex);
      target = new THREE.Color(STATES.ACTIVE.hex);

      function applyState(key) {
        const s = STATES[key];
        target = new THREE.Color(s.hex);
        if (rootRef.current) {
          rootRef.current.style.setProperty("--accent", s.css);
          rootRef.current.style.setProperty("--accent-text", hexBlendToward(s.hex, 0.35));
          rootRef.current.style.setProperty("--accent-glow", s.css + "70");
        }
        setStatusText(s.label);
      }
      applyState("ACTIVE");
      stateInterval = setInterval(() => {
        stateIdx = (stateIdx + 1) % STATE_KEYS.length;
        applyState(STATE_KEYS[stateIdx]);
      }, 4200);

      function onMouseMove(e) {
        mouseX = e.clientX / window.innerWidth - 0.5;
        mouseY = e.clientY / window.innerHeight - 0.5;
        if (parallaxRef.current) {
          parallaxRef.current.style.transform = `rotateY(${mouseX * 6}deg) rotateX(${-mouseY * 6}deg)`;
        }
      }
      window.addEventListener("mousemove", onMouseMove);

      function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
      }
      window.addEventListener("resize", onResize);

      const clock = new THREE.Clock();
      function animate() {
        if (disposed) return;
        animationId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        bgTexture.offset.x = Math.sin(t * 0.02) * 0.06;
        bgTexture.offset.y = Math.cos(t * 0.015) * 0.05;

        core.rotation.y = t * 0.35;
        core.rotation.x = Math.sin(t * 0.4) * 0.15;
        shell.rotation.y = -t * 0.2;
        shell.rotation.x = Math.cos(t * 0.3) * 0.1;
        core.position.y = Math.sin(t * 0.8) * 0.06;
        shell.position.y = core.position.y;

        current.lerp(target, 0.03);
        coreMat.emissive.copy(current);
        shellMat.color.copy(current);
        keyLight.color.copy(current);
        rimLight.color.copy(current);

        camera.position.x += (mouseX * 1.1 - camera.position.x) * 0.04;
        camera.position.y += (-mouseY * 0.7 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);

        composer.render();
      }
      animate();

      // stash cleanup handles
      init.cleanup = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", onResize);
        clearInterval(stateInterval);
        cancelAnimationFrame(animationId);
        coreGeo.dispose(); coreMat.dispose();
        shellGeo.dispose(); shellMat.dispose();
        bgPlaneMat.dispose(); bgTexture.dispose();
        renderer.dispose();
      };
    }

    init();

    return () => {
      disposed = true;
      if (init.cleanup) init.cleanup();
    };
  }, []);

  // --- count-up stats on mount ---
  useEffect(() => {
    function countUp(key, targetVal, duration) {
      const start = performance.now();
      function step(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setStats((prev) => ({ ...prev, [key]: Math.round(targetVal * eased) }));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    const timer = setTimeout(() => {
      countUp("collateral", 165, 1400);
      countUp("response", 5, 900);
      countUp("signals", 4, 700);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // --- reveal the loop section on scroll ---
  useEffect(() => {
    const el = loopSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setLoopVisible(true); }),
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function connectWallet() {
    const provider = typeof window !== "undefined" && (window.okxwallet || window.ethereum);
    if (!provider) {
      setConnectText("No Wallet Found");
      setTimeout(() => setConnectText("Connect Wallet"), 2200);
      return;
    }
    try {
      setConnectText("Connecting...");
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const addr = accounts[0];
      setConnectText(addr.slice(0, 6) + "..." + addr.slice(-4));
      setConnected(true);
    } catch (err) {
      console.error(err);
      setConnectText("Connect Wallet");
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.bgGradient} />
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.noise} />

      <div className={styles.stage}>
        <div className={styles.parallax} ref={parallaxRef}>
          <div className={styles.heroPanel}>
            <div className={styles.logoSlot}>
              <img src={logoSrc} alt="Arcaegis logo" />
            </div>

            <div className={styles.wordmark}>
              ARCA<span className={styles.wordmarkAccent}>E</span>GIS
            </div>
            <div className={styles.tagline}>AI-Verified &middot; Real-World &middot; Secured</div>

            <div className={styles.statusPill}>
              <div className={styles.dot} />
              <span>{statusText}</span>
            </div>

            <button
              className={styles.connectBtn}
              onClick={connectWallet}
              style={connected ? { borderColor: "var(--safe)" } : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="6" width="20" height="14" rx="3" />
                <path d="M2 10h20" />
                <circle cx="17" cy="15" r="1.4" fill="currentColor" stroke="none" />
              </svg>
              <span>{connectText}</span>
            </button>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.glassCard}>
              <div className={styles.corner} />
              <div className={styles.iconBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
                </svg>
              </div>
              <div className={styles.value}>{stats.collateral}%</div>
              <div className={styles.label}>Collateral Ratio</div>
            </div>
            <div className={styles.glassCard}>
              <div className={styles.corner} />
              <div className={styles.iconBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M13 2L3 14h7l-1 8 11-14h-7l1-8z" />
                </svg>
              </div>
              <div className={styles.value}>{stats.response}s</div>
              <div className={styles.label}>Response Cycle</div>
            </div>
            <div className={styles.glassCard}>
              <div className={styles.corner} />
              <div className={styles.iconBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="2.5" /><circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="20" r="1.5" />
                  <circle cx="20" cy="12" r="1.5" /><circle cx="4" cy="12" r="1.5" />
                  <path d="M12 6.5V9.5M12 14.5V17.5M14.5 12H17.5M6.5 12H9.5" />
                </svg>
              </div>
              <div className={styles.value}>{stats.signals}</div>
              <div className={styles.label}>Signals Monitored</div>
            </div>
          </div>
        </div>

        <div className={styles.scrollCue}>
          <span>Scroll</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      <div
        ref={loopSectionRef}
        className={`${styles.loopSection} ${loopVisible ? styles.loopSectionVisible : ""}`}
      >
        <div className={styles.loopHeading}>The Agent Loop</div>
        <div className={styles.loopSub}>
          Arcaegis doesn&apos;t just react once. It runs a continuous cycle, verifying every action against the chain before deciding what happens next.
        </div>
        <div className={styles.loopChain}>
          {LOOP_STAGES.map((s, i) => (
            <span key={s}>
              <span className={styles.loopChip}>{s}</span>
              {i < LOOP_STAGES.length - 1 && <span className={styles.loopArrow}>→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
