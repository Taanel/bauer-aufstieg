// ============================================================
//  main.js – das Spiel: Szene, Game Loop, Spieler, Gegner, König.
//  Alle Zahlen stehen in config.js.
//
//  Aufbau dieser Datei (von oben nach unten):
//   1. Renderer, Szene, Kamera, Licht
//   2. Sound (WebAudio-Töne)
//   3. Effekte (Partikel, Vorwarnungen, goldene Felder)
//   4. Figuren ("Actor") – gemeinsamer Teil für alle Figuren
//   5. Spieler (inkl. Fähigkeiten)
//   6. Gegnerische Bauern
//   7. Der König (Boss)
//   8. Spielablauf (Titel → Runde → Sieg → Menü → … → Schachmatt)
//   9. Tastatur
//  10. Laden und Game Loop
// ============================================================

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from './config.js';
import { loadModels, makePiece, createAnimator } from './models.js';
import { t, has, getLang, toggleLang, applyLang } from './lang.js';

const P = CONFIG.player;
const E = CONFIG.enemyPawn;
const B = CONFIG.boss;
const J = CONFIG.juice;
const BOARD_HALF = 4;   // Brett geht von -4 bis +4 (8×8 Felder)

// ============================================================
// 1. Renderer, Szene, Kamera, Licht
// ============================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CONFIG.light.exposure;   // Gesamthelligkeit
renderer.shadowMap.enabled = CONFIG.light.shadows;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.maps[0].background);

// Spiegelungen für Glas und glänzende Figuren (künstlicher "Raum")
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = CONFIG.light.envIntensity;

// Boden unter dem Brett: dunkle Fläche + feines Raster, verschwindet in der Ferne im Nebel
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: '#2a0806', roughness: 0.55, metalness: 0.1 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.56;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(60, 60, '#ffffff', '#ffffff');   // Farbe kommt pro Map in showMap()
grid.position.y = -0.55;
scene.add(grid);
if (CONFIG.light.fog) scene.fog = new THREE.Fog(CONFIG.maps[0].background, CONFIG.light.fogNear, CONFIG.light.fogFar);

// Kamera: schräg von vorn oben auf die Brettmitte
const cam = CONFIG.camera;
const camera = new THREE.PerspectiveCamera(cam.fov, window.innerWidth / window.innerHeight, 0.1, 100);
const camTilt = THREE.MathUtils.degToRad(cam.tilt);

// Setzt die Kamera auf ihren Kreis um das Brett.
//   angle = Drehung ums Brett (0 = Spielansicht von vorn)
//   zoom  = 0 … 1: wie weit die Kamera auf den Punkt (fx, fz) zufährt
let camFollowX = 0, camFollowZ = 0;            // Kamera folgt den Spielern ein wenig (siehe Game Loop)
function placeCamera(angle = 0, zoom = 0, fx = 0, fz = 0) {
  const tx = THREE.MathUtils.lerp(camFollowX, fx, zoom);
  const tz = THREE.MathUtils.lerp(cam.lookAtZ + camFollowZ, fz, zoom);
  const dist = cam.distance * (1 - zoom * 0.7);
  const flat = Math.cos(camTilt) * dist;           // Abstand am Boden
  camera.position.set(tx + Math.sin(angle) * flat, Math.sin(camTilt) * dist, tz + Math.cos(angle) * flat);
  camera.lookAt(tx, 0, tz);
}
placeCamera(0);

// Licht
const L = CONFIG.light;
scene.add(new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity));
const sun = new THREE.DirectionalLight(L.sunColor, L.sunIntensity);
sun.position.set(L.sunX, L.sunY, L.sunZ);
sun.castShadow = true;
sun.shadow.mapSize.set(L.shadowSize, L.shadowSize);
const sc = sun.shadow.camera;                 // Schatten nur dort berechnen, wo das Brett ist
sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 30;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;                 // verhindert Streifen auf den Figuren
sun.shadow.radius = L.shadowSoftness;         // weiche Schattenkante
scene.add(sun);

// Lichtblitze: kurze Punktlichter bei Einschlägen – beleuchten die Figuren von unten (wirkt sehr 3D)
const impactLights = [];
if (CONFIG.colors.impactLights) {
  for (let i = 0; i < 3; i++) {
    const pl = new THREE.PointLight('#ffffff', 0, 4.5, 2);
    scene.add(pl);
    impactLights.push(pl);
  }
}
let impactIndex = 0;
function flashLight(x, z, color, power = 12) {
  if (!impactLights.length) return;
  const pl = impactLights[impactIndex++ % impactLights.length];
  pl.color.set(color);
  pl.position.set(x, 0.7, z);
  pl.intensity = power;
}
function updateImpactLights(dt) {
  for (const pl of impactLights) pl.intensity *= Math.exp(-dt * 7);
}

// Goldener Rahmen ums Brett (fängt Licht und Spiegelungen ein → mehr Tiefe)
if (CONFIG.colors.goldFrame) {
  const goldMat = new THREE.MeshStandardMaterial({ color: '#c9973f', metalness: 0.9, roughness: 0.28, emissive: '#3a2000', emissiveIntensity: 0.4 });
  const w = 8.24, t = 0.12, h = 0.1;
  [[0, -4.06, w, t], [0, 4.06, w, t], [-4.06, 0, t, w], [4.06, 0, t, w]].forEach(([x, z, sx, sz]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), goldMat);
    bar.position.set(x, -0.02, z);
    bar.castShadow = bar.receiveShadow = true;
    scene.add(bar);
  });
}

// Leuchten (Bloom): helle Stellen strahlen weich aus – wie in der Blender-Ansicht "Rendered"
const R = CONFIG.render;
let composer = null;
if (R.bloom) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight),
    R.bloomStrength, R.bloomRadius, R.bloomThreshold));
  composer.addPass(new OutputPass());          // Farben/Tonemapping am Ende richtig ausgeben
}
function renderFrame() {
  if (composer) composer.render();
  else renderer.render(scene, camera);
}

// Weicher Kontaktschatten unter jeder Figur (ein dunkler, verlaufender Kreis)
const contactTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const contactGeo = new THREE.PlaneGeometry(0.95, 0.95);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer?.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// 2. Sound – alles aus WebAudio gebaut (keine Audiodateien):
//    Töne (Oszillatoren) + Rauschen (für Schläge, Wusch, Explosionen)
//    + Hall + Hintergrundmusik. Lautstärken in config.js unter "sound".
// ============================================================
let audio = null;          // AudioContext, startet erst nach dem ersten Tastendruck
let sfxBus = null;         // alle Effekte laufen hier durch
let musicBus = null;       // Musik läuft hier durch (eigene Lautstärke)
let reverb = null;         // Hall (macht alles "größer")
let noiseBuf = null;       // 1 Sekunde Rauschen zum Wiederverwenden

function initAudio() {
  audio = new AudioContext();
  const S = CONFIG.sound;
  const comp = audio.createDynamicsCompressor();     // verhindert Übersteuern bei vielen Tönen
  comp.connect(audio.destination);
  const master = audio.createGain();
  master.gain.value = S.volume;
  master.connect(comp);
  sfxBus = audio.createGain(); sfxBus.connect(master);
  musicBus = audio.createGain(); musicBus.gain.value = S.music ? S.musicVolume : 0; musicBus.connect(master);
  // Hall: ein kurzes, abklingendes Rauschen als "Raum"
  reverb = audio.createConvolver();
  const len = audio.sampleRate * 1.6;
  const ir = audio.createBuffer(2, len, audio.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  reverb.buffer = ir;
  const wet = audio.createGain(); wet.gain.value = S.reverb;
  reverb.connect(wet); wet.connect(master);
  // Rauschen
  noiseBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  music.next = audio.currentTime + 0.15;
}

// Ausgang für einen Klang: trocken + etwas Hall
function out(node, bus = sfxBus, hall = true) {
  node.connect(bus);
  if (hall) node.connect(reverb);
}

// Ein Ton. freq = Tonhöhe, slideTo = Tonhöhe am Ende (für "Piu"/"Wumm"), vol = Lautstärke
function tone(freq, dur = 0.1, type = 'square', slideTo = null, vol = 1, delay = 0, bus = sfxBus, hall = true) {
  if (!audio) return;
  const t = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);          // schneller Anschlag
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);         // abklingen
  osc.connect(g); out(g, bus, hall);
  osc.start(t); osc.stop(t + dur + 0.02);
}

// Rauschen durch einen Filter: für Schläge, Zischen, Explosionen
//   type: 'lowpass' (dumpf), 'highpass' (zischend), 'bandpass' (Wusch)
function noise(dur = 0.1, type = 'lowpass', freq = 1000, vol = 1, delay = 0, sweepTo = null, bus = sfxBus, hall = true) {
  if (!audio) return;
  const t = audio.currentTime + delay;
  const src = audio.createBufferSource();
  src.buffer = noiseBuf;
  const f = audio.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = type === 'bandpass' ? 1.5 : 0.7;
  const g = audio.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); out(g, bus, hall);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}

const SFX = {
  // Treffer am Gegner: knackiger Schlag
  hit: () => { noise(0.06, 'highpass', 2500, 0.5); tone(520, 0.08, 'square', 260, 0.18); tone(140, 0.08, 'sine', 70, 0.4); },
  // Treffer am König: schwerer, metallischer Schlag
  bossHit: () => { noise(0.08, 'bandpass', 1800, 0.6); tone(330, 0.12, 'triangle', 160, 0.3); tone(110, 0.14, 'sine', 55, 0.5); },
  // Spieler bekommt Schaden: lauter, tiefer Einschlag + Warnton – soll man nicht überhören!
  hurt: () => {
    noise(0.25, 'lowpass', 1200, 0.9, 0, 200); tone(240, 0.3, 'sawtooth', 60, 0.45); tone(90, 0.35, 'sine', 40, 0.7);
    tone(660, 0.1, 'square', null, 0.2, 0.05); tone(440, 0.16, 'square', null, 0.2, 0.15);
  },
  dash: () => { noise(0.22, 'bandpass', 500, 0.6, 0, 3500); tone(300, 0.15, 'triangle', 700, 0.15); },
  kill: () => {
    noise(0.18, 'lowpass', 3000, 0.6, 0, 300); tone(160, 0.25, 'sine', 50, 0.5);
    [880, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'square', null, 0.08, 0.05 + i * 0.05));
  },
  spawn: () => { tone(110, 0.25, 'sine', 220, 0.35); noise(0.2, 'bandpass', 300, 0.25, 0, 1200); },
  warn: () => { tone(988, 0.09, 'square', null, 0.16); tone(988, 0.09, 'square', null, 0.16, 0.13); tone(740, 0.15, 'square', null, 0.16, 0.26); },
  bossJump: () => { noise(0.4, 'bandpass', 300, 0.5, 0, 2500); tone(140, 0.4, 'triangle', 420, 0.3); },
  bossLand: () => { noise(0.6, 'lowpass', 900, 1, 0, 80); tone(85, 0.7, 'sine', 30, 0.9); tone(170, 0.3, 'square', 60, 0.15); },
  charge: () => { noise(0.6, 'lowpass', 200, 0.7, 0, 1400); tone(70, 0.6, 'sawtooth', 160, 0.35); },
  laser: () => { tone(2000, 0.4, 'sawtooth', 220, 0.22); tone(1000, 0.4, 'square', 110, 0.12); noise(0.35, 'highpass', 4000, 0.4, 0, 800); },
  skill: () => [660, 880, 1320, 1760].forEach((f, i) => tone(f, 0.14, 'triangle', null, 0.25, i * 0.04)),
  skillLand: () => {
    noise(0.4, 'lowpass', 1500, 0.8, 0, 120); tone(110, 0.45, 'sine', 45, 0.7);
    [1318, 1568, 2093].forEach((f, i) => tone(f, 0.3, 'triangle', null, 0.12, 0.03 + i * 0.03));
  },
  bossAppear: () => {
    tone(73, 1.2, 'sawtooth', null, 0.25); tone(110, 1.2, 'sawtooth', null, 0.18);
    noise(1.0, 'lowpass', 400, 0.5, 0, 2000); tone(220, 0.8, 'square', 207, 0.08, 0.2);
  },
  // Sieges-Fanfare: Dur-Akkorde, zwei Schichten übereinander
  victory: () => {
    const notes = [[523, 659, 784], [587, 740, 880], [659, 831, 988], [784, 988, 1175, 1568]];
    notes.forEach((ch, i) => ch.forEach((f) => {
      tone(f, i === 3 ? 1.0 : 0.22, 'triangle', null, 0.18, i * 0.16);
      tone(f / 2, i === 3 ? 1.0 : 0.22, 'square', null, 0.05, i * 0.16);
    }));
    noise(0.8, 'highpass', 6000, 0.25, 0.48);
  },
  menuMove: () => tone(1200, 0.04, 'square', 900, 0.15, 0, sfxBus, false),
  menuOk: () => { tone(880, 0.08, 'triangle', null, 0.3); tone(1320, 0.14, 'triangle', null, 0.3, 0.07); },
  start: () => [392, 523, 659, 784].forEach((f, i) => { tone(f, 0.18, 'triangle', null, 0.3, i * 0.08); tone(f * 2, 0.12, 'square', null, 0.05, i * 0.08); }),
  lose: () => [392, 349, 311, 262].forEach((f, i) => { tone(f, 0.4, 'sawtooth', null, 0.2, i * 0.22); tone(f / 2, 0.4, 'triangle', null, 0.3, i * 0.22); }),
};

// ---------- Hintergrundmusik: kleiner Sequenzer ----------
// 4 Takte in d-Moll (Dm – B – F – C), mit Bass, Arpeggio, Kick, Snare und Hi-Hat.
const music = { step: 0, next: 0 };
const CHORDS = [
  [73.42, [1, 1.2, 1.5, 2]],      // d-Moll
  [58.27, [1, 1.26, 1.5, 2]],     // B-Dur
  [87.31, [1, 1.26, 1.5, 2]],     // F-Dur
  [65.41, [1, 1.26, 1.5, 2]],     // C-Dur
];
function scheduleMusicStep(i, t) {
  const bar = Math.floor(i / 16) % 4, s = i % 16;
  const [root, tones] = CHORDS[bar];
  const delay = t - audio.currentTime;
  const fight = ['playing', 'intro', 'victory'].includes(state.mode);
  // Bass auf jeder Achtel
  if (s % 2 === 0) tone(root * (s % 8 === 6 ? 1.5 : 1), 0.18, 'triangle', null, 0.5, delay, musicBus, false);
  // Arpeggio (nur im Kampf, im Titel ruhiger)
  if (fight || s % 4 === 0) tone(root * 4 * tones[(s + bar) % 4], 0.1, 'square', null, fight ? 0.07 : 0.05, delay, musicBus, true);
  if (!fight) return;
  // Schlagzeug
  if (s % 4 === 0) tone(150, 0.14, 'sine', 40, 0.9, delay, musicBus, false);              // Kick
  if (s === 4 || s === 12) noise(0.14, 'bandpass', 1800, 0.45, delay, null, musicBus, true); // Snare
  if (s % 2 === 1) noise(0.03, 'highpass', 8000, 0.18, delay, null, musicBus, false);       // Hi-Hat
}
// Wird regelmäßig aufgerufen und plant die nächsten Musik-Schritte im Voraus
function updateMusic() {
  if (!audio || !CONFIG.sound.music || state.paused || audio.state !== 'running') return;
  const stepLen = 60 / CONFIG.sound.musicBpm / 4;
  if (music.next < audio.currentTime) music.next = audio.currentTime + 0.05;   // nach Pause aufholen
  while (music.next < audio.currentTime + 0.15) {
    scheduleMusicStep(music.step, music.next);
    music.next += stepLen;
    music.step++;
  }
}
setInterval(updateMusic, 30);

// ============================================================
// 3. Effekte
// ============================================================

// ---------- Partikel: kleine Würfel, die wegfliegen, fallen und schrumpfen ----------
const particles = [];
const particleGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
const particleMats = {};                         // ein Material pro Farbe (spart Leistung)
function addParticle(color, x, y, z, vx, vy, vz, life) {
  particleMats[color] ??= new THREE.MeshBasicMaterial({     // leuchtende Funken (werden mit Bloom zum Glühen)
    color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(particleGeo, particleMats[color]);
  m.position.set(x, y, z);
  m.userData.v = new THREE.Vector3(vx, vy, vz);
  m.userData.life = m.userData.maxLife = life;
  scene.add(m);
  particles.push(m);
}
function burst(x, y, z, color, count = 10, speed = 2.2) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.8);
    addParticle(color, x, y, z, Math.cos(a) * s, 1.5 + Math.random() * 2.5, Math.sin(a) * s, 0.4 + Math.random() * 0.35);
  }
}
// Goldregen über dem ganzen Brett (beim Sieg)
function goldRain(count = 40) {
  for (let i = 0; i < count; i++) {
    addParticle(CONFIG.colors.gold, (Math.random() - 0.5) * 8, 3 + Math.random() * 2, (Math.random() - 0.5) * 8,
      0, -1 - Math.random() * 2, 0, 1.2 + Math.random() * 0.6);
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const m = particles[i];
    const d = m.userData;
    d.life -= dt;
    if (d.life <= 0) { scene.remove(m); particles.splice(i, 1); continue; }
    d.v.y -= 9 * dt;                            // Schwerkraft
    m.position.addScaledVector(d.v, dt);
    if (m.position.y < 0.03) { m.position.y = 0.03; d.v.y *= -0.3; d.v.x *= 0.6; d.v.z *= 0.6; }
    m.scale.setScalar(Math.min(1, d.life / d.maxLife * 1.5));
    m.rotation.x += dt * 8; m.rotation.y += dt * 6;
  }
}

// ---------- Schadenszahlen, die über den Figuren aufsteigen ----------
const floats = [];
const tmpVec = new THREE.Vector3();
function floatText(x, y, z, text, cls) {
  const el = document.createElement('div');
  el.className = `dmg ${cls}`;
  el.textContent = text;
  ui.floats.appendChild(el);
  floats.push({ el, x: x + (Math.random() - 0.5) * 0.3, y, z, t: 0 });
}
function updateFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    if (f.t > 0.9) { f.el.remove(); floats.splice(i, 1); continue; }
    // 3D-Position → Bildschirm-Position
    tmpVec.set(f.x, f.y + f.t * 0.9, f.z).project(camera);
    const sx = (tmpVec.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-tmpVec.y * 0.5 + 0.5) * window.innerHeight;
    const pop = f.t < 0.12 ? 1.6 - f.t * 5 : 1;            // erst groß, dann normal
    f.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(${pop})`;
    f.el.style.opacity = String(Math.min(1, (0.9 - f.t) * 3));
  }
}

// ---------- Effekte, die verblassen (goldene Felder, Schockwellen, Strahlen) ----------
const fadeFx = [];
function addFx(obj, life, grow = 0) {
  const mats = [];
  obj.traverse((o) => { if (o.material) mats.push({ m: o.material, base: o.material.opacity }); });
  obj.userData.fx = { life, maxLife: life, grow, mats };
  scene.add(obj);
  fadeFx.push(obj);
}
function updateFadeFx(dt) {
  for (let i = fadeFx.length - 1; i >= 0; i--) {
    const obj = fadeFx[i];
    const d = obj.userData.fx;
    d.life -= dt;
    if (d.life <= 0) {
      scene.remove(obj);
      obj.traverse((o) => { if (!o.geometry?.userData.shared) o.geometry?.dispose(); o.material?.dispose(); });
      fadeFx.splice(i, 1);
      continue;
    }
    for (const e of d.mats) e.m.opacity = e.base * (d.life / d.maxLife);
    if (d.grow) obj.scale.multiplyScalar(1 + d.grow * dt);
  }
}
// Flache, leuchtende Fläche, die auf dem Brett liegt
function flatMesh(geo, color, opacity, additive = false) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
// Ein goldenes, leuchtendes Feld – die Effektsprache aus Blender
const TILE_GEO = new THREE.PlaneGeometry(0.96, 0.96);   // eine gemeinsame Form für alle goldenen Felder (spart Leistung)
TILE_GEO.userData.shared = true;
function goldTile(cx, cz) {
  const t = flatMesh(TILE_GEO, CONFIG.colors.gold, 0.75);
  t.position.set(cx, 0.012, cz);
  addFx(t, 0.7);
}
// Goldene Felder im Radius r um (x, z)
function goldTiles(x, z, r) {
  for (let cx = -3.5; cx <= 3.5; cx++) {
    for (let cz = -3.5; cz <= 3.5; cz++) {
      if (Math.hypot(cx - x, cz - z) <= r + 0.35) goldTile(cx, cz);
    }
  }
}
// Goldene Felder entlang einer Strecke
function goldTilesLine(x1, z1, x2, z2, width) {
  for (let cx = -3.5; cx <= 3.5; cx++) {
    for (let cz = -3.5; cz <= 3.5; cz++) {
      if (distToSegment(cx, cz, x1, z1, x2, z2) <= width / 2 + 0.2) goldTile(cx, cz);
    }
  }
}
// Ring, der sich ausbreitet
function shockRing(x, z, r, color) {
  const ring = flatMesh(new THREE.RingGeometry(r * 0.8, r, 40), color, 0.9);
  ring.position.set(x, 0.03, z);
  addFx(ring, 0.4, 2.5);
}
// Strahl von (x1, z1) nach (x2, z2): leuchtender Streifen am Boden + leuchtende "Wand"
function beam(x1, z1, x2, z2, width, color, life) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.01) return;
  const g = new THREE.Group();
  g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
  g.rotation.y = -Math.atan2(z2 - z1, x2 - x1);       // Streifen zeigt in Strahlrichtung
  const floor = flatMesh(new THREE.PlaneGeometry(len, width), color, 0.85, true);
  floor.position.y = 0.04;
  const core = flatMesh(new THREE.PlaneGeometry(len, width * 0.35), '#ffffff', 0.9, true);
  core.position.y = 0.05;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.7), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }));
  wall.position.y = 0.35;                              // steht senkrecht
  g.add(floor, core, wall);
  addFx(g, life);
}

// ---------- Rechenhilfen für Linien ----------
// Abstand eines Punkts zu einer Strecke
function distToSegment(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  const l2 = dx * dx + dz * dz || 1;
  const t = THREE.MathUtils.clamp(((px - x1) * dx + (pz - z1) * dz) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), pz - (z1 + dz * t));
}
// Wo verlässt eine Linie ab (x, z) in Richtung (dx, dz) das Brett?
function edgePoint(x, z, dx, dz) {
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (BOARD_HALF - x) / dx);
  if (dx < 0) t = Math.min(t, (-BOARD_HALF - x) / dx);
  if (dz > 0) t = Math.min(t, (BOARD_HALF - z) / dz);
  if (dz < 0) t = Math.min(t, (-BOARD_HALF - z) / dz);
  return { x: x + dx * t, z: z + dz * t };
}
// Waagerecht und senkrecht durch (x, z) als 4 Strecken bis zum Brettrand
function straightSegments(x, z) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => {
    const e = edgePoint(x, z, dx, dz);
    return [x, z, e.x, e.z];
  });
}
// Beide Diagonalen durch (x, z) als 4 Strecken bis zum Brettrand
function diagonalSegments(x, z) {
  return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([dx, dz]) => {
    const e = edgePoint(x, z, dx, dz);
    return [x, z, e.x, e.z];
  });
}

// ---------- Vorwarnungen: rote, pulsierende Flächen ----------
const warnings = [];
function addWarning(g) {
  g.userData.fills = [];
  g.traverse((o) => { if (o.material) g.userData.fills.push(o.material); });
  scene.add(g);
  warnings.push(g);
  return g;
}
function makeWarnCircle(x, z, r) {
  const g = new THREE.Group();
  g.add(flatMesh(new THREE.CircleGeometry(r, 40), '#ff1a1a', 0.35), flatMesh(new THREE.RingGeometry(r - 0.06, r, 40), '#ff5050', 0.9));
  g.position.set(x, 0.02, z);
  return addWarning(g);
}
// Rote Bahnen (Liste von Strecken [x1, z1, x2, z2])
function makeWarnSegments(segs, width) {
  const g = new THREE.Group();
  for (const [x1, z1, x2, z2] of segs) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.01) continue;
    const holder = new THREE.Group();
    holder.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    holder.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    holder.add(flatMesh(new THREE.PlaneGeometry(len, width), '#ff1a1a', 0.35));
    g.add(holder);
  }
  return addWarning(g);
}
function removeWarning(w) {
  if (!w) return;
  scene.remove(w);
  const i = warnings.indexOf(w);
  if (i >= 0) warnings.splice(i, 1);
}
function updateWarnings(time) {
  const o = 0.25 + 0.2 * Math.sin(time * 22);
  for (const w of warnings) w.userData.fills.forEach((m) => { m.opacity = o; });
}
function clearWarnings() { [...warnings].forEach(removeWarning); }

// ============================================================
// 4. Figuren ("Actor") – gemeinsamer Teil für alle Figuren
//    Aufbau: root (Position auf dem Brett, Ringe, LP-Punkte)
//            └ body (Hüpfen, Neigen, Umkippen, Angriffs-Stoß)
//              └ piece (das Modell aus Blender oder die Ersatzfigur)
// ============================================================
let models = null;   // wird nach dem Laden gesetzt

function makeActor(key) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const piece = makePiece(models, key);
  body.add(piece);
  root.add(body);
  scene.add(root);

  // Alle Materialien merken: für weißes Aufblitzen und Ausblenden
  const mats = [];
  piece.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      mats.push({
        m,
        emissive: m.emissive ? m.emissive.clone() : null,
        emissiveIntensity: m.emissiveIntensity ?? 1,
        opacity: m.opacity, transparent: m.transparent,
      });
    }
  });
  const height = new THREE.Box3().setFromObject(piece).max.y;

  // Kontaktschatten: liegt immer auf dem Brett, auch wenn die Figur springt
  let blob = null;
  if (L.contactShadows) {
    blob = new THREE.Mesh(contactGeo, new THREE.MeshBasicMaterial({
      map: contactTex, transparent: true, opacity: L.contactShadowStrength, depthWrite: false,
    }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.011;
    blob.renderOrder = -1;
    root.add(blob);
  }

  return {
    key, root, body, piece, mats, height, blob,
    anim: createAnimator(piece, models.clips[key]),
    x: 0, y: 0, z: 0,                     // y = Höhe beim Springen
    hopPhase: Math.random() * 10,
    flash: 0, flashOn: false,
    lunge: 0, lungeX: 0, lungeZ: 0,       // Angriffs-Stoß
    dying: -1, fallX: 0, fallZ: 1,        // -1 = lebt, sonst Sekunden seit dem Umfallen
    toppleTime: J.toppleTime,
    walking: false,
  };
}

function removeActor(a) { scene.remove(a.root); }

// Blender-Animation für ein Ereignis abspielen, falls in config.js eingetragen.
function playEvent(a, event, loop = false) {
  const name = CONFIG.blenderAnims[a.key]?.[event];
  if (name) a.anim.play(name, { loop });
}

// Weißes Aufblitzen an/aus
function setFlash(a, on) {
  if (a.flashOn === on) return;
  a.flashOn = on;
  for (const e of a.mats) {
    if (!e.emissive) continue;
    if (on) { e.m.emissive.set(a.flashColor || '#ffffff'); e.m.emissiveIntensity = a.flashColor ? 2.2 : 1.2; }
    else { e.m.emissive.copy(e.emissive); e.m.emissiveIntensity = e.emissiveIntensity; }
  }
}

// Figur durchsichtig machen (1 = normal, 0 = unsichtbar)
function setOpacity(a, value) {
  for (const e of a.mats) {
    e.m.transparent = value < 1 ? true : e.transparent;
    e.m.opacity = e.opacity * value;
  }
}

// Kleine Punkte über der Figur für die Lebenspunkte
function makeHpDots(a, count, color, size = 0.055) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(size, 10, 8);
  const mat = new THREE.MeshBasicMaterial({ color });
  const dots = [];
  for (let i = 0; i < count; i++) {
    const d = new THREE.Mesh(geo, mat);
    d.position.x = (i - (count - 1) / 2) * size * 2.6;
    group.add(d);
    dots.push(d);
  }
  group.position.y = a.height + 0.22;
  a.root.add(group);
  return dots;
}

// Flacher Ring auf dem Brett. setRingFraction() zeigt nur einen Teil (für Abklingzeiten).
const RING_SEGMENTS = 40;
function makeRing(inner, outer, color, opacity) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, RING_SEGMENTS),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.015;
  return ring;
}
function setRingFraction(ring, f) {
  ring.geometry.setDrawRange(0, Math.round(RING_SEGMENTS * THREE.MathUtils.clamp(f, 0, 1)) * 6);
}

// Bewegung, Hüpfen, Neigen, Aufblitzen, Umkippen – für jede Figur in jedem Frame
function updateActorVisual(a, dt, moveX, moveZ) {
  a.root.position.set(a.x, a.y, a.z);
  const moving = moveX !== 0 || moveZ !== 0;
  if (a.blob) {
    // Kontaktschatten bleibt am Boden und wird beim Springen kleiner und heller
    a.blob.position.y = 0.011 - a.y;
    a.blob.scale.setScalar(Math.max(0.4, 1 - a.y * 0.35));
    a.blob.material.opacity = L.contactShadowStrength * Math.max(0.2, 1 - a.y * 0.5) * (a.dying >= 0 ? 0.5 : 1);
  }

  if (a.dying >= 0) {
    // Umkippen: dreht den Körper um den Fuß in Fallrichtung
    a.dying += dt;
    const t = Math.min(1, a.dying / a.toppleTime);
    const angle = (1 - (1 - t) * (1 - t)) * Math.PI / 2;    // erst schnell, dann langsam
    a.body.rotation.set(a.fallZ * angle, 0, -a.fallX * angle);
    a.body.position.set(0, 0, 0);
  } else {
    // Hüpfen beim Laufen
    if (moving && a.y === 0) {
      a.hopPhase += dt * J.hopSpeed;
      a.body.position.y = Math.abs(Math.sin(a.hopPhase)) * J.hopHeight;
    } else {
      a.body.position.y *= Math.max(0, 1 - dt * 12);
    }
    // In Laufrichtung neigen
    const lean = THREE.MathUtils.degToRad(J.leanDeg);
    const k = Math.min(1, dt * 10);
    a.body.rotation.x += ((moving ? moveZ * lean : 0) - a.body.rotation.x) * k;
    a.body.rotation.z += ((moving ? -moveX * lean : 0) - a.body.rotation.z) * k;
    // Angriffs-Stoß: kurz nach vorn und zurück
    if (a.lunge > 0) {
      a.lunge = Math.max(0, a.lunge - dt);
      const s = Math.sin((1 - a.lunge / 0.14) * Math.PI) * J.lungeDistance;
      a.body.position.x = a.lungeX * s;
      a.body.position.z = a.lungeZ * s;
    } else {
      a.body.position.x = 0;
      a.body.position.z = 0;
    }
  }

  // Blender-Laufanimation an/aus
  if (moving !== a.walking && a.dying < 0) {
    a.walking = moving;
    playEvent(a, moving ? 'walk' : 'idle', true);
  }

  // Aufblitzen nach Treffer (Gegner weiß, Spieler rot)
  if (a.flash > 0) a.flash -= dt;
  setFlash(a, a.flash > 0);
  if (a.flash <= 0) a.flashColor = null;
  // leichtes "Atmen", wenn die Figur steht
  if (a.dying < 0) a.body.scale.y = 1 + Math.sin(state.clock * 2.2 + a.hopPhase) * J.breathe;

  a.anim.update(dt);
}

// Figur umwerfen (Richtung: weg vom Angreifer)
function startTopple(a, fromX, fromZ) {
  const dx = a.x - fromX, dz = a.z - fromZ;
  const len = Math.hypot(dx, dz) || 1;
  a.fallX = dx / len; a.fallZ = dz / len;
  a.dying = 0;
  playEvent(a, 'defeat');
}

// "Plopp" beim Erscheinen: von klein auf groß mit kurzem Überschwingen
function updateSpawnPop(a, dt) {
  if (a.spawnT >= 1) return;
  a.spawnT = Math.min(1, a.spawnT + dt * 3.5);
  const t = a.spawnT;
  a.root.scale.setScalar(Math.max(0.01, t + Math.sin(t * Math.PI) * 0.25));
}

// Hält eine Figur auf dem Brett
function clampToBoard(a, radius) {
  const max = BOARD_HALF - radius;
  a.x = THREE.MathUtils.clamp(a.x, -max, max);
  a.z = THREE.MathUtils.clamp(a.z, -max, max);
}

// ---------- Felder ----------
// Feldmitten liegen bei -3.5, -2.5, … +3.5. snap() rundet auf die nächste Feldmitte.
function snap(v) { return THREE.MathUtils.clamp(Math.round(v + 3.5), 0, 7) - 3.5; }
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Lässt eine Figur von Feld zu Feld gleiten (a.step = { fromX, fromZ, toX, toZ, t, dur, hop }).
// hop = kleiner Hüpfer wie beim Setzen einer Schachfigur.
function advanceStep(a, dt) {
  const s = a.step;
  s.t += dt;
  const k = Math.min(1, s.t / s.dur);
  const e = s.hop ? k * k * (3 - 2 * k) : k;           // Hüpfer: weich an- und abbremsen
  a.x = THREE.MathUtils.lerp(s.fromX, s.toX, e);
  a.z = THREE.MathUtils.lerp(s.fromZ, s.toZ, e);
  if (s.hop) a.y = Math.sin(k * Math.PI) * 0.18;
  if (k >= 1) { a.y = 0; a.step = null; }
}
// Figur kurz auf ein anderes Feld schieben (Rückstoß)
function slideTo(a, x, z, dur = 0.15) {
  a.step = { fromX: a.x, fromZ: a.z, toX: snap(x), toZ: snap(z), t: 0, dur, hop: true };
}

// Alle Ziele, die gerade getroffen werden können (Gegner-Bauern + König)
function liveTargets() {
  const list = enemies.filter((e) => !e.dead);
  if (boss && !boss.dead && boss.spawnT >= 1) list.push(boss);
  return list;
}
// Schaden an Gegner-Bauer oder König
function damageTarget(t, dmg, fromX, fromZ) {
  if (t.type === 'king') damageBoss(t, dmg, fromX, fromZ);
  else damageEnemy(t, dmg, fromX, fromZ);
}

// ============================================================
// 5. Spieler
// ============================================================
const players = [];

function createPlayer(id) {
  const a = makeActor('pawn_light');
  a.id = id;
  a.keys = id === 0 ? CONFIG.keys.p1 : CONFIG.keys.p2;
  a.color = id === 0 ? CONFIG.colors.player1 : CONFIG.colors.player2;
  a.root.add(makeRing(0.30, 0.40, a.color, 0.95));          // Farbring: wer bin ich?
  a.dashRing = makeRing(0.45, 0.51, '#ffffff', 0.85);       // Abklingzeit Vorstoß
  a.skillRing = makeRing(0.55, 0.61, CONFIG.colors.gold, 0.85); // Abklingzeit Fähigkeit
  a.root.add(a.dashRing, a.skillRing);
  a.hpDots = makeHpDots(a, P.hp, a.color);
  a.hud = document.getElementById(id === 0 ? 'hud1' : 'hud2');
  a.skill = null;
  return a;
}

// Spieler an den Start: volle LP, Gefallene stehen wieder auf. Die Fähigkeit bleibt.
function resetPlayer(p) {
  p.x = snap(P.startX[p.id]);
  p.z = snap(P.startZ);
  p.y = 0;
  p.hp = P.hp;
  p.alive = true;
  p.invuln = 0;
  p.attackTimer = 0;
  p.dashCd = 0;
  p.dashTime = 0;                     // > 0 = gerade im Vorstoß (unverwundbar)
  p.dashHits = new Set();
  p.skillCd = 0;
  p.step = null;                      // gerade unterwegs zum nächsten Feld?
  p.queued = null;                    // kurz angetippte Richtung für den nächsten Zug
  p.jump = null;                      // L-Sprung aktiv?
  p.charge = null;                    // Sturmlauf aktiv?
  p.faceX = 0; p.faceZ = -1;          // Blickrichtung: nach vorn zum König
  p.dying = -1;
  p.lunge = 0;
  p.flash = 0;
  p.body.rotation.set(0, 0, 0);
  p.root.visible = true;
  p.body.visible = true;
  setOpacity(p, 1);
  p.hudKey = '';
}

// Richtung aus den gedrückten Tasten: x/z sind -1, 0 oder 1. null = keine Taste.
function readDir(p) {
  let x = 0, z = 0;
  if (keysDown.has(p.keys.left)) x -= 1;
  if (keysDown.has(p.keys.right)) x += 1;
  if (keysDown.has(p.keys.up)) z -= 1;
  if (keysDown.has(p.keys.down)) z += 1;
  if (!P.diagonal && x && z) z = 0;
  return x || z ? { x, z } : null;
}
// Richtung einer einzelnen Taste (für kurz angetippte Züge)
function keyDir(p, code) {
  if (code === p.keys.left) return { x: -1, z: 0 };
  if (code === p.keys.right) return { x: 1, z: 0 };
  if (code === p.keys.up) return { x: 0, z: -1 };
  if (code === p.keys.down) return { x: 0, z: 1 };
  return null;
}
// Richtung für Vorstoß/Fähigkeit: gedrückte Richtung, sonst letzte Blickrichtung
function aimDir(p) { return readDir(p) ?? { x: p.faceX, z: p.faceZ }; }
// Nur waagerecht oder senkrecht (für L-Sprung und Sturmlauf)
function mainAxis(d) {
  return Math.abs(d.x) >= Math.abs(d.z) ? { x: Math.sign(d.x), z: 0 } : { x: 0, z: Math.sign(d.z) };
}
// Feld, auf dem der Spieler steht bzw. gleich ankommt
function baseCell(p) {
  return p.step ? { x: p.step.toX, z: p.step.toZ } : { x: snap(p.x), z: snap(p.z) };
}

// Einen Zug aufs Nachbarfeld beginnen
function startStep(p, d) {
  const tx = snap(p.x + d.x), tz = snap(p.z + d.z);
  p.faceX = d.x; p.faceZ = d.z;
  if (tx === p.x && tz === p.z) return;               // Brettrand
  const diag = tx !== p.x && tz !== p.z;
  p.step = { fromX: p.x, fromZ: p.z, toX: tx, toZ: tz, t: 0, dur: (diag ? Math.SQRT2 : 1) / P.speed };
}

function startDash(p) {
  if (!p.alive || p.dashCd > 0 || p.dashTime > 0 || p.jump || p.charge) return;
  const d = aimDir(p);
  const b = baseCell(p);
  const tx = snap(b.x + d.x * P.dashDistance), tz = snap(b.z + d.z * P.dashDistance);
  p.step = { fromX: p.x, fromZ: p.z, toX: tx, toZ: tz, t: 0, dur: P.dashTime, dash: true };
  p.faceX = d.x; p.faceZ = d.z;
  p.dashTime = P.dashTime;
  p.dashCd = P.dashCooldown;
  p.dashHits.clear();
  SFX.dash();
  burst(p.x, 0.1, p.z, '#ffffff', 6, 1.2);
}

// ---------- Fähigkeiten ----------
function useSkill(p) {
  if (!p.alive || !p.skill || p.skillCd > 0 || p.jump || p.charge || p.dashTime > 0) return;
  const S = CONFIG.skills[p.skill];
  if (!S) return;
  const b = baseCell(p);

  if (p.skill === 'lsprung') {
    // L-Sprung: mehrere Springer-Sprünge hintereinander (siehe CONFIG.skills.lsprung.hops).
    // Die Seite wird so gewählt, dass der erste Sprung näher am König landet.
    const f = mainAxis(aimDir(p));
    const sideX = -f.z, sideZ = f.x;                       // "zur Seite" = senkrecht zur Blickrichtung
    const plan = (sign) => S.hops.map(([sd, fw]) => ({ dx: f.x * fw + sideX * sd * sign, dz: f.z * fw + sideZ * sd * sign }));
    let hops = plan(1);
    if (boss && !boss.dead) {
      const other = plan(-1);
      const d = (h) => Math.hypot(b.x + h[0].dx - boss.x, b.z + h[0].dz - boss.z);
      if (d(other) < d(hops)) hops = other;
    }
    p.step = null;
    p.x = b.x; p.z = b.z;
    p.jump = { hops, index: -1, S };
    nextHop(p);
    SFX.skill();
  } else if (p.skill === 'sturmlauf') {
    // Sturmlauf: geradeaus bis zum Brettrand
    const f = mainAxis(aimDir(p));
    const end = { x: f.x ? 3.5 * f.x : b.x, z: f.z ? 3.5 * f.z : b.z };
    if (end.x === b.x && end.z === b.z) return;      // steht schon am Rand → nichts verbrauchen
    p.step = null;
    p.x = b.x; p.z = b.z;
    p.charge = { toX: end.x, toZ: end.z, dx: f.x, dz: f.z, hits: new Set(), S, lastTile: '' };
    p.faceX = f.x; p.faceZ = f.z;
    SFX.charge();
  } else if (p.skill === 'kreuzstrahl' || p.skill === 'sternstrahl') {
    // Kreuzstrahl: 4 Strahlen auf beiden Diagonalen, durchschlagend.
    // Sternstrahl (Dame): zusätzlich 4 gerade Strahlen = 8 Richtungen.
    const segs = diagonalSegments(b.x, b.z);
    if (p.skill === 'sternstrahl') segs.push(...straightSegments(b.x, b.z));
    const hit = new Set();
    for (const t of liveTargets()) {
      if (segs.some(([x1, z1, x2, z2]) => distToSegment(t.x, t.z, x1, z1, x2, z2) <= S.width / 2 + t.radius)) hit.add(t);
    }
    hit.forEach((t) => damageTarget(t, S.damage, b.x, b.z));
    flashLight(b.x, b.z, CONFIG.colors.gold, 22);
    for (const [x1, z1, x2, z2] of segs) {
      beam(x1, z1, x2, z2, S.width, CONFIG.colors.gold, S.beamTime + 0.15);
      goldTilesLine(x1, z1, x2, z2, S.width);
    }
    p.flash = 0.15;
    state.shake = J.shakeTime * 0.5;
    SFX.laser();
  }
  p.skillCd = S.cooldown;
}

// L-Sprung: nächsten Sprung vorbereiten (Ziel auf ein Feld runden, L-Weg golden zeigen)
function nextHop(p) {
  const j = p.jump;
  j.index++;
  const h = j.hops[j.index];
  j.fromX = p.x; j.fromZ = p.z;
  j.toX = snap(p.x + h.dx); j.toZ = snap(p.z + h.dz);
  j.t = 0;
  // der L-Weg: zwei Felder in der langen Richtung, dann eins zur Seite
  const longX = Math.abs(h.dx) === 2, sx = Math.sign(h.dx), sz = Math.sign(h.dz);
  const path = longX ? [[sx, 0], [2 * sx, 0], [2 * sx, sz]] : [[0, sz], [0, 2 * sz], [sx, 2 * sz]];
  for (const [ox, oz] of path) {
    const cx = p.x + ox, cz = p.z + oz;
    if (Math.abs(cx) <= 3.5 && Math.abs(cz) <= 3.5) goldTile(cx, cz);
  }
  burst(p.x, 0.1, p.z, CONFIG.colors.gold, 6, 1.4);
}

// L-Sprung: Bogen durch die Luft, jede Landung trifft alle Felder daneben
function updateJump(p, dt) {
  const j = p.jump;
  j.t += dt;
  const k = Math.min(1, j.t / j.S.time);
  p.x = THREE.MathUtils.lerp(j.fromX, j.toX, k);
  p.z = THREE.MathUtils.lerp(j.fromZ, j.toZ, k);
  p.y = Math.sin(k * Math.PI) * j.S.height;
  if (k < 1) return;
  p.y = 0;
  p.x = j.toX; p.z = j.toZ;
  // Landung: Schaden auf allen Feldern direkt daneben (3×3 um die Figur)
  for (const t of liveTargets()) {
    if (Math.hypot(t.x - p.x, t.z - p.z) <= j.S.radius + t.radius * 0.3) damageTarget(t, j.S.damage, p.x, p.z);
  }
  for (const [ox, oz] of [[0, 0], ...DIRS8]) {
    const cx = p.x + ox, cz = p.z + oz;
    if (Math.abs(cx) <= 3.5 && Math.abs(cz) <= 3.5) goldTile(cx, cz);
  }
  shockRing(p.x, p.z, j.S.radius, CONFIG.colors.gold);
  burst(p.x, 0.2, p.z, CONFIG.colors.gold, 12, 2.4);
  flashLight(p.x, p.z, CONFIG.colors.gold, 16);
  state.shake = J.shakeTime * 0.45;
  SFX.skillLand();
  if (j.index < j.hops.length - 1) nextHop(p);   // nächster Sprung
  else p.jump = null;                           // fertig
}

// Sturmlauf: schnell geradeaus, rammt alles zur Seite, goldene Spur
function updateCharge(p, dt) {
  const c = p.charge;
  const dist = Math.hypot(c.toX - p.x, c.toZ - p.z);
  const move = c.S.speed * dt;
  let done = false;
  if (move >= dist) { p.x = c.toX; p.z = c.toZ; done = true; }
  else { p.x += c.dx * move; p.z += c.dz * move; }

  const key = `${snap(p.x)},${snap(p.z)}`;
  if (key !== c.lastTile) { c.lastTile = key; goldTile(snap(p.x), snap(p.z)); }

  for (const t of liveTargets()) {
    if (c.hits.has(t) || Math.hypot(t.x - p.x, t.z - p.z) >= P.radius + t.radius + 0.15) continue;
    c.hits.add(t);
    damageTarget(t, c.S.damage, p.x - c.dx, p.z - c.dz);
    // zur Seite stoßen (auf welcher Seite steht das Ziel?)
    const side = Math.sign((t.x - p.x) * -c.dz + (t.z - p.z) * c.dx) || (Math.random() < 0.5 ? -1 : 1);
    if (!t.dead && !t.attack) slideTo(t, t.x + -c.dz * side * c.S.push, t.z + c.dx * side * c.S.push, 0.2);
  }
  if (done) {
    p.charge = null;
    shockRing(p.x, p.z, 0.9, CONFIG.colors.gold);
    state.shake = J.shakeTime * 0.6;
    SFX.skillLand();
  }
}

// Nächstes Ziel in Reichweite (oder null). Größere Ziele (König) zählen früher als "in Reichweite".
function nearestTarget(x, z, range) {
  let best = null, bestD = Infinity;
  for (const t of liveTargets()) {
    const d = Math.hypot(t.x - x, t.z - z) - (t.radius - E.radius);
    if (d <= range && d < bestD) { best = t; bestD = d; }
  }
  return best;
}

function updatePlayer(p, dt, canAct = true) {
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.skillCd = Math.max(0, p.skillCd - dt);
  let mv = { x: 0, z: 0 };

  if (p.alive && canAct) {
    if (p.jump) {
      updateJump(p, dt);
    } else if (p.charge) {
      mv = { x: p.charge.dx, z: p.charge.dz };
      updateCharge(p, dt);
    } else {
      if (p.step) {
        const s = p.step;
        mv = { x: Math.sign(s.toX - s.fromX), z: Math.sign(s.toZ - s.fromZ) };
        if (s.dash) {
          // Vorstoß: unverwundbar, trifft alles auf dem Weg
          for (const t of liveTargets()) {
            if (p.dashHits.has(t)) continue;
            if (Math.hypot(t.x - p.x, t.z - p.z) < P.radius + t.radius + 0.1) {
              p.dashHits.add(t);
              damageTarget(t, P.dashDamage, p.x, p.z);
            }
          }
          if (Math.random() < 0.6) burst(p.x, 0.15, p.z, p.color, 1, 0.5);
        }
        advanceStep(p, dt);
        if (!p.step && s.dash) p.dashTime = 0;
      }
      // Angekommen: nächster Zug, wenn eine Richtung gedrückt (oder kurz angetippt) ist
      if (!p.step) {
        const d = readDir(p) ?? p.queued;
        p.queued = null;
        if (d) startStep(p, d);
      }
    }

    // Auto-Angriff auf das nächste Ziel in Reichweite
    p.attackTimer -= dt;
    if (p.attackTimer <= 0 && !p.jump && !p.charge) {
      const target = nearestTarget(p.x, p.z, P.attackRange);
      if (target) {
        p.attackTimer = P.attackInterval;
        const len = Math.hypot(target.x - p.x, target.z - p.z) || 1;
        p.lungeX = (target.x - p.x) / len;
        p.lungeZ = (target.z - p.z) / len;
        p.lunge = 0.14;
        playEvent(p, 'attack');
        damageTarget(target, P.attackDamage, p.x, p.z);
      } else {
        p.attackTimer = 0;                    // sofort bereit, sobald ein Ziel nah genug ist
      }
    }
  }

  updateActorVisual(p, dt, mv.x, mv.z);

  // Blinken, solange unverwundbar
  p.body.visible = !(p.alive && p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0);

  // Ringe und LP-Punkte
  setRingFraction(p.dashRing, 1 - p.dashCd / P.dashCooldown);
  p.dashRing.material.color.set(p.dashCd > 0 ? '#ffffff' : CONFIG.colors.gold);
  const S = p.skill && CONFIG.skills[p.skill];
  p.skillRing.visible = !!S && p.alive;
  if (S) setRingFraction(p.skillRing, 1 - p.skillCd / S.cooldown);
  p.hpDots.forEach((d, i) => { d.visible = p.alive && i < p.hp; });
  updateHud(p);
}

function damagePlayer(p, dmg, fromX, fromZ) {
  if (!p.alive || p.invuln > 0 || p.dashTime > 0 || p.jump || p.charge) return;
  p.hp -= dmg;
  p.invuln = P.invulnAfterHit;
  p.flash = J.flashTime * 2;
  p.flashColor = '#ff1010';                    // Spieler blitzen ROT auf (Gegner weiß)
  state.shake = J.shakeTime;
  state.shakeMul = J.hurtShake;                 // stärkeres Wackeln als bei normalen Treffern
  state.hitStop = J.hitStop;                    // kurz einfrieren: "Autsch!"
  SFX.hurt();
  // roter Blitz am Bildschirmrand + Tafel zittert + "-1" über dem Kopf
  ui.hurt.classList.remove('on'); void ui.hurt.offsetWidth; ui.hurt.classList.add('on');
  p.hud.classList.remove('hit'); void p.hud.offsetWidth; p.hud.classList.add('hit');
  floatText(p.x, p.height + 0.5, p.z, `-${dmg}`, 'player');
  playEvent(p, 'hit');
  burst(p.x, 0.5, p.z, '#ff3030', 14, 2.2);
  flashLight(p.x, p.z, '#ff2020', 14);
  // Rückstoß: ein Feld weg vom Angreifer (wenn der Spieler gerade steht)
  const dx = Math.sign(Math.round((p.x - fromX) * 2)), dz = Math.sign(Math.round((p.z - fromZ) * 2));
  if (!p.step && (dx || dz)) slideTo(p, p.x + dx, p.z + dz, 0.12);
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    p.step = null;
    p.y = 0;
    startTopple(p, fromX, fromZ);
  }
}

// HUD unten links/rechts
function updateHud(p) {
  const S = p.skill && CONFIG.skills[p.skill];
  const key = `${p.hp}|${p.alive}|${p.skill}|${getLang()}`;
  if (p.hudKey !== key) {                       // Text nur ändern, wenn sich etwas geändert hat
    p.hudKey = key;
    const hp = THREE.MathUtils.clamp(p.hp, 0, P.hp);         // nie mehr Herzen als erlaubt
    p.hud.querySelector('.hearts').textContent = '♥'.repeat(hp) + '♡'.repeat(P.hp - hp);
    p.hud.classList.toggle('dead', !p.alive);
    p.hud.classList.toggle('low', p.alive && p.hp <= J.lowHp);
    p.hud.querySelector('.skill').textContent = S ? `${S.icon} ${skillName(p.skill)}` : '🔒';
    p.hud.querySelector('.skillbar').parentElement.style.display = S ? '' : 'none';
  }
  p.hud.querySelector('.dash').style.width = `${(1 - p.dashCd / P.dashCooldown) * 100}%`;
  if (S) p.hud.querySelector('.skillbar').style.width = `${(1 - p.skillCd / S.cooldown) * 100}%`;
}

// ============================================================
// 6. Gegnerische Bauern
// ============================================================
const enemies = [];

function spawnEnemyPawn(x) {
  const e = makeActor('pawn_dark');
  e.type = 'pawn';
  e.radius = E.radius;
  e.x = snap(x);
  e.z = snap(E.spawnZ);
  e.hp = E.hp;
  e.dead = false;
  e.step = null;
  e.stepTimer = 0.3 + Math.random() * 0.5;   // nicht alle ziehen gleichzeitig
  e.spawnT = 0;                       // für den "Plopp" beim Erscheinen
  e.hpDots = makeHpDots(e, E.hp, '#ff6a6a', 0.045);
  e.root.scale.setScalar(0.01);
  enemies.push(e);
  burst(e.x, 0.1, e.z, '#ff4040', 8, 1.2);
  return e;
}

function spawnWave() {
  const alive = enemies.filter((e) => !e.dead).length;
  const count = Math.min(E.spawnCount, E.maxAlive - alive);
  // zufällige, freie Spalten am oberen Rand
  const cols = [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5]
    .filter((x) => !cellTaken(x, snap(E.spawnZ), null))
    .sort(() => Math.random() - 0.5);
  const n = Math.min(count, cols.length);
  for (let i = 0; i < n; i++) spawnEnemyPawn(cols[i]);
  if (n > 0) SFX.spawn();
}

// Steht dort schon ein Gegner oder der König (oder zieht gerade dorthin)?
function cellTaken(x, z, except) {
  const at = (a) => {
    const cx = a.step ? a.step.toX : snap(a.x), cz = a.step ? a.step.toZ : snap(a.z);
    return cx === x && cz === z;
  };
  if (enemies.some((o) => o !== except && !o.dead && at(o))) return true;
  return !!(boss && boss !== except && !boss.dead && at(boss));
}

function damageEnemy(e, dmg, fromX, fromZ) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = J.flashTime;
  floatText(e.x, e.height + 0.3, e.z, `-${dmg}`, dmg >= 3 ? 'enemy big' : 'enemy');
  SFX.hit();
  playEvent(e, 'hit');
  burst(e.x, 0.45, e.z, CONFIG.colors.gold, 6, 1.6);
  // kurzer Rückstoß (nur optisch, die Figur bleibt auf ihrem Feld)
  const len = Math.hypot(e.x - fromX, e.z - fromZ) || 1;
  e.lungeX = (e.x - fromX) / len; e.lungeZ = (e.z - fromZ) / len; e.lunge = 0.14;
  if (e.hp <= 0) killEnemy(e, fromX, fromZ);
}
function killEnemy(e, fromX, fromZ) {
  e.dead = true;
  e.step = null;
  e.y = 0;
  state.kills++;
  SFX.kill();
  burst(e.x, 0.4, e.z, '#ff4040', 14, 2.4);
  flashLight(e.x, e.z, '#ff5a1a', 8);
  startTopple(e, fromX, fromZ);
}

// Nächster lebender Spieler (oder null)
function nearestPlayer(x, z) {
  let best = null, bestD = Infinity;
  for (const p of players) {
    if (!p.alive) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}

function updateEnemy(e, dt, canAct = true) {
  let mvX = 0, mvZ = 0;
  updateSpawnPop(e, dt);

  if (!e.dead && canAct && e.spawnT >= 1) {
    if (e.step) {
      mvX = Math.sign(e.step.toX - e.step.fromX); mvZ = Math.sign(e.step.toZ - e.step.fromZ);
      advanceStep(e, dt);
    } else {
      e.stepTimer -= dt;
      const target = nearestPlayer(e.x, e.z);
      if (e.stepTimer <= 0 && target) {
        e.stepTimer = 1 / E.speed;
        // Nachbarfeld wählen, das dem Spieler am nächsten ist und frei ist
        const tx = snap(target.x), tz = snap(target.z);
        let best = null, bestD = Math.hypot(tx - e.x, tz - e.z);
        for (const [dx, dz] of DIRS8) {
          const nx = e.x + dx, nz = e.z + dz;
          if (Math.abs(nx) > 3.5 || Math.abs(nz) > 3.5 || cellTaken(nx, nz, e)) continue;
          const d = Math.hypot(tx - nx, tz - nz);
          if (d < bestD - 0.01) { best = [nx, nz]; bestD = d; }
        }
        if (best) {
          e.step = { fromX: e.x, fromZ: e.z, toX: best[0], toZ: best[1], t: 0, dur: Math.min(E.moveTime, 1 / E.speed), hop: true };
          e.piece.rotation.y = Math.atan2(best[0] - e.x, best[1] - e.z);   // in Zugrichtung schauen
        }
      }
    }

    // Berührung = Schaden am Spieler, danach springt der Gegner zurück
    for (const p of players) {
      if (p.alive && Math.hypot(p.x - e.x, p.z - e.z) < P.radius + E.radius) {
        const wasHit = p.invuln <= 0 && !p.dashTime && !p.jump && !p.charge;
        damagePlayer(p, E.touchDamage, e.x, e.z);
        if (wasHit && e.step) slideTo(e, e.step.fromX, e.step.fromZ, 0.18);
      }
    }
  }

  updateActorVisual(e, dt, mvX, mvZ);
  e.hpDots.forEach((d, i) => { d.visible = !e.dead && i < e.hp; });

  // Besiegt: nach dem Umkippen ausblenden und entfernen
  if (e.dead && e.dying > e.toppleTime) {
    const fade = 1 - (e.dying - e.toppleTime) / J.deathFadeTime;
    setOpacity(e, Math.max(0, fade));
    if (fade <= 0) e.remove = true;
  }
}

function clearEnemies() {
  enemies.forEach(removeActor);
  enemies.length = 0;
}

// ============================================================
// 7. Der König (Boss)
// ============================================================
let boss = null;

function spawnBoss(round) {
  const r = CONFIG.rounds[round - 1];
  const b = makeActor(r.boss || 'king_dark');      // welche Figur der Boss ist (config.js → rounds)
  b.type = 'king';                                  // 'king' = "ist der Boss" (für Treffer-Logik)
  b.piece.scale.multiplyScalar(B.sizeBoost);        // Bosse etwas größer
  b.height *= B.sizeBoost;
  b.attackCount = 0;
  b.radius = B.radius;
  b.x = 0.5; b.z = snap(B.startZ);               // e8 – wo der König im Schach steht
  b.maxHp = b.hp = r.bossHp;
  b.dead = false;
  b.power = r.power;
  b.powerColor = CONFIG.powerColors[r.power] ?? '#ffffff';
  b.attackTimer = B.attackInterval;
  b.attack = null;
  b.step = null;
  b.stepTimer = 0.6;
  b.spawnT = 0;
  b.toppleTime = B.toppleTime;
  b.aura = makeRing(0.5, 0.78, b.powerColor, 0.85);    // Ring in der Farbe der geliehenen Kraft
  b.root.add(b.aura);
  b.root.scale.setScalar(0.01);
  boss = b;
  burst(b.x, 0.3, b.z, b.powerColor, 30, 3);
  shockRing(b.x, b.z, 1.4, b.powerColor);
  SFX.bossAppear();
  updateBossBar();
}

function removeBoss() {
  if (!boss) return;
  removeWarning(boss.attack?.warn);
  removeActor(boss);
  boss = null;
}

function isEnraged(b) { return b.hp / b.maxHp < B.enrageBelow; }

function updateBoss(dt, active) {
  const b = boss;
  if (!b) return;
  let mvX = 0, mvZ = 0;
  updateSpawnPop(b, dt);

  if (!b.dead && active && b.spawnT >= 1) {
    const t = nearestPlayer(b.x, b.z);
    if (b.attack) {
      updateBossAttack(b, dt);
    } else {
      b.attackTimer -= dt;
      if (t) b.piece.rotation.y = Math.atan2(t.x - b.x, t.z - b.z);    // schaut zum Spieler
      if (b.step) {
        mvX = Math.sign(b.step.toX - b.step.fromX); mvZ = Math.sign(b.step.toZ - b.step.fromZ);
        advanceStep(b, dt);
      } else if (b.attackTimer <= 0 && t) {
        b.attackTimer = B.attackInterval * (isEnraged(b) ? B.enrageFactor : 1);
        startBossAttack(b);
      } else {
        b.stepTimer -= dt;
        if (b.stepTimer <= 0 && t) {
          // Ein Feld ziehen: so, dass der Abstand zum Spieler möglichst keepDistance ist
          b.stepTimer = 1 / B.speed;
          const score = (x, z) => Math.abs(Math.hypot(t.x - x, t.z - z) - B.keepDistance);
          let best = null, bestS = score(b.x, b.z) - 0.3;   // lieber stehen bleiben, wenn es fast passt
          for (const [dx, dz] of DIRS8) {
            const nx = b.x + dx, nz = b.z + dz;
            if (Math.abs(nx) > 3.5 || Math.abs(nz) > 3.5 || cellTaken(nx, nz, b)) continue;
            const sc = score(nx, nz);
            if (sc < bestS) { best = [nx, nz]; bestS = sc; }
          }
          if (best) b.step = { fromX: b.x, fromZ: b.z, toX: best[0], toZ: best[1], t: 0, dur: B.moveTime, hop: true };
        }
      }
    }
  }

  // Ring: Farbe der Kraft, wütend = rot pulsierend
  if (!b.dead && isEnraged(b)) {
    b.aura.material.color.set('#ff2020');
    b.aura.material.opacity = 0.6 + 0.35 * Math.sin(state.clock * 10);
  }
  b.aura.visible = !b.dead;

  updateActorVisual(b, dt, mvX * 0.5, mvZ * 0.5);
}

// Welches Muster? Hat die Kraft kein eigenes Muster, nimmt der König das Springer-Muster.
function patternKind(b) {
  const mix = CONFIG.patternMix?.[b.power];
  if (mix?.length) return mix[b.attackCount++ % mix.length];    // Dame/König wechseln ab
  return CONFIG.patterns[b.power] ? b.power : 'knight';
}

function startBossAttack(b) {
  const kind = patternKind(b);
  const pat = CONFIG.patterns[kind];
  const alive = players.filter((p) => p.alive);
  if (!alive.length) return;
  const target = alive[Math.floor(Math.random() * alive.length)];
  const tx = snap(target.x), tz = snap(target.z);
  const base = { kind, pat, phase: 'warn', t: 0, fromX: b.x, fromZ: b.z };

  if (kind === 'knight') {
    // Springer-Kraft: springt auf ein Feld direkt neben einen Spieler
    const [ox, oz] = DIRS8[Math.floor(Math.random() * DIRS8.length)];
    const lx = snap(tx + ox), lz = snap(tz + oz);
    b.attack = { ...base, tx: lx, tz: lz, warn: makeWarnCircle(lx, lz, pat.radius) };
    SFX.warn();
  } else if (kind === 'rook') {
    // Turm-Kraft: auf Reihe oder Spalte des Spielers stellen, dann bis zum Rand stürmen
    const useColumn = Math.abs(tx - b.x) < Math.abs(tz - b.z);
    const ax = useColumn ? tx : b.x, az = useColumn ? b.z : tz;
    const dir = (useColumn ? Math.sign(tz - az) : Math.sign(tx - ax)) || 1;
    const ex = useColumn ? ax : dir * 3.5, ez = useColumn ? dir * 3.5 : az;
    b.attack = { ...base, phase: 'align', ax, az, ex, ez, hits: new Set() };
  } else if (kind === 'bishop') {
    // Läufer-Kraft: so hinstellen, dass ein Spieler auf seiner Diagonale steht
    let best = null;
    for (let d = pat.distance; d >= 1 && !best; d--) {
      for (const [ox, oz] of [[d, d], [d, -d], [-d, d], [-d, -d]]) {
        const cx = tx + ox, cz = tz + oz;
        if (Math.abs(cx) > 3.5 || Math.abs(cz) > 3.5) continue;
        const dist = Math.hypot(cx - b.x, cz - b.z);
        if (!best || dist < best.dist) best = { x: cx, z: cz, dist };
      }
    }
    b.attack = { ...base, phase: 'align', ax: best.x, az: best.z };
  }
}

function updateBossAttack(b, dt) {
  const A = b.attack;
  const pat = A.pat;
  A.t += dt;

  if (A.kind === 'knight') {
    if (A.phase === 'warn') {
      if (A.t >= pat.warnTime) { A.phase = 'jump'; A.t = 0; A.fromX = b.x; A.fromZ = b.z; SFX.bossJump(); }
    } else if (A.phase === 'jump') {
      const k = Math.min(1, A.t / pat.jumpTime);
      b.x = THREE.MathUtils.lerp(A.fromX, A.tx, k);
      b.z = THREE.MathUtils.lerp(A.fromZ, A.tz, k);
      b.y = Math.sin(k * Math.PI) * pat.jumpHeight;
      if (k >= 1) {
        b.y = 0;
        removeWarning(A.warn);
        hitPlayersNear(A.tx, A.tz, pat.radius, pat.damage);
        shockRing(A.tx, A.tz, pat.radius, b.powerColor);
        flashLight(A.tx, A.tz, b.powerColor, 20);
        burst(A.tx, 0.1, A.tz, b.powerColor, 18, 2.8);
        state.shake = J.shakeTime;
        SFX.bossLand();
        b.attack = null;
      }
    }
  } else if (A.kind === 'rook') {
    if (A.phase === 'align') {
      const k = Math.min(1, A.t / pat.alignTime);
      b.x = THREE.MathUtils.lerp(A.fromX, A.ax, k);
      b.z = THREE.MathUtils.lerp(A.fromZ, A.az, k);
      if (k >= 1) {
        A.phase = 'warn'; A.t = 0;
        A.warn = makeWarnSegments([[A.ax, A.az, A.ex, A.ez]], pat.laneWidth);
        b.piece.rotation.y = Math.atan2(A.ex - A.ax, A.ez - A.az);
        SFX.warn();
      }
    } else if (A.phase === 'warn') {
      if (A.t >= pat.warnTime) { A.phase = 'charge'; A.t = 0; SFX.charge(); }
    } else if (A.phase === 'charge') {
      const dist = Math.hypot(A.ex - b.x, A.ez - b.z);
      const move = pat.chargeSpeed * dt;
      if (move >= dist) { b.x = A.ex; b.z = A.ez; } else { b.x += (A.ex - b.x) / dist * move; b.z += (A.ez - b.z) / dist * move; }
      if (Math.random() < 0.7) burst(b.x, 0.1, b.z, b.powerColor, 2, 1);
      for (const p of players) {
        if (!A.hits.has(p) && p.alive && Math.hypot(p.x - b.x, p.z - b.z) < B.radius + P.radius + 0.1) {
          A.hits.add(p);
          damagePlayer(p, pat.damage, b.x, b.z);
        }
      }
      if (move >= dist) {
        removeWarning(A.warn);
        shockRing(b.x, b.z, 1.2, b.powerColor);
        state.shake = J.shakeTime;
        SFX.bossLand();
        b.attack = null;
      }
    }
  } else if (A.kind === 'bishop') {
    if (A.phase === 'align') {
      const k = Math.min(1, A.t / pat.alignTime);
      b.x = THREE.MathUtils.lerp(A.fromX, A.ax, k);
      b.z = THREE.MathUtils.lerp(A.fromZ, A.az, k);
      b.y = Math.sin(k * Math.PI) * 0.6;
      if (k >= 1) {
        b.y = 0;
        A.phase = 'warn'; A.t = 0;
        A.segs = diagonalSegments(A.ax, A.az);
        A.warn = makeWarnSegments(A.segs, pat.beamWidth);
        SFX.warn();
      }
    } else if (A.phase === 'warn' && A.t >= pat.warnTime) {
      removeWarning(A.warn);
      for (const [x1, z1, x2, z2] of A.segs) beam(x1, z1, x2, z2, pat.beamWidth, b.powerColor, pat.beamTime);
      flashLight(A.ax, A.az, b.powerColor, 22);
      for (const p of players) {
        if (p.alive && A.segs.some(([x1, z1, x2, z2]) => distToSegment(p.x, p.z, x1, z1, x2, z2) <= pat.beamWidth / 2 + P.radius * 0.6)) {
          damagePlayer(p, pat.damage, A.ax, A.az);
        }
      }
      state.shake = J.shakeTime * 0.7;
      SFX.laser();
      b.attack = null;
    }
  }
}

// Schaden an allen Spielern im Radius
function hitPlayersNear(x, z, r, dmg) {
  for (const p of players) {
    if (p.alive && Math.hypot(p.x - x, p.z - z) <= r + P.radius * 0.5) damagePlayer(p, dmg, x, z);
  }
}

function damageBoss(b, dmg, fromX, fromZ) {
  if (b.dead || b.spawnT < 1) return;
  b.hp = Math.max(0, b.hp - dmg);
  b.flash = J.flashTime;
  floatText(b.x, b.height + 0.3, b.z, `-${dmg}`, dmg >= 3 ? 'enemy big' : 'enemy');
  SFX.bossHit();
  playEvent(b, 'hit');
  burst(b.x, 0.7, b.z, CONFIG.colors.gold, 7, 1.8);
  const len = Math.hypot(b.x - fromX, b.z - fromZ) || 1;
  b.lungeX = (b.x - fromX) / len * B.knockback * 4; b.lungeZ = (b.z - fromZ) / len * B.knockback * 4; b.lunge = 0.14;
  updateBossBar();
  if (b.hp <= 0) roundWon(fromX, fromZ);
}

function updateBossBar() {
  if (!boss) return;
  const r = CONFIG.rounds[state.round - 1];
  const icons = { knight_dark: '♞', bishop_dark: '♝', rook_dark: '♜', queen_dark: '♛', king_dark: '♚' };
  ui.bossName.textContent = `${icons[r.boss] ?? '♚'} ${t('round', { n: state.round })} – ${roundTitle(state.round)}`;
  ui.bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  ui.bossbar.classList.toggle('enraged', !boss.dead && isEnraged(boss));
}

// ============================================================
// 8. Spielablauf
//    'title' → 'intro' → 'playing' → 'victory' → 'menu' → 'intro' (nächste Runde) …
//    → 'win' (Schachmatt) oder 'gameover' (Geschlagen)
// ============================================================
const state = {
  mode: 'loading',
  modeTime: 0,        // Sekunden im aktuellen Abschnitt
  round: 1,
  totalTime: 0,       // Spielzeit für die Siegeranzeige
  kills: 0,
  spawnTimer: 0,
  shake: 0,
  gameOverTimer: -1,
  titleAngle: 0,
  bannerTimer: 0,
  timeScale: 1,       // < 1 = Zeitlupe
  clock: 0,
  unlocked: [],       // freigeschaltete Fähigkeiten
  menuSel: [0, 0],    // Auswahl im Menü pro Spieler
  menuReady: [false, false],
  paused: false,      // Pause (Escape)
  tutStep: 0,         // aktuelle Tutorial-Karte
  hitStop: 0,         // > 0 = Spiel kurz eingefroren (Treffer-Gefühl)
  shakeMul: 1,        // Stärke des aktuellen Kamera-Wackelns
};

const ui = {
  loading: document.getElementById('loading'),
  title: document.getElementById('title'),
  banner: document.getElementById('banner'),
  gameover: document.getElementById('gameover'),
  gameoverInfo: document.getElementById('gameover-info'),
  win: document.getElementById('win'),
  winInfo: document.getElementById('win-info'),
  menu: document.getElementById('menu'),
  cards: document.querySelector('#menu .cards'),
  bossbar: document.getElementById('bossbar'),
  bossName: document.querySelector('#bossbar .bossname'),
  bossFill: document.querySelector('#bossbar .bbar i'),
  fade: document.getElementById('fade'),
  pause: document.getElementById('pause'),
  hurt: document.getElementById('hurt'),
  tutorial: document.getElementById('tutorial'),
  floats: document.getElementById('floats'),
  hud: [document.getElementById('hud1'), document.getElementById('hud2')],
  fps: document.getElementById('fps'),
};
const show = (el, on) => el.classList.toggle('hidden', !on);

// Großer Schriftzug in der Mitte: big = goldene Überschrift, small = Zeile darunter
function showBanner(big, small = '', time = J.bannerTime) {
  ui.banner.innerHTML = `<div class="big gold">${big}</div>${small ? `<small>${small}</small>` : ''}`;
  ui.banner.classList.remove('pop');
  void ui.banner.offsetWidth;                     // Trick: Animation neu starten
  ui.banner.classList.add('pop');
  show(ui.banner, true);
  state.bannerTimer = time;
}

// Bild kurz ausblenden, dazwischen etwas umbauen (z. B. Map wechseln)
let fading = false;
function fadeThen(fn) {
  if (fading) return;
  fading = true;
  ui.fade.classList.add('on');
  setTimeout(() => { fn(); ui.fade.classList.remove('on'); fading = false; }, 380);
}

function setMode(mode) { state.mode = mode; state.modeTime = 0; }

// ---------- Texte in der gewählten Sprache (Deutsch kommt aus config.js) ----------
function roundTitle(n) { return getLang() !== 'de' && has(`roundTitle${n}`) ? t(`roundTitle${n}`) : CONFIG.rounds[n - 1].title; }
function skillName(key) { return getLang() !== 'de' && has(`skill_${key}_name`) ? t(`skill_${key}_name`) : CONFIG.skills[key].name; }
function skillText(key) { return getLang() !== 'de' && has(`skill_${key}_text`) ? t(`skill_${key}_text`) : CONFIG.skills[key].text; }

// ---------- Maps (nur Optik) ----------
function showMap(index) {
  models.maps.forEach((m, i) => { m.group.visible = i === index; });
  const cfg = models.maps[index].cfg;
  scene.background.set(cfg.background);
  scene.fog?.color.set(cfg.background);
  floor.material.color.set(cfg.background).multiplyScalar(1.8);       // Boden: etwas heller als der Hintergrund, gleiche Farbe
  grid.material.color.set(cfg.background).lerp(new THREE.Color('#ffffff'), CONFIG.colors.gridBrightness);
  grid.visible = cfg.grid;
}
function mapForRound(round) {
  const list = CONFIG.mapPerRound;
  return (list[(round - 1) % list.length] ?? 1) - 1;
}

// ---------- Deko im Titelbildschirm ----------
let titleDecor = null;
function buildTitleDecor() {
  titleDecor = new THREE.Group();
  const king = makePiece(models, 'king_dark');
  king.position.set(0, 0, -2.5);
  titleDecor.add(king);
  [-1.5, 1.5].forEach((x) => {
    const pawn = makePiece(models, 'pawn_light');
    pawn.position.set(x, 0, 2.5);
    pawn.rotation.y = Math.PI;
    titleDecor.add(pawn);
  });
  scene.add(titleDecor);
}

function hideAllScreens() {
  [ui.title, ui.gameover, ui.win, ui.menu, ui.banner, ui.bossbar, ui.pause, ui.tutorial].forEach((el) => show(el, false));
}

function goToTitle() {
  if (state.paused) setPaused(false);          // Pause beenden (auch Töne wieder an)
  state.timeScale = 1;
  setMode('title');
  clearEnemies();
  removeBoss();
  clearWarnings();
  players.forEach((p) => { p.root.visible = false; });
  titleDecor.visible = true;
  showMap(mapForRound(1));
  hideAllScreens();
  show(ui.title, true);
  ui.hud.forEach((h) => show(h, false));
}

function startGame() {
  state.totalTime = 0;
  state.kills = 0;
  state.unlocked = [];
  players.forEach((p) => { p.skill = null; });
  titleDecor.visible = false;
  hideAllScreens();
  ui.hud.forEach((h) => show(h, true));
  SFX.start();
  startRound(1);
}

// Neue Runde: Map, König, volle LP für alle
function startRound(n) {
  state.round = n;
  state.gameOverTimer = -1;
  state.spawnTimer = E.firstSpawnDelay;
  state.timeScale = 1;
  clearEnemies();
  removeBoss();
  clearWarnings();
  players.forEach(resetPlayer);
  showMap(mapForRound(n));
  hideAllScreens();
  spawnBoss(n);
  show(ui.bossbar, true);
  const r = CONFIG.rounds[n - 1];
  showBanner(t('round', { n }), roundTitle(n), B.introTime);
  setMode('intro');
}

// König besiegt
function roundWon(fromX, fromZ) {
  const b = boss;
  b.dead = true;
  removeWarning(b.attack?.warn);
  b.attack = null;
  b.y = 0;
  startTopple(b, fromX, fromZ);
  // alle gegnerischen Bauern fallen mit um
  enemies.forEach((e) => { if (!e.dead) killEnemy(e, b.x, b.z); });
  // Belohnung freischalten
  const reward = CONFIG.rounds[state.round - 1].reward;
  const S = CONFIG.skills[reward];
  if (S && !state.unlocked.includes(reward)) state.unlocked.push(reward);
  showBanner(S ? t('powerStolen') : t('kingDefeated'), S ? `${S.icon} ${skillName(reward)}` : '', B.victoryTime);
  goldTiles(b.x, b.z, 1.6);
  flashLight(b.x, b.z, CONFIG.colors.gold, 30);
  goldRain(60);
  SFX.victory();
  state.shake = J.shakeTime;
  setMode('victory');
}

// Nach dem Sieg: letzte Runde → Schachmatt, sonst Fähigkeiten-Menü
function afterVictory() {
  if (state.round >= CONFIG.rounds.length) { fadeThen(win); return; }
  if (!state.unlocked.length) { fadeThen(() => startRound(state.round + 1)); return; }
  fadeThen(openMenu);
}

// ---------- Tutorial: 4 kurze Karten vor dem ersten Spiel ----------
const TUTORIAL = ['♟', '⚡', '⚠', '♚'];         // Symbol pro Karte (Texte in lang.js: tut1Title …)
function openTutorial() {
  setMode('tutorial');
  state.tutStep = 0;
  hideAllScreens();
  show(ui.tutorial, true);
  renderTutorial();
}
function renderTutorial() {
  const i = state.tutStep;
  const card = ui.tutorial.querySelector('.tutcard');
  card.querySelector('.icon').textContent = TUTORIAL[i];
  card.querySelector('h3').textContent = t(`tut${i + 1}Title`);
  card.querySelector('p').innerHTML = t(`tut${i + 1}Text`);
  card.querySelector('.tutdots').innerHTML = TUTORIAL.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  ui.tutorial.querySelector('.tuthint').innerHTML = t(i === TUTORIAL.length - 1 ? 'tutGo' : 'tutHint');
  card.classList.remove('slide'); void card.offsetWidth; card.classList.add('slide');   // kleine Einblend-Animation
}

// ---------- Fähigkeiten-Menü ----------
function openMenu() {
  setMode('menu');
  clearEnemies();
  removeBoss();
  hideAllScreens();
  showMap(mapForRound(state.round + 1));          // Map schon wechseln, hinter dem Menü
  players.forEach((p) => { resetPlayer(p); });
  // Auswahl startet bei der aktuellen Fähigkeit, sonst bei der neuesten
  state.menuSel = players.map((p) => {
    const i = state.unlocked.indexOf(p.skill);
    return i >= 0 ? i : state.unlocked.length - 1;
  });
  state.menuReady = [false, false];
  renderMenu();
  show(ui.menu, true);
}

function renderMenu() {
  ui.cards.innerHTML = state.unlocked.map((key, i) => {
    const S = CONFIG.skills[key];
    const marks = players.map((p, pi) => (state.menuSel[pi] === i
      ? `<span class="mark p${pi + 1}">P${pi + 1}${state.menuReady[pi] ? ' ✓' : ''}</span>` : '')).join('');
    const cls = players.map((p, pi) => (state.menuSel[pi] === i ? ` sel${pi + 1}` : '')).join('');
    return `<div class="card plate${cls}"><div class="marks">${marks}</div>
      <div class="icon">${S.icon}</div><div class="cname">${skillName(key)}</div><div class="ctext">${skillText(key)}</div></div>`;
  }).join('');
}

function menuInput(code) {
  players.forEach((p, i) => {
    if (state.menuReady[i]) return;
    const n = state.unlocked.length;
    if (code === p.keys.left) { state.menuSel[i] = (state.menuSel[i] - 1 + n) % n; SFX.menuMove(); }
    if (code === p.keys.right) { state.menuSel[i] = (state.menuSel[i] + 1) % n; SFX.menuMove(); }
    if (code === p.keys.skill) {
      state.menuReady[i] = true;
      p.skill = state.unlocked[state.menuSel[i]];
      SFX.menuOk();
    }
  });
  renderMenu();
  if (state.menuReady.every(Boolean)) {
    setMode('starting');                            // verhindert doppeltes Starten
    setTimeout(() => fadeThen(() => startRound(state.round + 1)), 250);
  }
}

// ---------- Ende ----------
function formatTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
function win() {
  setMode('win');
  clearEnemies();
  hideAllScreens();
  ui.winInfo.textContent = t('winInfo', { t: formatTime(state.totalTime) });
  ui.hud.forEach((h) => show(h, false));
  show(ui.win, true);
  goldRain(80);
  SFX.victory();
}
function gameOver() {
  setMode('gameover');
  ui.gameoverInfo.textContent = t('gameoverInfo', { r: state.round, k: state.kills });
  ui.hud.forEach((h) => show(h, false));
  show(ui.gameover, true);
  show(ui.banner, false);
  show(ui.bossbar, false);
  SFX.lose();
}

// ---------- Ein Spiel-Frame ----------
function updateFight(dt) {
  state.totalTime += dt;

  // Neue gegnerische Bauern
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    state.spawnTimer = E.spawnInterval;
    spawnWave();
  }

  players.forEach((p) => updatePlayer(p, dt));
  enemies.forEach((e) => updateEnemy(e, dt));
  updateBoss(dt, true);
  removeFinishedEnemies();

  // Beide gefallen → nach kurzer Pause "GESCHLAGEN"
  if (state.mode === 'playing' && players.every((p) => !p.alive)) {
    if (state.gameOverTimer < 0) state.gameOverTimer = J.gameOverDelay;
    state.gameOverTimer -= dt;
    if (state.gameOverTimer <= 0) gameOver();
  }
}
function removeFinishedEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].remove) { removeActor(enemies[i]); enemies.splice(i, 1); }
  }
}

// ============================================================
// 9. Tastatur
// ============================================================
const keysDown = new Set();
const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Enter']);

window.addEventListener('keydown', (e) => {
  if (PREVENT.has(e.code)) e.preventDefault();
  if (!audio) initAudio();                      // Browser erlauben Ton erst nach einer Taste
  if (e.repeat) return;

  // ---------- Tutorial: weiter mit Leertaste/Enter, überspringen mit Esc ----------
  if (state.mode === 'tutorial') {
    if (e.code === 'Escape') { SFX.menuOk(); startGame(); }
    else if (e.code === 'Space' || e.code === 'Enter') {
      state.tutStep++;
      if (state.tutStep >= TUTORIAL.length) startGame();
      else { SFX.menuMove(); renderTutorial(); }
    }
    return;
  }

  // ---------- Pause ----------
  if (state.paused) {
    if (e.code === CONFIG.keys.pause || e.code === 'Space' || e.code === 'Enter') setPaused(false);
    else if (e.code === CONFIG.keys.toTitle && !fading) fadeThen(goToTitle);
    return;                                     // in der Pause zählt keine andere Taste
  }
  if (e.code === CONFIG.keys.pause && PAUSABLE.includes(state.mode)) { setPaused(true); return; }

  keysDown.add(e.code);

  // Sprache umschalten (nur im Titelbildschirm)
  if (state.mode === 'title' && e.code === 'KeyL') { toggleLang(); applyLang(); SFX.menuOk(); return; }

  const confirm = e.code === 'Space' || e.code === 'Enter';
  if (['title', 'gameover', 'win'].includes(state.mode) && confirm && !fading) {
    if (state.mode === 'title') { CONFIG.tutorial ? openTutorial() : startGame(); }
    else fadeThen(startGame);                   // Neustart: ohne Tutorial
    return;
  }
  if (state.mode === 'menu') { menuInput(e.code); return; }

  if (state.mode === 'playing' || state.mode === 'intro') {
    for (const p of players) {
      if (e.code === p.keys.dash) startDash(p);
      if (e.code === p.keys.skill && state.mode === 'playing') useSkill(p);
      const d = keyDir(p, e.code);                // kurz angetippt, während die Figur noch zieht
      if (d && p.step) p.queued = d;
    }
  }
});
window.addEventListener('keyup', (e) => keysDown.delete(e.code));

// In diesen Abschnitten darf man pausieren
const PAUSABLE = ['intro', 'playing', 'victory', 'menu'];
function setPaused(on) {
  state.paused = on;
  keysDown.clear();                             // keine Taste "klebt" nach der Pause
  players.forEach((p) => { p.queued = null; });
  show(ui.pause, on);
  if (audio) on ? audio.suspend() : audio.resume();   // Töne anhalten
}
window.addEventListener('blur', () => keysDown.clear());    // Fenster verlassen: keine Taste "klebt"

// ============================================================
// 10. Laden und Game Loop
// ============================================================
models = await loadModels();

// Alle Maps in die Szene, Map-Animationen in Schleife, jede Map einmal vorzeichnen
const mapAnimators = [];
models.maps.forEach((m) => {
  scene.add(m.group);
  const anim = createAnimator(m.group, m.clips);
  anim.playAll();
  mapAnimators.push(anim);
});
models.maps.forEach((m) => {
  models.maps.forEach((o) => { o.group.visible = o === m; });
  renderFrame();
});

players.push(createPlayer(0), createPlayer(1));
buildTitleDecor();

// Nur zum Testen in der Browser-Konsole (z. B. __game.players[0].hp = 1). Stört das Spiel nicht.
window.__game = { state, players, enemies, getBoss: () => boss, spawnWave, damagePlayer, damageBoss, CONFIG };

applyLang();
show(ui.loading, false);
goToTitle();

let last = performance.now();
let frames = 0, fpsTimer = 0;

function loop(now) {
  const realDt = (now - last) / 1000;
  const rawDt = Math.min(realDt, 0.05);       // höchstens 0,05 s pro Frame
  last = now;
  if (state.paused) {                           // Pause: Bild stehen lassen, nur neu zeichnen
    renderFrame();
    requestAnimationFrame(loop);
    return;
  }
  state.clock += rawDt;
  state.modeTime += rawDt;

  frames++; fpsTimer += realDt;
  if (fpsTimer >= 1) { ui.fps.textContent = `${frames} fps`; frames = 0; fpsTimer = 0; }

  // Zeitlupe: nur am Anfang des Siegs
  state.timeScale = state.mode === 'victory' && state.modeTime < B.slowmoTime ? B.slowmoFactor : 1;
  // Hit-Stop: bei Spieler-Schaden steht das Spiel ganz kurz still
  let freeze = 1;
  if (state.hitStop > 0) { state.hitStop -= rawDt; freeze = 0; }
  const dt = rawDt * state.timeScale * freeze;

  let camZoom = 0, camFx = 0, camFz = 0;
  switch (state.mode) {
    case 'title':
    case 'tutorial':
      state.titleAngle += rawDt * J.titleOrbitSpeed;
      break;
    case 'intro':
      // König erscheint, Kamera fährt kurz auf ihn zu und zurück. Spieler dürfen schon laufen.
      players.forEach((p) => updatePlayer(p, dt));
      updateBoss(dt, false);
      if (boss) {
        camZoom = Math.sin(Math.PI * Math.min(1, state.modeTime / B.introTime)) * 0.35;
        camFx = boss.x; camFz = boss.z;
      }
      if (state.modeTime >= B.introTime) setMode('playing');
      break;
    case 'playing':
      updateFight(dt);
      break;
    case 'victory':
      players.forEach((p) => updatePlayer(p, dt));
      enemies.forEach((e) => updateEnemy(e, dt, false));
      updateBoss(dt, false);
      removeFinishedEnemies();
      if (Math.random() < 0.3) goldRain(2);
      if (state.modeTime >= B.victoryTime) { setMode('leaving'); afterVictory(); }
      break;
    case 'gameover':
      players.forEach((p) => updatePlayer(p, dt, false));
      enemies.forEach((e) => updateEnemy(e, dt, false));
      updateBoss(dt, false);
      break;
  }

  // Großer Schriftzug ausblenden
  if (state.bannerTimer > 0) {
    state.bannerTimer -= rawDt;
    if (state.bannerTimer <= 0) show(ui.banner, false);
  }

  // Kamera folgt den lebenden Spielern ein wenig (mehr Bewegung, mehr 3D-Gefühl)
  const alive = players.filter((p) => p.alive && p.root.visible);
  const fx = state.mode !== 'title' && alive.length ? alive.reduce((v, p) => v + p.x, 0) / alive.length * cam.follow : 0;
  const fz = state.mode !== 'title' && alive.length ? (alive.reduce((v, p) => v + p.z, 0) / alive.length - 1) * cam.follow : 0;
  camFollowX += (fx + Math.sin(state.clock * 0.5) * cam.sway - camFollowX) * Math.min(1, rawDt * 2);
  camFollowZ += (fz + Math.cos(state.clock * 0.37) * cam.sway * 0.5 - camFollowZ) * Math.min(1, rawDt * 2);

  // Kamera: im Titel kreisen, sonst fest von vorn; bei Treffern kurz wackeln
  const orbit = state.mode === 'title' || state.mode === 'tutorial';
  placeCamera(orbit ? state.titleAngle : 0, camZoom, camFx, camFz);
  if (state.shake > 0) {
    state.shake -= rawDt;
    const s = J.shakeStrength * state.shakeMul * Math.max(0, state.shake / J.shakeTime);
    if (state.shake <= 0) state.shakeMul = 1;
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s;
  }

  updateWarnings(state.clock);
  mapAnimators.forEach((a) => a.update(rawDt));
  updateParticles(dt);
  updateFadeFx(dt);
  updateFloats(rawDt);
  updateImpactLights(rawDt);
  renderFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
