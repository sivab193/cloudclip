import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

/** Web-only, lazy-loaded GPU illustration. Native uses the lightweight fallback. */
export default function OrbitScene() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const t = useTheme();
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    import('three').then(THREE => {
      if (cancelled || !host.current) return;
      const element = host.current;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch { return; }
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.z = 8;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      element.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
      scene.add(new THREE.AmbientLight(0xffffff, 2.4));
      const light = new THREE.DirectionalLight(0xffffff, 5);
      light.position.set(3, 5, 5); scene.add(light);
      const group = new THREE.Group(); scene.add(group);
      const material = new THREE.MeshPhysicalMaterial({ color: t.primary, metalness: 0.35, roughness: 0.22, clearcoat: 1 });
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), material);
      group.add(core);
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65 + i * 0.23, 0.018, 8, 120), new THREE.MeshStandardMaterial({ color: t.primary, transparent: true, opacity: 0.26 + i * 0.1 }));
        ring.rotation.set(0.8 + i * 0.6, i * 0.8, i * 0.5); group.add(ring);
      }
      const satellites: InstanceType<typeof THREE.Mesh>[] = [];
      for (let i = 0; i < 5; i++) {
        const bead = new THREE.Mesh(new THREE.OctahedronGeometry(0.11 + i * 0.025), new THREE.MeshStandardMaterial({ color: i % 2 ? t.accent : t.primary, metalness: 0.4, roughness: 0.2 }));
        group.add(bead); satellites.push(bead);
      }
      let pointerX = 0, pointerY = 0, visible = true;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const render = (time = 0) => {
        const elapsed = reduced.matches ? 0 : time * 0.00025;
        group.rotation.y = elapsed * 0.3 + pointerX * 0.15;
        group.rotation.x = pointerY * 0.12;
        core.rotation.set(elapsed, elapsed * 0.7, 0.2);
        satellites.forEach((bead, i) => { const angle = elapsed + i * Math.PI * 0.4; bead.position.set(Math.cos(angle) * 2.15, Math.sin(angle) * 1.4, Math.sin(angle + i) * 0.6); });
        renderer.render(scene, camera);
      };
      const updateLoop = () => { renderer.setAnimationLoop(visible && !document.hidden && !reduced.matches ? render : null); render(); };
      const resize = () => { const { width, height } = element.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); render(); };
      const pointer = (event: PointerEvent) => { if (reduced.matches) return; const rect = element.getBoundingClientRect(); pointerX = (event.clientX - rect.left) / rect.width - 0.5; pointerY = (event.clientY - rect.top) / rect.height - 0.5; };
      const observer = new ResizeObserver(resize); observer.observe(element);
      const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateLoop(); }); intersection.observe(element);
      element.addEventListener('pointermove', pointer);
      document.addEventListener('visibilitychange', updateLoop);
      reduced.addEventListener('change', updateLoop);
      resize(); updateLoop(); setReady(true);
      cleanup = () => {
        observer.disconnect(); intersection.disconnect(); renderer.setAnimationLoop(null);
        element.removeEventListener('pointermove', pointer); document.removeEventListener('visibilitychange', updateLoop); reduced.removeEventListener('change', updateLoop);
        scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(item => item.dispose()); } });
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => {});
    return () => { cancelled = true; cleanup(); };
  }, [t.primary, t.accent]);
  return <div aria-hidden="true" style={{ position: 'relative', height: '100%', minHeight: 330 }}>
    {!ready && <div style={{ position: 'absolute', inset: '24%', borderRadius: '35%', background: t.primary, transform: 'rotate(25deg)', opacity: 0.25 }} />}
    <div ref={host} style={{ position: 'absolute', inset: 0 }} />
  </div>;
}
