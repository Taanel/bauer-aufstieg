// ============================================================
//  modelcheck.js – Testszene für den Designer (öffnen: localhost:8000/modelcheck.html).
//  Zeigt das Brett und alle Figuren in einer Reihe, damit wir prüfen
//  können, ob die Blender-Modelle richtig groß und richtig gedreht sind.
//  Maus: ziehen = drehen, Mausrad = zoomen (nur in dieser Testszene).
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from './config.js';
import { loadModels, makePiece, createAnimator, PIECE_KEYS } from './models.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = CONFIG.light.shadows;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.prepend(renderer.domElement);

// ---------- Szene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.maps[0].background); // wird pro Map in showMap() gesetzt

// Spiegelungen für Glas und glänzende Figuren (künstlicher "Raum")
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = CONFIG.light.envIntensity;

// Feiner Rasterboden unter dem Brett (weiß angelegt, Farbe kommt pro Map in showMap())
const grid = new THREE.GridHelper(60, 60, '#ffffff', '#ffffff');
grid.position.y = -0.55;
scene.add(grid);

// ---------- Kamera ----------
// Schräg von vorn oben auf die Brettmitte (Werte in config.js)
const cam = CONFIG.camera;
const camera = new THREE.PerspectiveCamera(cam.fov, window.innerWidth / window.innerHeight, 0.1, 100);
const tilt = THREE.MathUtils.degToRad(cam.tilt);
camera.position.set(0, Math.sin(tilt) * cam.distance, cam.lookAtZ + Math.cos(tilt) * cam.distance);
const lookTarget = new THREE.Vector3(0, 0, cam.lookAtZ);
camera.lookAt(lookTarget);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(lookTarget);
controls.enableDamping = true;

// ---------- Licht ----------
const L = CONFIG.light;
scene.add(new THREE.HemisphereLight('#ffffff', '#5a0a0a', L.hemiIntensity));
const sun = new THREE.DirectionalLight('#fff4e6', L.sunIntensity);
sun.position.set(L.sunX, L.sunY, L.sunZ);
sun.castShadow = true;
sun.shadow.mapSize.set(L.shadowSize, L.shadowSize);
const s = sun.shadow.camera;                 // Schatten nur dort berechnen, wo das Brett ist
s.left = -6; s.right = 6; s.top = 6; s.bottom = -6; s.near = 1; s.far = 30;
sun.shadow.bias = -0.0005;
scene.add(sun);

// ---------- Fenstergröße ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Modelle laden und aufstellen ----------
const NAMES_DE = {
  pawn_light: 'Bauer (Spieler)', pawn_dark: 'Bauer (Gegner)', knight_dark: 'Springer',
  bishop_dark: 'Läufer', rook_dark: 'Turm', queen_dark: 'Dame', king_dark: 'König',
};

const models = await loadModels();

// Alle Animatoren (Blender-Animationen), die in jedem Frame weiterlaufen müssen
const animators = [];

// ---------- Maps ----------
// Alle Maps liegen in der Szene, aber nur eine ist sichtbar.
models.maps.forEach((m) => {
  m.group.visible = false;
  scene.add(m.group);
  // Hat die Map eigene Animationen (z. B. Deko, die sich bewegt)? Dann in Schleife abspielen.
  const anim = createAnimator(m.group, m.clips);
  anim.playAll();
  animators.push(anim);
});
let currentMap = 0;

// Zeigt Map Nummer "index" (0 = erste Map) und setzt Hintergrund + Raster passend.
function showMap(index) {
  currentMap = index;
  models.maps.forEach((m, i) => { m.group.visible = i === index; });
  const cfg = models.maps[index].cfg;
  scene.background.set(cfg.background);
  grid.material.color.set(cfg.background).lerp(new THREE.Color('#ffffff'), CONFIG.colors.gridBrightness);
  grid.visible = cfg.grid;
  updateStatus();
}

// Jede Map einmal unsichtbar "vorzeichnen", während noch "Lade Figuren …" zu sehen ist.
// So landen alle Texturen schon jetzt in der Grafikkarte und der Wechsel ruckelt später nicht.
models.maps.forEach((m) => {
  models.maps.forEach((o) => { o.group.visible = o === m; });
  renderer.render(scene, camera);
});

// Alle 7 Figuren nebeneinander in der Brettmitte (Feldmitten bei x = -3,5 … +2,5)
const pieceAnims = {};   // Animator pro Figur (für Taste A)
PIECE_KEYS.forEach((key, i) => {
  const piece = makePiece(models, key);
  piece.position.set(-3.5 + i, 0, 0.5);
  scene.add(piece);
  pieceAnims[key] = createAnimator(piece, models.clips[key]);
  animators.push(pieceAnims[key]);
});

// Taste A: jede Figur spielt ihre nächste Blender-Animation (zum Anschauen)
let animIndex = -1;
let animLabel = '';
function playNextAnims() {
  animIndex++;
  const played = [];
  for (const key of PIECE_KEYS) {
    const a = pieceAnims[key];
    if (!a.names.length) continue;
    const name = a.names[animIndex % a.names.length];
    a.play(name);
    played.push(name);
  }
  animLabel = played.length ? `Spielt: ${played.join(', ')}` : 'Keine Blender-Animationen gefunden';
  updateStatus();
}

// Kontroll-Liste: Welche Figur kommt aus Blender, welche ist Ersatz?
const statusEl = document.getElementById('status');
const line = (label, src, anims = []) => (src === 'blender'
  ? `<div class="ok">✓ ${label}: Blender</div>`
  : `<div class="warn">⚠ ${label}: Ersatzfigur</div>`) +
  (anims.length ? `<div style="opacity:.8;margin-left:18px;font-size:12px">🎬 ${anims.join(', ')}</div>` : '');
function updateStatus() {
  const mapLines = models.maps.map((m, i) => {
    const label = `${i === currentMap ? '▶ ' : ''}Map ${i + 1}`;
    return m.source === 'blender'
      ? `<div class="ok">✓ ${label}: Blender</div>`
      : `<div class="warn">⚠ ${label}: Ersatz-Brett</div>`;
  }).join('');
  statusEl.innerHTML =
    '<b>Block 0 – Modell-Check</b> (von links nach rechts)' +
    PIECE_KEYS.map((k) => line(NAMES_DE[k], models.report[k], models.clips[k].map((c) => c.name))).join('') +
    `<div style="opacity:.8;margin-top:4px">Taste A: Animationen abspielen ${animLabel ? '– ' + animLabel : ''}</div>` +
    (models.namesInFile.length
      ? `<div style="opacity:.7;margin-top:6px;max-width:320px">Namen in pieces.glb: ${models.namesInFile.join(', ')}</div>`
      : '<div style="opacity:.7;margin-top:6px">assets/pieces.glb nicht gefunden</div>') +
    '<b style="display:block;margin-top:10px">Maps</b> (Tasten 1–5 wechseln)' + mapLines;
}

// Testszene: Mit den Zahlentasten 1–5 die Maps durchschalten
window.addEventListener('keydown', (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= models.maps.length) showMap(n - 1);
  if (e.code === 'KeyA') playNextAnims();
});

showMap(0);
statusEl.classList.remove('hidden');
document.getElementById('loading').classList.add('hidden');

// ---------- Game Loop ----------
const fpsEl = document.getElementById('fps');
let last = performance.now();
let frames = 0, fpsTimer = 0;

function loop(now) {
  // Delta-Zeit in Sekunden, höchstens 0,05 s (verhindert Sprünge nach Tab-Wechsel)
  const realDt = (now - last) / 1000;
  const dt = Math.min(realDt, 0.05);
  last = now;

  // FPS-Anzeige einmal pro Sekunde aktualisieren (mit echter Zeit gemessen)
  frames++; fpsTimer += realDt;
  if (fpsTimer >= 1) { fpsEl.textContent = `${frames} fps`; frames = 0; fpsTimer = 0; }

  animators.forEach((a) => a.update(dt));   // Blender-Animationen weiterlaufen lassen
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
