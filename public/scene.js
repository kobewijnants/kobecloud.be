// 3D desk scene. The terminal is the real DOM element from index.html, placed on
// the monitor with CSS3DRenderer so it stays selectable, scrollable and typeable.
// WebGL draws everything else behind it. Phones, small windows and browsers
// without WebGL2 keep the flat terminal.

import * as THREE from './vendor/three/three.module.min.js';
import { CSS3DRenderer, CSS3DObject } from './vendor/three/CSS3DRenderer.js';
import { RoundedBoxGeometry } from './vendor/three/RoundedBoxGeometry.js';

const term = document.getElementById('term');
const input = document.getElementById('cmd');
const promptForm = document.getElementById('prompt');

const SCREEN_W = 0.6;
const SCREEN_H = 0.44;
const ASPECT = SCREEN_W / SCREEN_H;
const SCREEN = new THREE.Vector3(0, 0.36, -0.14); // centre of the screen surface
const FOV = 35;
const WIDE_POS = new THREE.Vector3(0.95, 0.74, 1.4);
const WIDE_TARGET = new THREE.Vector3(0.06, 0.2, -0.12);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const supported = (() => {
  try { return !!(window.WebGL2RenderingContext && document.createElement('canvas').getContext('webgl2')); } catch (e) { return false; }
})();
const fits = () => innerWidth >= 760 && innerHeight >= 520 && !matchMedia('(pointer: coarse)').matches;
const wanted = () => { try { return localStorage.getItem('3d') !== 'off'; } catch (e) { return true; } };
const remember = (on) => { try { localStorage.setItem('3d', on ? 'on' : 'off'); } catch (e) {} };
const isLight = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
};

let S = null;          // live scene state while 3D is mounted
let mounting = false;
let firstMount = true;

/* ---------- public API (used by main.js commands) ---------- */

window.KC3D = {
  supported,
  fits,
  get active() { return !!S; },
  get wide() { return !!S && S.goal === 1; },
  set(on) { remember(on); on ? mount() : unmount(); },
  toggleView() { if (S) setView(S.goal === 1 ? 0 : 1); },
};

/* ---------- on-page controls ---------- */

const ui = document.createElement('div');
ui.className = 'scene-ui';
ui.innerHTML = '<button type="button" data-a="view">zoom out</button><button type="button" data-a="dim">2D</button>';
const viewBtn = ui.querySelector('[data-a="view"]');
const dimBtn = ui.querySelector('[data-a="dim"]');
viewBtn.addEventListener('click', () => window.KC3D.toggleView());
dimBtn.addEventListener('click', () => window.KC3D.set(!S));
document.body.appendChild(ui);

function syncUI() {
  ui.hidden = !(supported && fits());
  viewBtn.hidden = !S;
  viewBtn.textContent = S && S.goal === 1 ? 'close up' : 'zoom out';
  dimBtn.textContent = S ? '2D' : '3D';
  dimBtn.title = S ? 'Show only the terminal' : 'Put the terminal back on the desk';
}

/* ---------- helpers ---------- */

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });

function put(parent, geo, mat, x, y, z, shadows = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  parent.add(m);
  return m;
}

function rod(parent, a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = put(parent, new THREE.CylinderGeometry(r, r, d.length(), 12), mat, 0, 0, 0);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const MONO = '"JetBrains Mono", ui-monospace, monospace';

/* ---------- scene ---------- */

function build(scene) {
  const parts = { leds: [], themed: {} };

  // room
  const wall = std(0x161a20, { roughness: 0.95 });
  const floor = std(0x0e1013, { roughness: 0.9 });
  const wood = std(0x5b3d29, { roughness: 0.6 });
  parts.themed = { wall, floor };

  const fl = put(scene, new THREE.PlaneGeometry(14, 14), floor, 0, -0.76, 0);
  fl.rotation.x = -Math.PI / 2;
  fl.castShadow = false;
  const wl = put(scene, new THREE.PlaneGeometry(14, 6), wall, 0, 2, -0.62);
  wl.castShadow = false;

  // desk
  put(scene, new RoundedBoxGeometry(1.7, 0.04, 0.85, 2, 0.008), wood, 0, -0.02, -0.02);
  const legMat = std(0x2a2d31, { roughness: 0.5, metalness: 0.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    put(scene, new THREE.BoxGeometry(0.05, 0.72, 0.05), legMat, sx * 0.79, -0.4, -0.02 + sz * 0.37);
  }

  // monitor
  const plastic = std(0x15181c, { roughness: 0.45, metalness: 0.15 });
  put(scene, new RoundedBoxGeometry(SCREEN_W + 0.04, SCREEN_H + 0.05, 0.03, 4, 0.01), plastic, 0, SCREEN.y - 0.005, SCREEN.z - 0.016);
  put(scene, new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), new THREE.MeshBasicMaterial({ color: 0x000000 }), SCREEN.x, SCREEN.y, SCREEN.z - 0.0005, false);
  put(scene, new RoundedBoxGeometry(0.4, 0.28, 0.05, 3, 0.02), plastic, 0, SCREEN.y, SCREEN.z - 0.045);
  put(scene, new THREE.BoxGeometry(0.05, 0.22, 0.025), plastic, 0, 0.115, SCREEN.z - 0.075);
  put(scene, new RoundedBoxGeometry(0.24, 0.014, 0.17, 2, 0.006), plastic, 0, 0.007, SCREEN.z - 0.05);
  const power = std(0x000000, { emissive: 0x7ee787, emissiveIntensity: 1.5 });
  put(scene, new THREE.CircleGeometry(0.0025, 12), power, SCREEN_W / 2 - 0.004, SCREEN.y - SCREEN_H / 2 - 0.016, SCREEN.z - 0.0008, false);

  // keyboard
  const kbMat = std(0x1b1f24, { roughness: 0.5 });
  const keyMat = std(0x2c323a, { roughness: 0.55 });
  put(scene, new RoundedBoxGeometry(0.44, 0.018, 0.15, 2, 0.006), kbMat, 0, 0.009, 0.17);
  const cols = 15, rows = 4, pitch = 0.0275;
  const x0 = -((cols - 1) / 2) * pitch, z0 = 0.11;
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.024, 0.01, 0.024), keyMat, rows * cols);
  keys.castShadow = keys.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const keyPos = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const p = new THREE.Vector3(x0 + c * pitch, 0.022, z0 + r * pitch);
    keyPos.push(p);
    dummy.position.copy(p); dummy.updateMatrix();
    keys.setMatrixAt(r * cols + c, dummy.matrix);
  }
  scene.add(keys);
  const space = put(scene, new THREE.BoxGeometry(0.17, 0.01, 0.024), keyMat, 0, 0.022, z0 + rows * pitch);
  parts.keys = { mesh: keys, pos: keyPos, cols, space, down: new Map(), dummy };

  // mouse + pad
  put(scene, new THREE.BoxGeometry(0.26, 0.003, 0.22), std(0x101215, { roughness: 1 }), 0.36, 0.0015, 0.16, false).receiveShadow = true;
  put(scene, new RoundedBoxGeometry(0.06, 0.024, 0.1, 4, 0.011), plastic, 0.36, 0.013, 0.17);

  // mug
  const mugMat = std(0xe57000, { roughness: 0.4 });
  put(scene, new THREE.CylinderGeometry(0.038, 0.034, 0.1, 28), mugMat, -0.45, 0.05, 0.1);
  const handle = put(scene, new THREE.TorusGeometry(0.026, 0.007, 10, 20, Math.PI), mugMat, -0.488, 0.05, 0.1);
  handle.rotation.z = Math.PI / 2;
  const coffee = put(scene, new THREE.CircleGeometry(0.034, 24), std(0x2e1a0e, { roughness: 0.2 }), -0.45, 0.092, 0.1, false);
  coffee.rotation.x = -Math.PI / 2;

  // homelab rack: alpha, beta, vent, switch (same order as neofetch)
  const rack = new THREE.Group();
  rack.position.set(0.63, 0, -0.2);
  scene.add(rack);
  const metal = std(0x2b2f35, { roughness: 0.4, metalness: 0.6 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    put(rack, new THREE.BoxGeometry(0.012, 0.3, 0.012), metal, sx * 0.145, 0.155, sz * 0.13);
  }
  put(rack, new THREE.BoxGeometry(0.31, 0.01, 0.28), metal, 0, 0.305, 0);
  put(rack, new THREE.BoxGeometry(0.31, 0.01, 0.28), metal, 0, 0.005, 0);

  const unitMat = std(0x1d2126, { roughness: 0.5, metalness: 0.3 });
  const ledGeo = new THREE.BoxGeometry(0.006, 0.006, 0.002);
  function led(x, y, color, blink) {
    const m = std(0x000000, { emissive: color, emissiveIntensity: 2 });
    put(rack, ledGeo, m, x, y, 0.1215, false);
    parts.leds.push({ m, blink, on: true });
  }
  function label(text, y) {
    const tex = canvasTexture(256, 64, (g, w, h) => {
      g.fillStyle = '#c9d1d9';
      g.font = `600 38px ${MONO}`;
      g.textBaseline = 'middle';
      g.fillText(text, 6, h / 2 + 2);
    });
    put(rack, new THREE.PlaneGeometry(0.072, 0.018), new THREE.MeshBasicMaterial({ map: tex, transparent: true }), -0.075, y, 0.1212, false);
  }
  for (const [name, y] of [['alpha', 0.245], ['beta', 0.185]]) {
    put(rack, new THREE.BoxGeometry(0.27, 0.05, 0.24), unitMat, 0, y, 0);
    label(name, y);
    led(0.07, y, 0x7ee787, false);
    led(0.085, y, 0x7ee787, true);
    led(0.1, y, 0x79c0ff, true);
  }
  const vent = canvasTexture(256, 40, (g, w, h) => {
    g.fillStyle = '#1d2126'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0b0d10';
    for (let x = 12; x < w - 12; x += 10) g.fillRect(x, 8, 5, h - 16);
  });
  put(rack, new THREE.BoxGeometry(0.27, 0.04, 0.24), [unitMat, unitMat, unitMat, unitMat, std(0xffffff, { map: vent }), unitMat], 0, 0.13, 0);
  put(rack, new THREE.BoxGeometry(0.27, 0.035, 0.24), unitMat, 0, 0.075, 0);
  const portMat = std(0x050607, { roughness: 1 });
  for (let i = 0; i < 8; i++) {
    put(rack, new THREE.BoxGeometry(0.014, 0.01, 0.002), portMat, -0.1 + i * 0.019, 0.072, 0.121, false);
    led(-0.1 + i * 0.019, 0.084, 0xff9e57, true);
  }

  // plant on the rack
  put(rack, new THREE.CylinderGeometry(0.045, 0.035, 0.07, 20), std(0xb5643c), 0, 0.345, 0);
  const leafMat = std(0x3f7d4a, { roughness: 0.7 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = put(rack, new THREE.SphereGeometry(0.02, 10, 8), leafMat, Math.cos(a) * 0.02, 0.41, Math.sin(a) * 0.02);
    leaf.scale.set(0.55, 2.4, 0.3);
    leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * -0.5);
  }

  // poster above the rack
  const poster = canvasTexture(720, 520, (g, w, h) => {
    g.fillStyle = '#0b0f14'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ff9e57'; g.lineWidth = 6; g.strokeRect(24, 24, w - 48, h - 48);
    g.fillStyle = '#ff9e57'; g.font = `700 86px ${MONO}`; g.fillText('kobecloud', 64, 210);
    g.fillStyle = '#6b7785'; g.font = `400 30px ${MONO}`; g.fillText('// est. in a spare room', 66, 266);
    g.fillStyle = '#7ee787'; g.font = `600 34px ${MONO}`; g.fillText('$ kubectl apply -f .', 66, 400);
  });
  put(scene, new THREE.PlaneGeometry(0.4, 0.29), std(0xffffff, { map: poster, roughness: 0.9 }), 0.6, 0.66, -0.615, false);

  // desk lamp
  const lampMat = std(0x23272c, { roughness: 0.35, metalness: 0.5 });
  const j0 = new THREE.Vector3(-0.72, 0.02, -0.26);
  const j1 = new THREE.Vector3(-0.69, 0.4, -0.28);
  const head = new THREE.Vector3(-0.53, 0.45, -0.17);
  const aim = new THREE.Vector3(-0.32, 0, 0.08);
  put(scene, new THREE.CylinderGeometry(0.065, 0.075, 0.02, 32), lampMat, j0.x, 0.01, j0.z);
  rod(scene, j0, j1, 0.007, lampMat);
  rod(scene, j1, head, 0.007, lampMat);
  put(scene, new THREE.SphereGeometry(0.013, 16, 12), lampMat, j1.x, j1.y, j1.z);
  const dir = new THREE.Vector3().subVectors(aim, head).normalize();
  const shade = put(scene, new THREE.ConeGeometry(0.06, 0.09, 28, 1, true), std(0x23272c, { roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide }), 0, 0, 0);
  shade.position.copy(head).addScaledVector(dir, 0.02);
  shade.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const bulbPos = head.clone().addScaledVector(dir, 0.045);
  put(scene, new THREE.SphereGeometry(0.018, 16, 12), std(0x000000, { emissive: 0xffc58a, emissiveIntensity: 3 }), bulbPos.x, bulbPos.y, bulbPos.z, false);

  // lights
  const hemi = new THREE.HemisphereLight(0x9bb4d6, 0x2b2016, 0.5);
  scene.add(hemi);
  const lamp = new THREE.SpotLight(0xffb36b, 1, 3, 0.8, 0.65, 2);
  lamp.position.copy(bulbPos);
  lamp.target.position.copy(aim);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0004;
  scene.add(lamp, lamp.target);
  const glow = new THREE.PointLight(0x8fd3ff, 0.12, 1.6, 2);
  glow.position.set(SCREEN.x, SCREEN.y, SCREEN.z + 0.15);
  scene.add(glow);
  const sun = new THREE.DirectionalLight(0xfff1dc, 0);
  sun.position.set(1.6, 2.6, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 8 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  parts.lights = { hemi, lamp, glow, sun };

  return parts;
}

function applyTheme() {
  if (!S) return;
  const L = isLight();
  const bg = L ? 0xd9d3c5 : 0x07090c;
  S.scene.background.set(bg);
  S.scene.fog.color.set(bg);
  S.parts.themed.wall.color.set(L ? 0xe6e1d4 : 0x1d232c);
  S.parts.themed.floor.color.set(L ? 0xb9ae99 : 0x0e1013);
  const { hemi, lamp, glow, sun } = S.parts.lights;
  hemi.intensity = L ? 1.6 : 1.1;
  lamp.intensity = L ? 0.25 : 1.1;
  glow.intensity = L ? 0.02 : 0.35;
  sun.intensity = L ? 2.2 : 0;
}

/* ---------- typing on the 3D keyboard ---------- */

const ROWS = ['`1234567890-=', '\tqwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'];
const ROW_OFFSET = [0, 0, 1, 2];
function keyIndex(e) {
  if (e.key === ' ') return 'space';
  if (e.key === 'Enter') return 2 * 15 + 13;
  if (e.key === 'Backspace') return 14;
  const k = e.key.length === 1 ? e.key.toLowerCase() : '';
  for (let r = 0; r < ROWS.length; r++) {
    const c = ROWS[r].indexOf(k);
    if (c >= 0) return r * 15 + Math.min(14, c + ROW_OFFSET[r]);
  }
  return null;
}

window.addEventListener('keydown', (e) => {
  if (!S) return;
  const i = keyIndex(e);
  if (i !== null) S.parts.keys.down.set(i, performance.now() + 110);
});

/* ---------- camera ---------- */

const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = (e.clientY / innerHeight) * 2 - 1;
});

function setView(goal) {
  S.goal = goal;
  term.classList.toggle('wide', goal === 1);
  syncUI();
  if (goal === 0 && !promptForm.hidden) input.focus({ preventScroll: true });
}

// Size the DOM terminal so that, in close-up, one CSS pixel maps to about one
// screen pixel. That keeps the text sharp at any window size.
function layout() {
  let h = Math.round(innerHeight * 0.84);
  let w = Math.round(h * ASPECT);
  if (w > innerWidth * 0.9) { w = Math.round(innerWidth * 0.9); h = Math.round(w / ASPECT); }
  term.style.width = w + 'px';
  term.style.height = h + 'px';
  S.obj.scale.setScalar(SCREEN_W / w);
  S.closeDist = (SCREEN_H * innerHeight) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * h);
  S.camera.aspect = innerWidth / innerHeight;
  S.camera.updateProjectionMatrix();
  S.gl.setSize(innerWidth, innerHeight);
  S.css.setSize(innerWidth, innerHeight);
}

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();

function frame(now) {
  S.raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - S.last) / 1000 || 0.016);
  S.last = now;

  // camera: ease between close-up and wide, plus a little mouse parallax
  S.t = reduced ? S.goal : S.t + (S.goal - S.t) * (1 - Math.exp(-dt * 2.4));
  if (Math.abs(S.goal - S.t) < 1e-4) S.t = S.goal;
  const e = S.t * S.t * (3 - 2 * S.t);
  const k = reduced ? 0 : 1 - Math.exp(-dt * 4);
  mouse.sx += (mouse.x - mouse.sx) * k;
  mouse.sy += (mouse.y - mouse.sy) * k;
  const amp = reduced ? 0 : 0.012 + 0.12 * e;
  v1.set(SCREEN.x, SCREEN.y, SCREEN.z + S.closeDist).lerp(WIDE_POS, e);
  v1.x += mouse.sx * amp;
  v1.y -= mouse.sy * amp * 0.6;
  v2.copy(SCREEN).lerp(WIDE_TARGET, e);
  S.camera.position.copy(v1);
  S.camera.lookAt(v2);

  // rack activity lights
  for (const l of S.parts.leds) {
    if (l.blink && Math.random() < dt * 9) {
      l.on = !l.on;
      l.m.emissiveIntensity = l.on ? 2 : 0.15;
    }
  }

  // pressed keys
  const kb = S.parts.keys;
  if (kb.down.size) {
    for (const [i, until] of kb.down) {
      const pressed = now < until;
      if (i === 'space') { kb.space.position.y = pressed ? 0.0185 : 0.022; }
      else {
        kb.dummy.position.copy(kb.pos[i]);
        if (pressed) kb.dummy.position.y -= 0.0035;
        kb.dummy.updateMatrix();
        kb.mesh.setMatrixAt(i, kb.dummy.matrix);
        kb.mesh.instanceMatrix.needsUpdate = true;
      }
      if (!pressed) kb.down.delete(i);
    }
  }

  S.gl.render(S.scene, S.camera);
  S.css.render(S.scene, S.camera);
}

/* ---------- mount / unmount ---------- */

async function mount() {
  if (S || mounting || !supported || !fits()) { syncUI(); return; }
  mounting = true;
  try { await document.fonts.load(`600 32px ${MONO}`); } catch (e) {}

  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog(0x000000, 2.6, 7);
  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.01, 30);

  const gl = new THREE.WebGLRenderer({ antialias: true });
  gl.setPixelRatio(Math.min(devicePixelRatio, 2));
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.domElement.className = 'gl';
  gl.domElement.setAttribute('aria-hidden', 'true');

  const css = new CSS3DRenderer();
  css.domElement.className = 'css3d';
  // keep focus changes inside the terminal from scrolling the 3D layer
  const pin = (el) => el.addEventListener('scroll', () => { el.scrollTop = 0; el.scrollLeft = 0; });
  pin(css.domElement);
  pin(css.domElement.firstChild);

  const hadFocus = document.activeElement === input;
  const obj = new CSS3DObject(term);
  term.style.userSelect = '';
  obj.position.copy(SCREEN);

  S = { scene, camera, gl, css, obj, parts: build(scene), t: 0, goal: 0, closeDist: 1, last: performance.now(), raf: 0 };
  scene.add(obj);

  document.body.classList.add('three');
  document.body.prepend(gl.domElement);
  document.body.appendChild(css.domElement);
  layout();
  applyTheme();

  if (firstMount && !reduced) {
    S.t = S.goal = 1;
    term.classList.add('wide');
    setTimeout(() => S && S.goal === 1 && setView(0), 900);
  }
  firstMount = false;
  frame(performance.now());
  syncUI();
  mounting = false;
  if (hadFocus || (!promptForm.hidden && S.goal === 0)) input.focus({ preventScroll: true });
}

function unmount() {
  if (!S) { syncUI(); return; }
  const hadFocus = document.activeElement === input;
  cancelAnimationFrame(S.raf);
  S.scene.remove(S.obj); // CSS3DObject removes its element from the DOM
  term.style.cssText = '';
  term.classList.remove('wide');
  document.body.prepend(term);
  S.scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    for (const m of [].concat(o.material || [])) { if (m.map) m.map.dispose(); m.dispose(); }
  });
  S.gl.dispose();
  S.gl.domElement.remove();
  S.css.domElement.remove();
  document.body.classList.remove('three');
  S = null;
  syncUI();
  if (hadFocus) input.focus({ preventScroll: true });
}

// zoomed out: clicking the screen goes back to the close-up
term.addEventListener('click', (e) => {
  if (S && S.goal === 1) { e.stopPropagation(); e.preventDefault(); setView(0); }
}, true);

new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (S && !fits()) unmount();
    else if (S) layout();
    else if (supported && fits() && wanted()) mount();
    syncUI();
  }, 120);
});

syncUI();
if (supported && fits() && wanted()) mount();
