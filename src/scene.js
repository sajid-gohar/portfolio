import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import portrait from './avatar.png';
const ASPECT = 370 / 1100;

const host = document.getElementById('stage');
if (host) boot(host);

function boot(host) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { host.classList.add('no-webgl'); return; }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const accent = new THREE.Color(css('--accent') || '#5cc8e8');

  const rig = new THREE.Group();
  scene.add(rig);

  // Full-body figure: transparent plane with alpha test so he sits correctly in depth against the phone and the floating labels
  const tex = new THREE.TextureLoader().load(portrait);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const H = 6.8, W = H * ASPECT;
  const medal = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, toneMapped: false })
  );
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 64),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.1, depthWrite: false })
  );
  glow.position.z = -0.6;
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
  );
  floor.rotation.x = -Math.PI / 2; floor.scale.set(1, 0.5, 1); floor.position.set(0, -H / 2 + 0.05, 0.1);
  medal.add(glow, face);
  rig.add(medal, floor);

  // Giant phone behind him: he stands in front of it, so the figure reads as stepping out of the screen
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x11161c, metalness: 1, roughness: 0.28 });
  const phone = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(4.3, 8.6, 0.34, 6, 0.42), frameMat);
  const screenCanvas = document.createElement('canvas'); screenCanvas.width = 256; screenCanvas.height = 512;
  const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace;
  const paintScreen = () => {
    const g = screenCanvas.getContext('2d'), c = '#' + accent.getHexString();
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#0a1015'); gr.addColorStop(0.55, '#0e1a22'); gr.addColorStop(1, c);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 512); screenTex.needsUpdate = true;
  };
  paintScreen();
  const screen = new THREE.Mesh(new RoundedBoxGeometry(3.9, 8.2, 0.02, 4, 0.0), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.z = 0.175;
  const island = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.3, 0.03, 4, 0.14), new THREE.MeshBasicMaterial({ color: 0x050709 }));
  island.position.set(0, 3.7, 0.2);
  phone.add(shell, screen, island);
  phone.position.set(0, 0.0, -1.5); phone.scale.setScalar(0.82);
  phone.rotation.y = -0.18;
  rig.add(phone);

  // Perspective grid floor that drifts toward the viewer
  const gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: accent.clone() }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 uColor; uniform float uTime;
      void main(){
        vec2 g = vec2(vUv.x * 18.0, vUv.y * 18.0 + uTime);
        vec2 f = abs(fract(g - 0.5) - 0.5) / fwidth(g);
        float line = 1.0 - min(min(f.x, f.y), 1.0);
        float fade = 1.0 - smoothstep(0.05, 0.36, length(vUv - 0.5));
        gl_FragColor = vec4(uColor, line * fade * 0.55);
      }`,
  });
  gridMat.extensions = { derivatives: true };
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), gridMat);
  grid.rotation.x = -Math.PI / 2; grid.position.set(0, -H / 2 + 0.02, 0);
  rig.add(grid);

  // Floating glass labels at different depths (real skills, not fake UI)
  const chipLabels = [
    { t: 'Flutter', x: -2.5, y: 1.9, z: 0.9 }, { t: 'Dart', x: 2.4, y: 2.5, z: -0.4 },
    { t: 'Firebase', x: 2.6, y: 0.2, z: 1.2 }, { t: 'Kotlin', x: -2.4, y: -0.9, z: -0.3 },
    { t: 'On-device AI', x: 2.2, y: -2.1, z: 0.6 },
  ];
  const chips = chipLabels.map((d, i) => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 150;
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.585), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false }));
    m.position.set(d.x, d.y, d.z);
    rig.add(m);
    return { m, cv, tx, d, i };
  });
  const paintChips = () => {
    const dark = document.documentElement.dataset.theme !== 'light';
    chips.forEach(({ cv, tx, d }) => {
      const g = cv.getContext('2d'); g.clearRect(0, 0, 512, 150);
      g.beginPath(); g.roundRect(6, 6, 500, 138, 69);
      g.fillStyle = dark ? 'rgba(18,24,30,0.78)' : 'rgba(255,255,255,0.82)'; g.fill();
      g.lineWidth = 3; g.strokeStyle = dark ? 'rgba(255,255,255,0.22)' : 'rgba(10,20,30,0.18)'; g.stroke();
      g.fillStyle = '#' + accent.getHexString(); g.beginPath(); g.arc(62, 75, 12, 0, 6.283); g.fill();
      g.fillStyle = dark ? '#e9edf1' : '#0f1419'; g.font = '600 56px Geist, system-ui, sans-serif'; g.textBaseline = 'middle';
      g.fillText(d.t, 96, 78); tx.needsUpdate = true;
    });
  };
  paintChips();
  document.fonts && document.fonts.ready.then(paintChips);

  // Dust
  const N = 420, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 4.5 + Math.random() * 7, t = Math.random() * 6.283, u = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(u) * Math.cos(t), r * Math.cos(u) * 0.7, r * Math.sin(u) * Math.sin(t) - 2], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: accent, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(dust);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.PointLight(accent, 40, 30); key.position.set(-4, 3, 5); scene.add(key);
  const fill = new THREE.PointLight(0xffffff, 18, 30); fill.position.set(5, -2, 6); scene.add(fill);

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? 21 : 17;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  // Theme swap without rebuilding
  const applyTheme = () => {
    const c = new THREE.Color(css('--accent'));
    accent.copy(c);
    glow.material.color.copy(c); gridMat.uniforms.uColor.value.copy(c);
    dust.material.color.copy(c); key.color.copy(c);
    paintScreen(); paintChips();
  };
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });



  const t0 = performance.now();
  function frame() {
    requestAnimationFrame(frame);
    const b = host.getBoundingClientRect();
    if (b.bottom < 0 || b.top > innerHeight) return;
    const t = (performance.now() - t0) / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    const sy = Math.min(scrollY / innerHeight, 1.2);

    rig.rotation.y = mouse.x * 0.22;
    rig.rotation.x = mouse.y * 0.1;
    rig.position.y = Math.sin(t * 0.8) * 0.12 - sy * 1.2;
    medal.rotation.y = mouse.x * 0.12;
    medal.rotation.x = mouse.y * 0.05;
    if (!reduce) {
      dust.rotation.y = t * 0.02;
      gridMat.uniforms.uTime.value = t * 0.6;
    }
    chips.forEach(({ m, d, i }) => {
      const k = reduce ? 0 : 1;
      m.position.y = d.y + Math.sin(t * 0.9 + i * 1.7) * 0.14 * k;
      m.rotation.y = -mouse.x * 0.2 * (d.z + 1.2) * 0.3;
    });
    phone.rotation.y = -0.18 + mouse.x * 0.1;
    renderer.render(scene, camera);
  }
  frame();

  host.classList.add("ready");
}
