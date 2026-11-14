// ============================================================
//  config.js – ALLE Werte des Spiels an einem Ort.
//  Designer: Hier darfst du Zahlen und Farben ändern.
//  Nach dem Speichern im Browser neu laden (Cmd + R).
//  Farben immer als Text in Anführungszeichen, z. B. '#ff0000'.
// ============================================================

export const CONFIG = {

  // ---------- Farben ----------
  colors: {
    // Hintergrund und Brettfarben stehen pro Map weiter unten bei "maps"
    gridBrightness: 0.18,    // wie viel heller die Rasterlinien als der Hintergrund sind (0 = unsichtbar)
    boardBase: '#2a0405',    // Sockel/Rand des Ersatz-Bretts
    goldFrame: true,         // goldener Rahmen ums Brett (false = aus, z. B. wenn die Map einen eigenen hat)
    impactLights: true,      // Lichtblitze bei Einschlägen und Fähigkeiten (beleuchten die Figuren)
    playerPiece: '#eaf6ff',  // Ersatzfigur Spieler (hell, gläsern)
    enemyPiece: '#7a0a10',   // Ersatzfigur Gegner (dunkelrot, glänzend)
    gold: '#ffc94a',         // Gold für Effekte (Treffer, Fähigkeiten, Sieg)
    player1: '#4dd2ff',      // Ring unter Spieler 1 (blau)
    player2: '#7CFC9A',      // Ring unter Spieler 2 (grün)
  },

  tutorial: true,            // kurzes Tutorial nach dem Titelbildschirm zeigen (Esc überspringt es)

  // ---------- Tasten (Namen wie im Browser: KeyW, ArrowUp, ShiftLeft …) ----------
  keys: {
    p1: {
      up: 'KeyW',            // Spieler 1 hoch
      down: 'KeyS',          // Spieler 1 runter
      left: 'KeyA',          // Spieler 1 links
      right: 'KeyD',         // Spieler 1 rechts
      dash: 'ShiftLeft',     // Spieler 1 Vorstoß
      skill: 'Space',        // Spieler 1 Fähigkeit
    },
    p2: {
      up: 'ArrowUp',         // Spieler 2 hoch
      down: 'ArrowDown',     // Spieler 2 runter
      left: 'ArrowLeft',     // Spieler 2 links
      right: 'ArrowRight',   // Spieler 2 rechts
      dash: 'ShiftRight',    // Spieler 2 Vorstoß
      skill: 'Enter',        // Spieler 2 Fähigkeit
    },
    pause: 'Escape',         // Pause an/aus (für beide)
    toTitle: 'KeyM',         // in der Pause: zurück zum Titelbildschirm
  },

  // ---------- Spieler (Bauer) ----------
  player: {
    hp: 5,                   // Lebenspunkte
    speed: 3.0,              // Tempo: so viele Felder pro Sekunde (Figuren ziehen von Feld zu Feld)
    diagonal: true,          // true = zwei Tasten gleichzeitig ziehen schräg, false = nur gerade
    radius: 0.3,             // Größe für Zusammenstöße (in Feldern)
    attackRange: 1.5,        // Reichweite Auto-Angriff (1.5 = alle 8 Nachbarfelder)
    attackDamage: 1,         // Schaden Auto-Angriff
    attackInterval: 0.45,    // Sekunden zwischen zwei Auto-Angriffen
    dashDistance: 2,         // Vorstoß: so viele Felder weit
    dashTime: 0.25,          // Vorstoß: Dauer in Sekunden
    dashDamage: 1,           // Vorstoß: Schaden an allem auf dem Weg
    dashCooldown: 2.5,       // Vorstoß: Abklingzeit in Sekunden
    invulnAfterHit: 0.8,     // Sekunden unverwundbar nach einem Treffer
    startX: [-1.5, 1.5],     // Startposition links/rechts (Spieler 1, Spieler 2)
    startZ: 2.5,             // Startreihe (3.5 = Reihe 1, 2.5 = Reihe 2)
  },

  // ---------- Gegnerische Bauern (Störer) ----------
  enemyPawn: {
    hp: 2,                   // Lebenspunkte
    speed: 1.1,              // Tempo: so viele Feld-Züge pro Sekunde
    moveTime: 0.3,           // Dauer eines Zugs (Hüpfer aufs nächste Feld) in Sekunden
    radius: 0.3,             // Größe für Zusammenstöße
    touchDamage: 1,          // Schaden bei Berührung
    spawnInterval: 6,        // alle so viele Sekunden kommen neue
    spawnCount: 2,           // so viele auf einmal
    maxAlive: 6,             // höchstens so viele gleichzeitig
    firstSpawnDelay: 1.5,    // Sekunden bis zu den ersten Gegnern
    spawnZ: -3.5,            // Reihe, in der sie erscheinen (-3,5 = oberer Rand)
  },

  // ---------- Runden: jede Runde ein Kampf gegen den König ----------
  // power = welche Figur-Kraft sich der König leiht (knight = Springer, rook = Turm, bishop = Läufer)
  // reward = welche Fähigkeit die Spieler danach bekommen (siehe "skills")
  rounds: [
    // boss = welche Figur der Boss ist, power = welches Angriffs-Muster (siehe "patterns" und "patternMix")
    { title: 'DER SPRINGER REITET', boss: 'knight_dark', power: 'knight', bossHp: 30, reward: 'lsprung' },     // Runde 1
    { title: 'DER LÄUFER SEGNET', boss: 'bishop_dark', power: 'bishop', bossHp: 35, reward: 'heilung' },  // Runde 2
    { title: 'DER TURM STÜRMT', boss: 'rook_dark', power: 'rook', bossHp: 40, reward: 'sturmlauf' },          // Runde 3
    { title: 'DIE DAME HERRSCHT', boss: 'queen_dark', power: 'queen', bossHp: 50, reward: 'sternstrahl' },     // Runde 4
    { title: 'SCHACH DEM KÖNIG', boss: 'king_dark', power: 'king', bossHp: 60, reward: '' },                  // Runde 5 (Finale)
  ],
  // Bosse mit gemischten Angriffen: sie wechseln der Reihe nach zwischen diesen Mustern
  patternMix: {
    queen: ['rook', 'bishop'],             // Dame: wie Turm UND Läufer
    king: ['knight', 'rook', 'bishop'],    // König: alles, was er von seinen Figuren kennt
  },

  // ---------- Der König (Boss) ----------
  boss: {
    speed: 1.0,              // Tempo: so viele Feld-Züge pro Sekunde
    moveTime: 0.4,           // Dauer eines Zugs in Sekunden
    keepDistance: 3,         // so viele Felder Abstand hält er zum nächsten Spieler
    radius: 0.45,            // Größe für Treffer
    attackInterval: 2.2,     // Sekunden zwischen zwei Attacken
    enrageBelow: 0.5,        // unter diesem Anteil LP (0.5 = 50 %) wird er schneller
    enrageFactor: 0.75,      // Attacken-Abstand wird damit malgenommen (0.75 = 25 % schneller)
    knockback: 0.12,         // wie weit er bei Treffern zurückweicht
    startZ: -3.5,            // Startreihe (Reihe 8)
    introTime: 2.2,          // Sekunden für den Rundenstart (Schriftzug + Kamerafahrt)
    toppleTime: 1.1,         // Sekunden, bis der besiegte König umgekippt ist
    sizeBoost: 1.25,         // Bosse sind so viel größer als normale Figuren (1 = gleich groß)
    slowmoTime: 0.5,         // Sekunden Zeitlupe beim Sieg
    slowmoFactor: 0.3,       // Tempo in der Zeitlupe (0.3 = 30 %)
    victoryTime: 2.8,        // Sekunden vom Sieg bis zum Fähigkeiten-Menü
  },
  // Farbe der geliehenen Kraft (Effekt beim Erscheinen, Ring unter dem König)
  powerColors: {
    knight: '#ff8c42',       // Springer-Kraft
    rook: '#b388ff',         // Turm-Kraft
    bishop: '#5cffd1',       // Läufer-Kraft
    queen: '#ff4fd8',        // Dame
    king: '#ffd36b',         // König (gold)
  },

  // ---------- Attacken-Muster des Königs ----------
  patterns: {
    knight: {
      warnTime: 0.7,         // Sekunden rote Vorwarnung vor dem Sprung
      jumpTime: 0.45,        // Dauer des Sprungs (Sekunden)
      jumpHeight: 1.6,       // Sprunghöhe (Felder)
      radius: 1.3,           // Schadensradius bei der Landung
      damage: 1,             // Schaden bei der Landung
    },
    rook: {
      alignTime: 0.35,       // Sekunden, um sich auf Reihe/Spalte des Spielers zu stellen
      warnTime: 0.8,         // Sekunden rote Linie vor dem Ansturm
      chargeSpeed: 11,       // Tempo des Ansturms (Felder pro Sekunde)
      laneWidth: 0.9,        // Breite der Bahn (Felder)
      damage: 2,             // Schaden
    },
    bishop: {
      distance: 3,           // so viele Felder schräg vom Spieler stellt er sich hin
      alignTime: 0.45,       // Sekunden, um sich in Position zu bringen
      warnTime: 0.8,         // Sekunden rote Diagonalen vor dem Strahl
      beamTime: 0.35,        // so lange sind die Strahlen sichtbar
      beamWidth: 0.6,        // Breite der Strahlen
      damage: 1,             // Schaden
    },
  },

  // ---------- Fähigkeiten der Spieler (Belohnungen) ----------
  skills: {
    lsprung: {
      name: 'L-SPRUNG',      // Name auf der Karte
      icon: '♞',             // Symbol auf der Karte
      text: '3 Springer-Sprünge hin und zurück – jede Landung trifft alle Felder daneben', // Einzeiler auf der Karte
      // Die Sprünge nacheinander, jeweils [zur Seite, nach vorn] in Feldern (vorn = Blickrichtung).
      // Standard: 1. hin (L nach vorn), 2. zurück (L zurück aufs Startfeld), 3. hin (L zur anderen Seite)
      hops: [[1, 2], [-1, -2], [-1, 2]],
      time: 0.28,            // Dauer eines einzelnen Sprungs (Sekunden), die ganze Zeit unverwundbar
      height: 1.0,           // Sprunghöhe
      radius: 1.5,           // Treffer-Radius bei jeder Landung (1.5 = alle 8 Felder direkt daneben)
      damage: 2,             // Schaden pro Landung
      cooldown: 4.5,         // Abklingzeit (Sekunden)
    },
    sturmlauf: {
      name: 'STURMLAUF',     // Name auf der Karte
      icon: '♜',             // Symbol auf der Karte
      text: 'Stürmt geradeaus bis zum Rand und rammt alles zur Seite', // Einzeiler auf der Karte
      speed: 12,             // Tempo (Felder pro Sekunde), unverwundbar
      damage: 4,             // Schaden an allem auf dem Weg
      push: 1.2,             // wie weit Getroffene zur Seite fliegen
      cooldown: 5,           // Abklingzeit (Sekunden)
    },
    heilung: {
      name: 'HEILUNG',       // Name auf der Karte
      icon: '✚',             // Symbol auf der Karte
      text: 'Heilt euch beide – und holt einen gefallenen Mitspieler zurück', // Einzeiler auf der Karte
      heal: 2,               // so viele Herzen bekommt jeder lebende Spieler zurück
      reviveHp: 1,           // mit so vielen Herzen steht ein gefallener Mitspieler wieder auf (0 = nie)
      color: '#6dffa8',      // Farbe der Heilung (grün)
      cooldown: 8,           // Abklingzeit (Sekunden)
    },
    sternstrahl: {
      name: 'STERNSTRAHL',   // Name auf der Karte
      icon: '♛',             // Symbol auf der Karte
      text: '8 goldene Strahlen in alle Richtungen – wie die Dame', // Einzeiler auf der Karte
      width: 0.6,            // Breite der Strahlen
      beamTime: 0.3,         // so lange sind die Strahlen sichtbar
      damage: 3,             // Schaden pro Gegner
      cooldown: 6,           // Abklingzeit (Sekunden)
    },
    kreuzstrahl: {
      name: 'KREUZSTRAHL',   // Name auf der Karte
      icon: '♝',             // Symbol auf der Karte
      text: 'Vier goldene Strahlen auf beiden Diagonalen, durchschlagend', // Einzeiler auf der Karte
      width: 0.6,            // Breite der Strahlen
      beamTime: 0.3,         // so lange sind die Strahlen sichtbar
      damage: 3,             // Schaden pro Gegner
      cooldown: 5,           // Abklingzeit (Sekunden)
    },
  },

  // ---------- Effekte ("Juice") ----------
  juice: {
    hopHeight: 0.09,         // wie hoch Figuren beim Laufen hüpfen
    hopSpeed: 14,            // wie schnell sie hüpfen
    leanDeg: 10,             // Neigung beim Laufen in Grad
    flashTime: 0.12,         // Dauer des weißen Aufblitzens bei Treffer (Sekunden)
    knockback: 0.35,         // wie weit Gegner beim Treffer zurückfliegen (Felder)
    shakeStrength: 0.18,     // Stärke des Kamera-Wackelns
    shakeTime: 0.3,          // Dauer des Kamera-Wackelns (Sekunden)
    lungeDistance: 0.25,     // wie weit der Bauer beim Angriff nach vorn stößt
    toppleTime: 0.35,        // Sekunden, bis eine besiegte Figur umgekippt ist
    deathFadeTime: 0.7,      // Sekunden, bis besiegte Gegner verschwunden sind
    gameOverDelay: 1.5,      // Sekunden nach der Niederlage bis "GESCHLAGEN"
    titleOrbitSpeed: 0.15,   // Drehgeschwindigkeit der Kamera im Titelbildschirm
    bannerTime: 1.4,         // wie lange große Schriftzüge zu sehen sind (Sekunden)
    hitStop: 0.09,           // Sekunden, die das Spiel bei Spieler-Schaden kurz einfriert (macht Treffer spürbar)
    hurtShake: 2.2,          // Kamera-Wackeln bei Spieler-Schaden (mal shakeStrength)
    lowHp: 2,                // ab so wenig Leben pulsiert die Spieler-Tafel rot
    breathe: 0.025,          // leichtes "Atmen" stehender Figuren (0 = aus)
  },

  // ---------- Sound ----------
  sound: {
    volume: 0.5,             // Gesamtlautstärke (0 = stumm, 1 = laut)
    reverb: 0.25,            // Hall (0 = trocken, 0.5 = großer Raum)
    music: true,             // Hintergrundmusik an/aus
    musicVolume: 0.35,       // Lautstärke der Musik im Verhältnis zu den Effekten
    musicBpm: 124,           // Tempo der Musik (Schläge pro Minute)
  },

  // ---------- Kamera ----------
  camera: {
    fov: 44,                 // Blickwinkel in Grad (kleiner = mehr Zoom)
    tilt: 47,                // Neigung in Grad (90 = genau von oben, kleiner = flacher und mehr 3D)
    distance: 11.8,          // Abstand zur Brettmitte in Feldern
    lookAtZ: 0.6,            // Wohin die Kamera schaut (z, + = näher zu den Spielern)
    follow: 0.18,            // wie stark die Kamera den Spielern ein wenig folgt (0 = fest)
    sway: 0.12,              // leichtes Schweben der Kamera (0 = ruhig)
  },

  // ---------- Licht ----------
  light: {
    // Werte nach dem Blender-Video des Designers: helles, gleichmäßiges Licht, kräftiges Rot
    exposure: 0.9,           // Gesamthelligkeit des Bildes (kleiner = dunkler)
    toneMapping: 'agx',      // Farbdarstellung: 'agx' = wie Blender (Standard seit Blender 4), 'aces' = kräftiger/kontrastreicher
    hemiIntensity: 0.7,      // Grundhelligkeit von oben/unten (kleiner = kräftigere Schatten)
    hemiSky: '#ffffff',      // Farbe des Grundlichts von oben
    hemiGround: '#a01818',   // Farbe des Grundlichts von unten (rot vom Boden)
    sunIntensity: 1.8,       // Stärke der Sonne (wirft Schatten)
    sunColor: '#fff4ec',     // Farbe der Sonne (fast weiß wie im Blender-Viewport)
    sunX: -4,                // Sonnen-Position seitlich
    sunY: 9,                 // Sonnen-Position Höhe (niedriger = längere Schatten)
    sunZ: 5,                 // Sonnen-Position vorne/hinten
    shadowSize: 2048,        // Schatten-Auflösung (max. 2048, kleiner = schneller)
    shadows: true,           // Schatten an (true) oder aus (false)
    shadowSoftness: 3,       // Weichheit der Schatten-Kanten (0 = hart)
    contactShadows: true,    // weicher dunkler Fleck direkt unter jeder Figur
    contactShadowStrength: 0.45, // Dunkelheit dieses Flecks (0 = unsichtbar, 1 = schwarz)
    envIntensity: 1.0,       // Spiegelungen auf Glas und Lack (0 = aus)
    fog: false,              // Boden verschwindet in der Ferne (im Video: nein)
    fogNear: 9,              // ab dieser Entfernung beginnt der Nebel
    fogFar: 24,              // ab dieser Entfernung ist alles im Nebel
  },

  // ---------- Darstellung ----------
  render: {
    maxPixelRatio: 1.5,      // Schärfe (1 = schneller, 1.5 = schärfer)
    playerGlassFallback: false, // true = Glas-Material der Spieler durch schnelles Material ersetzen (bei < 45 fps)
    bloom: true,             // Leuchten (Bloom) um glühende Ränder und Effekte wie in Blender. false = schneller
    bloomStrength: 0.3,      // Stärke des Leuchtens
    bloomRadius: 0.5,        // wie weit das Leuchten streut
    bloomThreshold: 2.4,     // ab welcher Helligkeit etwas leuchtet (hoch = nur echtes Leuchten wie Lava, Kristalle, Effekte)
  },

  // ---------- Modelle aus Blender ----------
  pieceHeight: 0.9,          // Höhe jeder Figur in Feldern (Bauer, König … werden auf diese Höhe skaliert)
  modelFiles: {
    pieces: './assets/figuren/1_Tot.glb', // Datei mit allen Figuren (Export des Designers, ganze Szene)
  },
  // Eine eigene .glb-Datei pro Figur (so wie der Designer exportiert).
  // Steht hier eine Datei, wird die GANZE Datei als diese Figur benutzt.
  // Leer lassen ('') = Figur wird in pieces.glb über ihren Namen gesucht.
  pieceFiles: {
    pawn_light: '',          // Spieler-Bauer
    pawn_dark: '',           // Gegner-Bauer
    knight_dark: '',         // Springer
    bishop_dark: '',         // Läufer
    rook_dark: '',           // Turm
    queen_dark: '',          // Dame
    king_dark: '',           // König
  },

  // ---------- Maps (nur Optik, das Spielfeld bleibt immer 8×8) ----------
  // Jede Map ist eine eigene .glb-Datei aus Blender. Fehlt sie, wird ein
  // Ersatz-Brett in den Farben "light"/"dark" gebaut.
  // Wichtig: Das Brett in jeder Map heißt in Blender "board" (siehe modelNames).
  maps: [
    // Die 5 Maps des Designers liegen alle in einer Datei, jede als eigene Szene (scene).
    // board = Name des 8×8-Bretts in der Szene, light/dark = Farben der Felder (das Muster kam beim Export nicht mit)
    { file: './assets/maps/9_BanCo_CacMan.glb', scene: 'Man1_RungNgoc', board: 'BanCo_O_Man1_RungNgoc',
      background: '#030c06', light: '#9cbfa2', dark: '#1c3a26', grid: false },                 // Map 1: Jade-Wald
    { file: './assets/maps/9_BanCo_CacMan.glb', scene: 'Man2_CungBang', board: 'BanCo_O_Man2_CungBang',
      background: '#050c18', light: '#b6c9df', dark: '#26446b', grid: false },                 // Map 2: Eispalast
    { file: './assets/maps/9_BanCo_CacMan.glb', scene: 'Man3_SaMacHoangKim', board: 'BanCo_O_Man3_SaMacHoangKim',
      background: '#140902', light: '#dcbd86', dark: '#70420f', grid: false },                 // Map 3: Goldene Wüste
    { file: './assets/maps/9_BanCo_CacMan.glb', scene: 'Man4_HuKhong', board: 'BanCo_O_Man4_HuKhong',
      background: '#05020c', light: '#a597c2', dark: '#281848', grid: false },                 // Map 4: Leere
    { file: './assets/maps/9_BanCo_CacMan.glb', scene: 'Man5_NgaiVangHoaNguc', board: 'BanCo_O_Man5_NgaiVangHoaNguc',
      background: '#140201', light: '#c98c7a', dark: '#4a0e07', grid: false, decoGlow: 0.08 }, // Map 5: Thron in der Hölle (Lava sonst zu hell)
  ],
  // Titelbildschirm: das rote Original-Brett aus dem Blender-Video
  titleMap: { file: './assets/maps/9_BanCo_CacMan.glb', scene: '_Goc_BanCoDo', board: 'BanCo_O',
    background: '#b30d0d', light: '#f4eeea', dark: '#9a0a12', grid: true },
  marble: true,              // Marmor-Adern auf allen Brettern (wie in Blender)
  marbleVeins: '#ffd0d0',    // Farbe der hellen Adern auf dunklen Feldern
  marbleStrength: 0.45,      // wie deutlich die hellen Adern sind (0 = unsichtbar)

  // Nachbesserungen für die Maps aus Blender
  mapFix: {
    excludePrefixes: ['Tot_', 'Ma_', 'Tuong_', 'Xe_', 'Hau_', 'Vua_'], // Figuren in der Map-Szene werden entfernt
    boardGlow: 0.25,         // Leuchten der Brettfelder (1 = wie in Blender)
    decoGlow: 1,             // Leuchten der Deko (Glühwürmchen, Schnee, Funken …), 1 = wie in Blender. Pro Map änderbar mit decoGlow
    glowCap: 4,            // Obergrenze fürs Leuchten: verhindert, dass alles weiß überstrahlt (Farbe bleibt sichtbar)
  },
  // Welche Map in welcher Runde: Zahl = Nummer der Map (1 bis 5). Erster Eintrag = Runde 1.
  // Die Map wechselt nach jedem besiegten Boss.
  mapPerRound: [1, 2, 3, 4, 5],
  // Name des Objekts in Blender für jede Figur. Falls der Designer anders benannt hat, hier ändern.
  modelNames: {
    pawn_light: 'Tot_DongDoi',  // Spieler-Bauer (Tốt, Verbündeter)
    pawn_dark: 'Tot_KeDich',    // Gegner-Bauer (Tốt, Feind)
    knight_dark: 'Ma_KeDich',   // Springer (Mã)
    bishop_dark: 'Tuong_KeDich', // Läufer (Tượng)
    rook_dark: 'Xe_KeDich',     // Turm (Xe)
    queen_dark: 'Hau_KeDich',   // Dame (Hậu)
    king_dark: 'Vua_KeDich',    // König (Vua)
    board: 'board',             // Brett in jeder Map-Datei (daran wird die Map ausgerichtet)
  },
  // Drehung pro Figur in Grad, falls ein Modell falsch herum schaut (0 = so wie aus Blender)
  modelRotationY: {
    pawn_light: 0,   // Spieler-Bauer
    pawn_dark: 0,    // Gegner-Bauer
    knight_dark: 0,  // Springer (Kopf sollte zu den Spielern schauen)
    bishop_dark: 0,  // Läufer
    rook_dark: 0,    // Turm
    queen_dark: 0,   // Dame
    king_dark: 0,    // König
  },
  // Extra-Größe pro Figur (1 = normale Höhe, 1.3 = 30 % größer). König darf größer sein.
  modelScale: {
    pawn_light: 1,   // Spieler-Bauer
    pawn_dark: 1,    // Gegner-Bauer
    knight_dark: 1.1, // Springer
    bishop_dark: 1.15, // Läufer
    rook_dark: 1.05, // Turm
    queen_dark: 1.25, // Dame
    king_dark: 1.35, // König
  },
  // ---------- Material-Korrektur für die Blender-Figuren ----------
  // Manche Blender-Materialien (z. B. das "Ebenholz" der Gegner) kommen beim Export nicht mit
  // und wären sonst weiß-leuchtend. Hier wird das im Spiel korrigiert.
  materialFix: {
    enabled: true,           // false = Materialien genau so wie aus der .glb-Datei
    // Gegner wie im Blender-Video: dunkelrot, glänzend wie Lack/Glas
    enemyColor: '#7a0c12',   // Farbe der Gegner (dunkles Rot)
    enemyRoughness: 0.12,    // Glanz der Gegner (klein = glänzender)
    enemyMetalness: 0.0,     // metallischer Anteil der Gegner
    enemyGlow: '#3a0204',    // leichtes rotes Eigenleuchten der Gegner
    enemyGlowStrength: 0.2,  // Stärke dieses Leuchtens (0 = aus)
    enemyClearcoat: 1,       // Lackschicht der Gegner (0 = matt, 1 = Hochglanz)
    // Spieler wie im Blender-Video: klares Glas
    allyGlass: true,         // true = Spieler-Figuren aus Glas (durchsichtig), false = Stein-Textur aus der .glb
    allyGlassTint: '#ffe4e0', // Farbton des Glases (leicht rosa wie im Video)
    allyGlowScale: 0.1,      // Eigenleuchten der Stein-Figuren (nur wenn allyGlass: false)
    rim: true,               // leuchtender Rand um die Figuren (macht sie auf dem Brett besser sichtbar)
    rimPower: 3,             // wie schmal der Rand ist (größer = schmaler)
    enemyRimColor: '#ff6040', // Randfarbe der Gegner
    enemyRimStrength: 0.35,  // Stärke des Gegner-Rands (im Video kaum Rand)
    allyRimColor: '#ffffff', // Randfarbe der Spieler
    allyRimStrength: 0.7,    // Stärke des Spieler-Rands (macht das Glas auf weißen Feldern sichtbar)
  },

  // ---------- Blender-Animationen ----------
  // Welche Animation aus Blender bei welchem Ereignis abgespielt wird.
  // Eintragen: Name der Animation (Action) aus Blender, z. B. 'king_defeat'.
  // Leer lassen ('') = keine Blender-Animation, dann macht der Code die Bewegung.
  // Welche Namen es gibt, zeigt die Testszene oben links.
  blenderAnimSpeed: 1,       // Abspieltempo aller Blender-Animationen (2 = doppelt so schnell)
  blenderAnims: {
    pawn_light:  { idle: '', walk: '', attack: '', hit: '', defeat: '' }, // Spieler-Bauer
    pawn_dark:   { idle: '', walk: '', attack: '', hit: '', defeat: '' }, // Gegner-Bauer
    king_dark:   { idle: '', attack: '', hit: '', defeat: '' },           // König (Boss)
    queen_dark:  { idle: '', attack: '', hit: '', defeat: '' },           // Dame (optionales Finale)
    knight_dark: { idle: '' },   // Springer (nur Deko/Symbol)
    bishop_dark: { idle: '' },   // Läufer (nur Deko/Symbol)
    rook_dark:   { idle: '' },   // Turm (nur Deko/Symbol)
  },

  boardModelWidth: 8,        // Breite des Objekts "board" in Feldern (größer als 8, wenn das Brett einen Rand hat, z. B. 8.8)
};
