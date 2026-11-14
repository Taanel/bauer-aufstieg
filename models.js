// ============================================================
//  models.js – lädt die Blender-Figuren (.glb), die Maps und die
//  Blender-Animationen.
//  Fehlt eine Datei oder eine Figur, wird automatisch eine
//  Ersatzfigur aus einfachen Formen gebaut. Das Spiel läuft also immer.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// SkeletonUtils.clone kopiert auch Figuren mit Knochen (Armature) richtig
import { clone as deepClone } from 'three/addons/utils/SkeletonUtils.js';
import { CONFIG } from './config.js';

// Alle Figuren, die das Spiel kennt (Schlüssel = Name in CONFIG.modelNames)
export const PIECE_KEYS = [
  'pawn_light', 'pawn_dark', 'knight_dark', 'bishop_dark',
  'rook_dark', 'queen_dark', 'king_dark',
];

// ---------- Laden ----------

// Ein Loader für alles. Draco/Meshopt nur für den Fall, dass beim Export
// in Blender "Kompression" angehakt wurde – sonst werden sie nicht gebraucht.
const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('./node_modules/three/examples/jsm/libs/draco/gltf/');
loader.setDRACOLoader(draco);
loader.setMeshoptDecoder(MeshoptDecoder);

// Lädt eine .glb-Datei. Gibt { scene, animations } zurück oder null, wenn es nicht klappt.
async function loadGLB(url) {
  try {
    const gltf = await loader.loadAsync(url);
    return { scene: gltf.scene, animations: gltf.animations };
  } catch (err) {
    console.warn('Nicht geladen (Ersatz wird benutzt):', url, err?.message ?? err);
    return null;
  }
}

// Sucht ein Objekt nach Namen. Blender hängt manchmal ".001" an oder
// der Loader macht aus Leerzeichen "_" – deshalb auch "beginnt mit" erlauben.
function findByName(root, name) {
  if (!root || !name) return null;
  const exact = root.getObjectByName(name);
  if (exact) return exact;
  const wanted = name.toLowerCase();
  let found = null;
  root.traverse((obj) => {
    if (found || !obj.name) return;
    const clean = obj.name.toLowerCase().replace(/[\s.]/g, '_');
    if (clean.startsWith(wanted)) found = obj;
  });
  return found;
}

// Kopiert ein Objekt aus der Blender-Szene heraus.
// Das Objekt behält seine eigene Position/Drehung aus Blender, weil Blender-
// Animationen genau diese Werte verändern. Eine Hülle ("holder") übernimmt
// Drehung und Größe der Eltern-Objekte. Die Verschiebung zur Brettmitte
// macht danach normalize() anhand der Bounding Box.
function detachCopy(obj) {
  const holder = new THREE.Group();
  if (obj.parent) {
    obj.parent.updateWorldMatrix(true, false);
    obj.parent.matrixWorld.decompose(holder.position, holder.quaternion, holder.scale);
    holder.position.set(0, 0, 0);
  }
  holder.add(deepClone(obj));
  return holder;
}

// Sucht die Animationen, die zu einer Figur gehören: Eine Animation gehört
// dazu, wenn sie ein Teil dieser Figur bewegt.
function clipsFor(root, animations) {
  if (!root || !animations?.length) return [];
  const names = new Set();
  root.traverse((o) => names.add(o.name));
  return animations.filter((clip) => clip.tracks.some((t) =>
    names.has(THREE.PropertyBinding.parseTrackName(t.name).nodeName)));
}

// ---------- Normalisieren ----------
// Macht aus jedem Modell eine Figur mit gleicher Höhe, Fuß auf y = 0,
// mittig im Feld. Aufbau:  wrapper (bewegt das Spiel)  →  inner (Korrektur)  →  Modell
function normalize(model, targetHeight, rotationDeg = 0) {
  const wrapper = new THREE.Group();
  const inner = new THREE.Group();
  wrapper.add(inner);
  inner.add(model);
  inner.rotation.y = THREE.MathUtils.degToRad(rotationDeg);

  // 1. Größe messen und auf Zielhöhe skalieren
  const box = new THREE.Box3();
  inner.updateMatrixWorld(true);
  box.setFromObject(inner);
  const height = box.max.y - box.min.y;
  if (height > 0) inner.scale.setScalar(targetHeight / height);

  // 2. Nochmal messen und so verschieben, dass der Fuß auf y = 0 steht
  inner.updateMatrixWorld(true);
  box.setFromObject(inner);
  const center = box.getCenter(new THREE.Vector3());
  inner.position.set(-center.x, -box.min.y, -center.z);

  // Schatten für alle Teile anschalten
  wrapper.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return wrapper;
}

// Schnelles Ersatz-Material für die gläsernen Spieler (bei schlechten fps)
function makePlayerFastMaterial() {
  return new THREE.MeshStandardMaterial({
    color: CONFIG.colors.playerPiece, transparent: true, opacity: 0.85, roughness: 0.1,
  });
}

// ---------- Leuchtender Rand (wie in den Blender-Bildern) ----------
// Erweitert das Material um ein Leuchten an den Kanten, die von der Kamera weg zeigen
// ("Fresnel"-Effekt). Zusammen mit Bloom glüht so der Rand der Figur.
function addRimGlow(m, color, strength) {
  const fix = CONFIG.materialFix;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: new THREE.Color(color) };
    shader.uniforms.rimStrength = { value: strength };
    shader.uniforms.rimPower = { value: fix.rimPower };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;\nuniform float rimPower;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
        totalEmissiveRadiance += rimColor * pow(rimF, rimPower) * rimStrength;`);
  };
  m.customProgramCacheKey = () => 'rim';
}

// ---------- Material-Korrektur ----------
// Gegner bekommen ihre dunkle Ebenholz-Farbe zurück, Spieler leuchten weniger stark.
function fixMaterials(root, key) {
  const fix = CONFIG.materialFix;
  if (!fix?.enabled) return;
  const isEnemy = key !== 'pawn_light';
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (isEnemy) {
        if (m.color) m.color.set(fix.enemyColor);
        if ('roughness' in m) m.roughness = fix.enemyRoughness;
        if ('metalness' in m) m.metalness = fix.enemyMetalness;
        if (m.emissive) { m.emissive.set(fix.enemyGlow); m.emissiveIntensity = fix.enemyGlowStrength; m.emissiveMap = null; }
      } else if (m.emissive) {
        m.emissiveIntensity *= fix.allyGlowScale;
      }
      if (fix.rim && m.isMeshStandardMaterial) {
        addRimGlow(m, isEnemy ? fix.enemyRimColor : fix.allyRimColor, isEnemy ? fix.enemyRimStrength : fix.allyRimStrength);
      }
      m.needsUpdate = true;
    }
  });
}

// ---------- Ersatzfiguren ----------
// Einfache Figuren aus Zylinder + Kugel. Jede Figur bekommt einen eigenen Kopf,
// damit man sie auch ohne Blender-Modell unterscheiden kann.
function buildFallbackPiece(key) {
  const isPlayer = key === 'pawn_light';
  const mat = isPlayer
    ? makePlayerFastMaterial()
    : new THREE.MeshStandardMaterial({ color: CONFIG.colors.enemyPiece, roughness: 0.22, metalness: 0.35 });

  const g = new THREE.Group();
  const add = (geo, y, x = 0, rotZ = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0);
    m.rotation.z = rotZ;
    g.add(m);
    return m;
  };

  add(new THREE.CylinderGeometry(0.30, 0.36, 0.12, 24), 0.06);  // Sockel
  add(new THREE.CylinderGeometry(0.13, 0.26, 0.52, 24), 0.38);  // Körper
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24), 0.64);  // Kragen

  const type = key.split('_')[0];
  if (type === 'pawn') {
    add(new THREE.SphereGeometry(0.17, 20, 14), 0.80);
  } else if (type === 'king') {
    add(new THREE.SphereGeometry(0.17, 20, 14), 0.80);
    add(new THREE.BoxGeometry(0.07, 0.30, 0.07), 1.06);           // Kreuz senkrecht
    add(new THREE.BoxGeometry(0.20, 0.07, 0.07), 1.08);           // Kreuz waagerecht
  } else if (type === 'queen') {
    add(new THREE.SphereGeometry(0.17, 20, 14), 0.80);
    const crown = add(new THREE.TorusGeometry(0.14, 0.035, 8, 20), 0.97);
    crown.rotation.x = Math.PI / 2;
  } else if (type === 'rook') {
    add(new THREE.CylinderGeometry(0.22, 0.20, 0.26, 4), 0.80);   // eckiger Turm-Kopf
  } else if (type === 'bishop') {
    const head = add(new THREE.SphereGeometry(0.15, 20, 14), 0.84);
    head.scale.y = 1.5;                                           // länglicher Läufer-Kopf
  } else if (type === 'knight') {
    add(new THREE.BoxGeometry(0.20, 0.36, 0.22), 0.84, 0, 0);     // Hals
    add(new THREE.BoxGeometry(0.18, 0.16, 0.34), 0.98).position.z = 0.08; // Kopf schaut nach vorn (+z)
  }
  return g;
}

// ---------- Marmor-Textur für das Ersatz-Brett ----------
function makeMarbleTexture(baseColor, veinColor) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = veinColor;
  for (let i = 0; i < 7; i++) {                // ein paar zufällige Adern
    ctx.globalAlpha = 0.08 + Math.random() * 0.12;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, 0);
    ctx.bezierCurveTo(Math.random() * size, size * 0.3, Math.random() * size, size * 0.7, Math.random() * size, size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Baut ein 8×8-Brett aus Würfeln in den Farben der Map. Oberkante liegt auf y = 0.
function buildFallbackBoard(mapCfg) {
  const c = CONFIG.colors;
  const g = new THREE.Group();
  // Adern: etwas dunkler als helle Felder, etwas heller als dunkle Felder
  const lightVein = '#' + new THREE.Color(mapCfg.light).multiplyScalar(0.6).getHexString();
  const darkVein = '#' + new THREE.Color(mapCfg.dark).lerp(new THREE.Color('#ffffff'), 0.35).getHexString();
  const lightMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({
    map: makeMarbleTexture(mapCfg.light, lightVein), roughness: 0.25, metalness: 0.05 }));
  const darkMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({
    map: makeMarbleTexture(mapCfg.dark, darkVein), roughness: 0.25, metalness: 0.1 }));
  const squareGeo = new THREE.BoxGeometry(1, 0.12, 1);

  for (let col = 0; col < 8; col++) {
    for (let row = 0; row < 8; row++) {
      // row 0 = Reihe 1 (vorne, bei den Spielern, z = +3,5)
      const isDark = (col + row) % 2 === 0;           // a1 ist dunkel wie im echten Schach
      const mats = isDark ? darkMats : lightMats;
      const sq = new THREE.Mesh(squareGeo, mats[(col * 3 + row) % 3]);
      sq.position.set(-3.5 + col, -0.06, 3.5 - row);
      sq.receiveShadow = true;
      g.add(sq);
    }
  }
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(8.6, 0.4, 8.6),
    new THREE.MeshStandardMaterial({ color: c.boardBase, roughness: 0.4, metalness: 0.2 }));
  base.position.y = -0.32;
  base.receiveShadow = true;
  g.add(base);
  return g;
}

// Map aus Blender ausrichten. Maßstab ist das Objekt "board" in der Map:
// Es wird auf CONFIG.boardModelWidth Felder Breite skaliert, mittig auf (0, 0)
// und mit der Oberkante auf y = 0 gesetzt. Alle Deko-Objekte drumherum
// bewegen sich einfach mit. Gibt es kein "board", zählt die ganze Map.
function normalizeMap(mapScene) {
  const wrapper = new THREE.Group();
  wrapper.add(mapScene);
  const ref = findByName(mapScene, CONFIG.modelNames.board) ?? mapScene;
  const box = new THREE.Box3();

  wrapper.updateMatrixWorld(true);
  box.setFromObject(ref);
  const width = box.max.x - box.min.x;
  if (width > 0) mapScene.scale.multiplyScalar(CONFIG.boardModelWidth / width);

  wrapper.updateMatrixWorld(true);
  box.setFromObject(ref);
  const center = box.getCenter(new THREE.Vector3());
  mapScene.position.x -= center.x;
  mapScene.position.z -= center.z;
  mapScene.position.y -= box.max.y;

  wrapper.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = true; } });
  return wrapper;
}

// ---------- Hauptfunktion ----------
// Lädt alles und gibt zurück:
//   templates – eine fertige Vorlage pro Figur (zum Klonen mit makePiece)
//   maps      – Liste aller Maps: { group, source: 'blender'|'ersatz', cfg }
//   report    – pro Figur 'blender' oder 'ersatz' (zur Kontrolle)
// Alle Dateien werden gleichzeitig geladen, damit der Start schnell geht
// und es beim Map-Wechsel später kein Ruckeln gibt.
export async function loadModels() {
  const singleFiles = PIECE_KEYS.map((k) => CONFIG.pieceFiles?.[k] || null);
  const loaded = await Promise.all([
    loadGLB(CONFIG.modelFiles.pieces),
    ...CONFIG.maps.map((m) => loadGLB(m.file)),
    ...singleFiles.map((f) => (f ? loadGLB(f) : null)),
  ]);
  const piecesFile = loaded[0];
  const mapFiles = loaded.slice(1, 1 + CONFIG.maps.length);
  const pieceSingles = loaded.slice(1 + CONFIG.maps.length);

  const piecesScene = piecesFile?.scene;
  const templates = {};
  const clips = {};   // Blender-Animationen pro Figur
  const report = {};
  PIECE_KEYS.forEach((key, i) => {
    const height = CONFIG.pieceHeight * (CONFIG.modelScale[key] ?? 1);
    const single = pieceSingles[i];
    // 1. eigene Datei für diese Figur (ganze Datei = Figur), sonst 2. Objekt mit dem Namen in pieces.glb
    const found = single ? single.scene : findByName(piecesScene, CONFIG.modelNames[key]);
    clips[key] = [];
    if (found) {
      templates[key] = normalize(detachCopy(found), height, CONFIG.modelRotationY[key] ?? 0);
      clips[key] = single ? single.animations : clipsFor(found, piecesFile.animations);
      report[key] = 'blender';
      fixMaterials(templates[key], key);
      if (key === 'pawn_light' && CONFIG.render.playerGlassFallback) {
        const fast = makePlayerFastMaterial();
        templates[key].traverse((o) => { if (o.isMesh) o.material = fast; });
      }
    } else {
      templates[key] = normalize(buildFallbackPiece(key), height, 0);
      report[key] = 'ersatz';
    }
  });

  const maps = CONFIG.maps.map((cfg, i) => {
    const file = mapFiles[i];
    if (file) return { group: normalizeMap(file.scene), source: 'blender', cfg, clips: file.animations };
    return { group: buildFallbackBoard(cfg), source: 'ersatz', cfg, clips: [] };
  });

  // Liste aller Objektnamen in pieces.glb – hilft, wenn Namen nicht passen
  const namesInFile = [];
  piecesScene?.traverse((o) => { if (o.name) namesInFile.push(o.name); });

  return { templates, clips, maps, report, namesInFile };
}

// Erzeugt eine neue Figur aus einer Vorlage. Jede Figur bekommt eigene
// Materialien, damit z. B. das weiße Aufblitzen nur diese Figur trifft.
export function makePiece(models, key) {
  const piece = deepClone(models.templates[key]);
  piece.traverse((o) => {
    if (o.isMesh) {
      // Kopie behält auch den leuchtenden Rand (onBeforeCompile wird von clone() nicht mitkopiert)
      const copy = (m) => {
        const c = m.clone();
        c.onBeforeCompile = m.onBeforeCompile;
        c.customProgramCacheKey = m.customProgramCacheKey;
        return c;
      };
      o.material = Array.isArray(o.material) ? o.material.map(copy) : copy(o.material);
    }
  });
  return piece;
}

// ---------- Blender-Animationen abspielen ----------
// Erzeugt einen "Animator" für eine Figur oder Map:
//   anim.play('king_defeat')           – spielt die Animation einmal
//   anim.play('idle', { loop: true })  – spielt sie in Schleife
//   anim.playAll()                     – alle Animationen in Schleife (für Map-Deko)
//   anim.update(dt)                    – muss in jedem Frame aufgerufen werden
// Gibt es die Animation nicht, passiert einfach nichts (dann bleibt die Code-Animation).
export function createAnimator(root, clips = []) {
  const mixer = new THREE.AnimationMixer(root);
  // Name genau oder "enthält" (z. B. "defeat" findet "king_defeat")
  const find = (name) => !name ? null :
    clips.find((c) => c.name === name) ??
    clips.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));

  return {
    names: clips.map((c) => c.name),
    has: (name) => !!find(name),
    play(name, { loop = false } = {}) {
      const clip = find(name);
      if (!clip) return null;
      mixer.stopAllAction();
      const action = mixer.clipAction(clip);
      action.reset();
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.clampWhenFinished = !loop;   // nach dem Ende in der letzten Pose stehen bleiben
      action.timeScale = CONFIG.blenderAnimSpeed;
      action.play();
      return action;
    },
    playAll() {
      clips.forEach((c) => {
        const a = mixer.clipAction(c);
        a.timeScale = CONFIG.blenderAnimSpeed;
        a.play();
      });
    },
    stop() { mixer.stopAllAction(); },
    update(dt) { mixer.update(dt); },
  };
}
