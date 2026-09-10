import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

/** Web-only generative product sculpture. Native uses a lightweight fallback. */
export default function OrbitScene() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const t = useTheme();

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    import('three').then((THREE) => {
      if (cancelled || !host.current) return;
      const element = host.current;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }); } catch { return; }

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(new THREE.Color(t.background), 0.075);
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      camera.position.set(0, 0.1, 8.6);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      element.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;cursor:grab';

      scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(t.primaryStrong), 2.7));
      const key = new THREE.PointLight(0xffffff, 42, 18);
      key.position.set(2.8, 3.4, 5.4); scene.add(key);
      const rim = new THREE.PointLight(new THREE.Color(t.primaryStrong), 34, 14);
      rim.position.set(-4, -2, 2); scene.add(rim);

      const sculpture = new THREE.Group();
      sculpture.rotation.z = -0.12;
      scene.add(sculpture);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 5), new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(t.primary), metalness: 0.18, roughness: 0.12,
        clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.8, iridescenceIOR: 1.6,
        emissive: new THREE.Color(t.primaryStrong), emissiveIntensity: 0.16,
      }));
      sculpture.add(core);
      const shell = new THREE.Mesh(new THREE.TorusKnotGeometry(1.54, 0.055, 220, 18, 2, 3), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0.62 }));
      shell.rotation.x = 0.6; sculpture.add(shell);

      const ringGroup = new THREE.Group(); sculpture.add(ringGroup);
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.92 + i * 0.18, 0.012 + i * 0.004, 8, 150), new THREE.MeshStandardMaterial({ color: i === 1 ? 0xffffff : new THREE.Color(t.primary), transparent: true, opacity: 0.28 + i * 0.1, emissive: new THREE.Color(t.primaryStrong), emissiveIntensity: 0.14 }));
        ring.rotation.set(0.78 + i * 0.65, i * 0.72, 0.24 + i * 0.42); ringGroup.add(ring);
      }

      const cards: InstanceType<typeof THREE.Mesh>[] = [];
      for (let i = 0; i < 4; i++) {
        const card = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.46, 0.055, 3, 3, 1), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.34, roughness: 0.18, metalness: 0.12, clearcoat: 1 }));
        scene.add(card); cards.push(card);
      }

      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(180 * 3);
      for (let i = 0; i < 180; i++) {
        const radius = 2.5 + Math.random() * 4.2;
        const theta = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 5.4;
        positions[i * 3 + 2] = Math.sin(theta) * radius - 1;
      }
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: new THREE.Color(t.primary), size: 0.025, transparent: true, opacity: 0.5, sizeAttenuation: true }));
      scene.add(particles);

      let targetX = 0, targetY = 0, currentX = 0, currentY = 0, visible = true;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const render = (time = 0) => {
        const elapsed = reduced.matches ? 0 : time * 0.00028;
        currentX += (targetX - currentX) * 0.045; currentY += (targetY - currentY) * 0.045;
        sculpture.rotation.y = elapsed * 0.42 + currentX * 0.42; sculpture.rotation.x = 0.1 + currentY * 0.28;
        core.rotation.set(elapsed * 0.7, elapsed, elapsed * 0.18); shell.rotation.z = elapsed * -0.38;
        ringGroup.rotation.y = elapsed * 0.18; particles.rotation.y = elapsed * 0.08;
        cards.forEach((card, i) => {
          const angle = elapsed * (0.75 + i * 0.06) + i * Math.PI * 0.5;
          const radius = 2.45 + (i % 2) * 0.35;
          card.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.18) * 1.55, Math.sin(angle) * 0.7);
          card.rotation.set(Math.sin(angle) * 0.3, -angle + Math.PI / 2, Math.cos(angle) * 0.18);
        });
        camera.position.x = currentX * 0.36; camera.position.y = 0.1 - currentY * 0.24; camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };
      const updateLoop = () => { renderer.setAnimationLoop(visible && !document.hidden && !reduced.matches ? render : null); render(); };
      const resize = () => { const { width, height } = element.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); render(); };
      const pointer = (event: PointerEvent) => { if (reduced.matches) return; const rect = element.getBoundingClientRect(); targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2; targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2; };
      const resetPointer = () => { targetX = 0; targetY = 0; };
      const observer = new ResizeObserver(resize); observer.observe(element);
      const intersection = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; updateLoop(); }); intersection.observe(element);
      element.addEventListener('pointermove', pointer); element.addEventListener('pointerleave', resetPointer);
      document.addEventListener('visibilitychange', updateLoop); reduced.addEventListener('change', updateLoop);
      resize(); updateLoop(); setReady(true);
      cleanup = () => {
        observer.disconnect(); intersection.disconnect(); renderer.setAnimationLoop(null);
        element.removeEventListener('pointermove', pointer); element.removeEventListener('pointerleave', resetPointer);
        document.removeEventListener('visibilitychange', updateLoop); reduced.removeEventListener('change', updateLoop);
        scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Points) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()); } });
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => {});
    return () => { cancelled = true; cleanup(); };
  }, [t.background, t.primary, t.primaryStrong]);

  return <div aria-hidden="true" style={{ position: 'relative', height: '100%', minHeight: 360 }}>
    {!ready && <div style={{ position: 'absolute', inset: '30%', borderRadius: '50%', background: t.primarySoft, boxShadow: `0 0 100px ${t.primary}` }} />}
    <div ref={host} style={{ position: 'absolute', inset: 0 }} />
  </div>;
}
