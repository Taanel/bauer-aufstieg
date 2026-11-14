<!-- Workspace-Hinweis: Dieser Ordner (Claude_GameJam/) IST der Projektordner "bauer-aufstieg/" aus 3.2.
     Besitzer ist Anfänger und spricht Deutsch: einfach erklären, Code kommentieren.
     Eigene Spielidee, kein Nachbau eines bestehenden Spiels. Eigenes git-Repo, GitHub: Taanel/bauer-aufstieg (privat).
     STAND 14.11. 15:41: Block 4 Look fertig (Stil Stein/Bronze/Gold/Weinrot, Copperplate-Schrift). Echte Figuren aus assets/figuren/1_Tot.glb (ganze Blender-Szene; Figuren per Name, z. B. Tot_DongDoi = Spieler, *_KeDich = Gegner). Gegner-Material wird per CONFIG.materialFix korrigiert (Ebenholz-Farbe kam beim Export nicht mit). Brett der .glb unbrauchbar (Schachmuster fehlt) → eigenes Marmor-Brett. Blender-Animationen = Showcase-Choreografie, nicht eingebunden. Server: server.py (no-cache).
     ÄNDERUNG (Thanh, 14.11.): Alle Figuren ziehen FELDWEISE (Feldmitten -3.5…3.5, snap()), nicht frei. Diagonal per zwei Tasten (CONFIG.player.diagonal). Auto-Angriff-Reichweite 1.5 = alle 8 Nachbarfelder.
     Figuren vom Designer: eine .glb pro Figur nach assets/figuren/ (Namen siehe CONFIG.pieceFiles), kommen noch.
     Test ohne sichtbares Fenster: window.__game (state, players, enemies) in der Konsole.
     Offen: echte assets/pieces.glb vom Designer einlegen und Ausrichtung prüfen. Server-Config: ../.claude/launch.json
     Start per Doppelklick: "Spiel starten.command" (Server auf freiem Port ab 8000 + Chrome-App-Fenster im Vollbild). -->

# Bauer-Aufstieg – Projektkontext und Build-Spezifikation

> **Für Claude Code:** Diese Datei ist der komplette Kontext für das Projekt. Lies sie vollständig, bevor du Code schreibst.
> Halte dich strikt an den MVP-Umfang. Was hier nicht steht, wird nicht gebaut.
> Stand: Sa 14.11.2026, Version 2. Version 1 (Bauer → Springer → Dame als Evolution) ist **verworfen**.

---

## 1. Kontext: Das Event

- **Berlin – Game Jam Workshop with Claude**, Sa 14.11.2026, nahe U Hermannplatz.
- Bauzeit: **15:00–17:00 Uhr (2 Stunden)**. 17:00–17:30 Playtest, 17:30–18:00 Top 3 präsentieren, Sieger wird verkündet.
- Die anderen Teilnehmenden spielen jedes Spiel **1–2 Minuten** und stimmen ab.
- Bewertet werden **Spielspaß, Design, Kreativität**. Code-Qualität zählt nicht.
- Team:
  - **Thanh (Build):** arbeitet mit dir (Claude Code), führt Code zusammen, fixt Bugs.
  - **Kollege (Design):** hat Brett und Schachfiguren als 3D-Modelle in Blender gebaut. Er macht Look, Werte, Effekte und Tests und hält den Pitch.
- **Wichtigste Regel:** Nach jedem Schritt muss das Spiel im Browser startbar und spielbar sein. Nie einen halb kaputten Stand hinterlassen.
- **Zweitwichtigste Regel:** Das Spiel muss in 10 Sekunden verständlich sein und in den ersten 30 Sekunden Spaß machen.

---

## 2. Spielidee (Version 2)

> **5 Bosse (Entscheidung 14.11., 16:20, ersetzt „König leiht sich Kräfte“):** Runde 1 Springer → 2 Läufer → 3 Turm → 4 Dame (wechselt Turm-/Läufer-Muster) → 5 König (wechselt alle drei). Belohnungen: L-Sprung (3 L-Sprünge hin/zurück, Schaden auf Nachbarfeldern), Kreuzstrahl, Sturmlauf, Sternstrahl (8 Richtungen). Einstellbar in `CONFIG.rounds` und `CONFIG.patternMix`. Eine Map pro Runde.

**In einem Satz:** Zwei Bauern kämpfen im lokalen Koop auf einem Schachbrett Runde für Runde gegen den gegnerischen **König**. In jeder Runde leiht sich der König die Kraft einer anderen Figur. Wer ihn besiegt, **erbeutet genau diese Kraft** als Fähigkeit und darf vor der nächsten Runde wählen, welche Fähigkeit er einsetzt.

**Änderung gegenüber Version 1** (Entscheidung des Designers):
- Die Spieler werden **nicht mehr befördert**. Beide bleiben die ganze Zeit Bauern.
- Stattdessen sammeln sie **Fähigkeiten** und wählen vor jeder Runde aus, welche sie benutzen.
- **Jede Runde ist ein Kampf gegen den König.** Sieg = Belohnung mit der passenden Fähigkeit.

**Annahme, die noch zu bestätigen ist:** „Passende Fähigkeit“ heißt hier: Der König kämpft in Runde N mit der Kraft von Figur X (Springer, Turm, Läufer). Wer ihn besiegt, bekommt die Fähigkeit von Figur X. Prinzip wie bei Mega-Man-Bossen. Falls der Designer das anders meint, nur Abschnitt 5 und 6 anpassen.

**Warum das gut ist:**
- **Design:** Jede Runde ist ein Bosskampf. Das ist mehr Spektakel als normale Gegnerwellen.
- **Spielspaß:** Man lernt die Attacke des Königs erst als Gefahr kennen und darf sie danach selbst benutzen. Das fühlt sich sehr befriedigend an.
- **Kreativität:** Schach-Regeln werden zu Boss-Mustern. Die Fähigkeitswahl gibt jedem Spieler eine eigene Rolle.
- **Einfacher zu bauen** als Version 1: nur eine Spielerfigur, ein Boss mit wechselnden Mustern.

---

## 3. Technik

### 3.1 Stack
- **Three.js** (3D, WebGL) im Browser, ES-Module, **kein Build-Tool**.
- Three.js liegt **lokal** im Projekt (WLAN vor Ort kann wackeln): `npm install three`, Einbindung per Import Map auf `./node_modules/three/...`.
- Modelle aus Blender als **`.glb`** (glTF 2.0), geladen mit `GLTFLoader`.
- Lokaler Server ist Pflicht, weil Browser `.glb` nicht von `file://` laden: `python3 -m http.server 8000`, dann `http://localhost:8000` öffnen.
- Sound nur per WebAudio (Oszillatoren), keine Audiodateien.
- **Ergänzungen 14.11. (16:20):** Sounds neu (Rauschen, Hall, Hintergrundmusik in d-Moll, `CONFIG.sound`). Schaden deutlicher (roter Bildschirmrand, „-1“-Zahlen, Hit-Stop, Tafel zittert). Mehr 3D (flachere Kamera folgt leicht, Lichtblitze, Goldrahmen). Sprachen DE/EN in `lang.js`, Umschalten im Titel mit Taste L. Pause mit Esc, M = zum Titel.
- Ziel: Chrome auf Thanhs Laptop, flüssige 60 fps.

### 3.2 Projektstruktur
```
Claude_GameJam/   (= bauer-aufstieg)
├── CLAUDE.md          ← diese Datei
├── index.html         ← Canvas, UI-Overlays (HTML/CSS), Import Map, lädt main.js
├── config.js          ← ALLE Werte und Farben (Designer ändert nur hier)
├── main.js            ← Szene, Game Loop, Spiellogik
├── assets/
│   ├── pieces.glb     ← Figuren vom Designer
│   └── map1.glb … map5.glb ← 5 Maps vom Designer (Brett + Deko, je mit Objekt `board`)
└── node_modules/three
```
Wenn `main.js` zu groß wird, darf es in Module aufgeteilt werden (`boss.js`, `skills.js`, `fx.js`). Kein Framework.

### 3.3 `config.js`
- Exportiert ein Objekt `CONFIG` mit **allen** Balancing-Werten, Farben, Kamerawinkeln und Tastenbelegungen.
- **Jede Zeile mit einem deutschen Kommentar**, damit der Designer Werte ohne Code-Verständnis ändern kann.
- Keine Zahl für Balancing darf hart im restlichen Code stehen.

### 3.4 Koordinaten und Logik
- **Spiellogik ist 2D** auf der Brettfläche (x, z). Three.js zeigt nur an.
- 1 Einheit = 1 Schachfeld. Brett 8×8, Mittelpunkt bei (0, 0), Felder von −4 bis +4.
- Kollision per Kreis-Abstand (Radius in `CONFIG`). Keine Physik-Engine.
- **Feldweise Bewegung (Änderung 14.11.):** Alle Figuren ziehen von Feld zu Feld (gleiten/hüpfen zur nächsten Feldmitte), nicht frei. Taste halten = weiterziehen, kurz tippen = ein Feld.
- Game Loop mit `requestAnimationFrame` und **Delta-Zeit** (begrenzt auf max. 0,05 s pro Frame).
- Reihen: Spieler starten in Reihe 1–2 (z ≈ +3), der König startet in Reihe 8 (z ≈ −3,5).

### 3.5 Kamera und Look
- Feste Perspektivkamera schräg von vorn oben (ca. 55° Neigung), Blick auf die Brettmitte, ganzes Brett sichtbar. Orientierung an den Blender-Renderings des Designers.
- **Look aus Blender übernehmen:**
  - Hintergrund kräftiges Rot (Startwert `#8a0f0f`), optional mit feinem Rasterboden darunter.
  - Brett: weiße und dunkelrote Marmorfelder.
  - **Spieler-Figuren hell/gläsern**, **Gegner-Figuren dunkelrot/glänzend**.
  - Goldene, leuchtende Felder als Effektsprache (Treffer, Fähigkeiten, Sieg).
- Licht: `HemisphereLight` + `DirectionalLight` mit Schatten. Schattenauflösung ≤ 2048.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`.
- Glas-Materialien aus Blender (Transmission) können langsam sein. Unter ca. 45 fps die Spieler-Figuren auf `MeshStandardMaterial` mit `transparent: true, opacity: 0.85, roughness: 0.1` umstellen.

### 3.6 Laden der Modelle
- Erwartete Objektnamen in `pieces.glb` (Designer exportiert so, sonst Namen in `CONFIG.modelNames` anpassen):
  - `pawn_light` (Spieler)
  - `pawn_dark`, `knight_dark`, `bishop_dark`, `rook_dark`, `queen_dark`, `king_dark` (Gegner)
- Beim Laden: Objekt nach Name suchen, klonen, per Bounding Box **normalisieren**: Höhe = `CONFIG.pieceHeight` (Start 0,9), Fuß auf y = 0, mittig im Feld.
- Maps: siehe 6.6. Jede Map wird am Objekt `board` ausgerichtet (Breite = `CONFIG.boardModelWidth`, mittig, Oberkante y = 0). Fehlt eine Map, prozedurales Brett in den Farben dieser Map aus `CONFIG.maps`.
- **Fallback ist Pflicht:** Fehlt ein Modell oder schlägt das Laden fehl, wird eine einfache Ersatzfigur aus Primitiven gebaut (Zylinder + Kugel, König mit Kreuz aus zwei Boxen), in denselben Farben. Das Spiel muss immer laufen, auch ganz ohne `.glb`.
- Ladebildschirm: „Lade Figuren …“, danach Titelbildschirm.
- **Blender-Animationen (Änderung 14.11.):** Der Designer hat schon Animationen gemacht. Sie werden aus `pieces.glb` und den Maps mitgeladen und automatisch der Figur zugeordnet, die sie bewegen (`models.clips[key]`, abspielen mit `createAnimator(piece, clips).play(name)`). Welches Ereignis welche Animation spielt, steht in `CONFIG.blenderAnims` (leer = Code-Animation aus Abschnitt 7). Map-Animationen laufen automatisch in Schleife. Code-Animationen (Hüpfen, Neigen, Rückstoß) bewegen die äußere Hülle der Figur und laufen zusätzlich zur Blender-Animation. Testszene: Taste A spielt alle gefundenen Animationen.

---

## 4. Steuerung

Beide Spieler an **einer** Tastatur. Unterscheidung über `event.code`.

| | Bewegen | Vorstoß (Dash) | Fähigkeit | Auswahl im Fähigkeiten-Menü |
|---|---|---|---|---|
| Spieler 1 (links) | `W A S D` | `ShiftLeft` | `Space` | `A`/`D` wählen, `Space` bestätigen |
| Spieler 2 (rechts) | Pfeiltasten | `ShiftRight` | `Enter` | `←`/`→` wählen, `Enter` bestätigen |

- Angriff erfolgt **automatisch** auf den nächsten Gegner in Reichweite.
- `preventDefault` für Pfeiltasten, Leertaste und Shift.
- Titel- und Endbildschirm: `Space` oder `Enter` startet.
- Die Spieler sind farblich markiert: Ring unter der Figur, P1 blau `#4dd2ff`, P2 grün `#7CFC9A` (beide Bauern sind hell, deshalb Ring nötig).

---

## 5. Spielablauf

1. **Titelbildschirm:** „BAUER-AUFSTIEG“, Untertitel „Besiegt den König. Stehlt seine Macht.“, Tastenbelegung beider Spieler, „Leertaste oder Enter zum Starten“. Im Hintergrund dreht sich die Kamera langsam ums Brett.
2. **Runde startet:** Großer Schriftzug, z. B. „RUNDE 1 – DER KÖNIG REITET“ (2 s). Der König erscheint in Reihe 8 mit einem Effekt in der Farbe seiner geliehenen Kraft.
3. **Kampf:** Der König greift mit seinem Rundenmuster an. Zusätzlich erscheinen in festen Abständen gegnerische Bauern als Störer.
4. **Sieg in der Runde:** König LP = 0 → er kippt um (Animation), Zeitlupe 0,5 s, Gold-Partikel, Schriftzug „MACHT ERBEUTET: L-SPRUNG!“.
4b. **Map-Wechsel:** Nach „MACHT ERBEUTET!“ blendet das Bild kurz aus, die nächste Map aus `CONFIG.mapPerRound` erscheint (siehe 6.6).
5. **Fähigkeiten-Menü:** Zwischen den Runden. Jeder Spieler sieht die freigeschalteten Fähigkeiten als Karten (Name, Figur-Symbol, Einzeiler) und wählt **eine** für seinen Fähigkeiten-Slot. Beide müssen bestätigen. Beide Spieler bekommen volle LP.
6. **Nächste Runde** mit neuem König-Muster.
7. **Spielsieg:** Nach der letzten Runde „SCHACHMATT!“ mit Gesamtzeit.
8. **Niederlage:** Beide Spieler bei 0 LP → „GESCHLAGEN“ mit erreichter Runde. Neustart per Taste.
- Fällt nur ein Spieler, kämpft der andere allein weiter. Zu Beginn der nächsten Runde ist der Gefallene wieder da.
- In Runde 1 haben die Spieler noch **keine** Fähigkeit, nur Auto-Angriff und Vorstoß. Die Fähigkeiten-Taste zeigt ein Schloss-Symbol.

**Ziel-Spieldauer:** ca. 45–60 s pro Runde, ganzes Spiel 3–4 Minuten.

---

## 6. Inhalte

### 6.1 Spieler: Bauer (immer)

| Wert | Start |
|---|---|
| Lebenspunkte | 5 |
| Tempo | 3,0 Felder/s |
| Auto-Angriff | Stoß schräg nach vorn auf den nächsten Gegner, Reichweite 1,2, Schaden 1, alle 0,45 s |
| Vorstoß (Dash) | 2 Felder in Bewegungsrichtung, 0,25 s, unverwundbar, 1 Schaden an allem auf dem Weg, Abklingzeit 2,5 s |
| Unverwundbarkeit nach Treffer | 0,8 s, Figur blinkt |

Anzeige an jeder Figur: LP als kleine Punkte darüber, Abklingzeiten als zwei Ringe darunter (Dash, Fähigkeit).

### 6.2 Fähigkeiten (Belohnungen)

| Fähigkeit | Erbeutet in | Wirkung | Schaden | Abklingzeit |
|---|---|---|---|---|
| **L-Sprung** (Springer) | Runde 1 | Sprung 2 Felder in Bewegungsrichtung + 1 seitlich, Bogenflug 0,35 s, unverwundbar, Landung trifft im Radius 1,3 | 3 | 3,5 s |
| **Sturmlauf** (Turm) | Runde 2 | Ansturm in gerader Linie (nur waagerecht/senkrecht, die Hauptachse der Bewegung) bis zum Brettrand, unverwundbar, trifft alles auf dem Weg, stößt Gegner zur Seite | 4 | 5 s |
| **Kreuzstrahl** (Läufer) | Runde 3 | 4 Strahlen auf beiden Diagonalen bis zum Brettrand, durchschlagend, 0,3 s sichtbar | 3 pro Gegner | 5 s |

- Jeder Spieler hat **einen** Fähigkeiten-Slot.
- Im Menü darf jeder **jede** freigeschaltete Fähigkeit wählen, auch dieselbe wie der Mitspieler.
- Ohne Bewegungsrichtung gilt die letzte Blickrichtung (Start: nach vorn = Richtung Reihe 8).

### 6.3 Der König (Boss)

Grundverhalten in allen Runden:
- Bewegt sich langsam (1,0 Felder/s) und hält ca. 3 Felder Abstand zum nächsten Spieler.
- Führt alle `CONFIG.boss.attackInterval` Sekunden (Start 2,2 s) eine Attacke seines Rundenmusters aus.
- **Jede Attacke wird vorher angezeigt** (rote, pulsierende Markierung auf dem Brett). Ohne Vorwarnung gibt es keinen Schaden.
- Lebensbalken oben am Bildschirm mit Name der Runde.
- Bei Treffer: weißes Aufblitzen, kleiner Rückstoß.
- Unter 50 % LP: Attacken-Intervall × 0,75 (wird schneller, sichtbar durch rotes Glühen).

| Runde | Titel | LP | Muster des Königs | Vorwarnung |
|---|---|---|---|---|
| 1 | „Der König reitet“ (Springer-Kraft) | 30 | Springt in L-Form auf ein Feld neben einen Spieler. Landung: Schaden 1 im Radius 1,3 | roter Kreis am Landepunkt, 0,7 s |
| 2 | „Der König stürmt“ (Turm-Kraft) | 40 | Richtet sich auf Reihe oder Spalte eines Spielers aus und stürmt bis zum Rand. Schaden 2 | rote Linie über die ganze Bahn, 0,8 s |
| 3 | „Der König segnet“ (Läufer-Kraft) | 50 | Feuert Strahlen auf beiden Diagonalen durch seine Position. Schaden 1 | rote Diagonalen, 0,8 s |

**Störer in jeder Runde:** gegnerische Bauern (`pawn_dark`), 2 LP, laufen langsam (1,1 Felder/s) auf den nächsten Spieler zu, Berührung = 1 Schaden. Alle 6 s erscheinen 2 neue am oberen Rand, maximal 6 gleichzeitig. Bei Rundensieg verschwinden alle.

### 6.6 Maps (Entscheidung 14.11., nach Version 2 ergänzt)
- Es gibt **5 Maps**. Sie sind **nur Optik**: Brett-Look, Deko, Hintergrundfarbe. Spielfeld, Kollision und Regeln sind auf jeder Map gleich (8×8, keine Hindernisse).
- Nach jedem besiegten Boss wechselt die Map. Reihenfolge in `CONFIG.mapPerRound`.
- Alle Maps werden beim Start geladen und einmal vorgezeichnet, damit der Wechsel nicht ruckelt. Funktion `showMap(index)` in `main.js`.
- Testszene: Tasten 1–5 schalten die Maps durch.

### 6.4 Optional (nur wenn um 16:30 alles läuft, in dieser Reihenfolge)
1. **Finale, Runde 4: „Die Königin rächt sich“** – `queen_dark` als Endboss mit 60 LP, nutzt abwechselnd alle drei Muster plus einen Ring aus 8 Geschossen. Sieg = Spielsieg.
2. **Wiederbelebung:** Gefallener Bauer liegt umgekippt auf dem Brett. Steht der Mitspieler 1,5 s daneben (Fortschrittsring), kommt er mit halben LP zurück.
3. **Koop-Bonus:** Treffen zwei Fähigkeiten den König innerhalb von 1 s, erscheint „COMBO!“ und der Schaden wird ×1,5.

### 6.5 Nicht bauen
Evolution der Spielerfiguren (Version 1), mehr als ein Fähigkeiten-Slot, Ultimates, passive Fähigkeiten, Endlos-Modus, Online-Multiplayer, Gamepad, Mobile-Steuerung, Einstellungsmenü, Speicherstände. Blender-Animationen nur für die Ereignisse in `CONFIG.blenderAnims`, kein Blending zwischen mehreren Clips.

---

## 7. Juice (Pflicht)

- **Bewegung:** Figuren hüpfen leicht beim Laufen (Sinus auf y) und neigen sich in Laufrichtung.
- **Treffer am Gegner:** Figur blitzt weiß (emissive), kleine Partikel, kurzer Ton.
- **Gegner-Bauer besiegt:** kippt um, verblasst, Partikel.
- **Spieler getroffen:** Kamera-Screenshake, tiefer Ton, Figur blinkt.
- **Vorwarnungen:** flache, rote, pulsierende Flächen knapp über dem Brett (y = 0,02), leiser Warnton.
- **Fähigkeiten:** jede mit eigenem Ton und goldenen Feldern auf dem Brett an der getroffenen Stelle (Stil aus den Blender-Renderings).
- **König besiegt:** kippt langsam um, Zeitlupe 0,5 s, Goldregen, aufsteigende Tonfolge, Schriftzug „MACHT ERBEUTET!“.
- **Rundenstart:** Kamera fährt kurz auf den König zu und zurück.
- UI als HTML-Overlay über dem Canvas: große, fette Schrift, weiß mit dunklem Schatten, passend zum roten Hintergrund.

---

## 8. Bau-Reihenfolge

Jeder Block endet mit einem spielbaren Stand. Erst weiter, wenn das Abnahmekriterium erfüllt ist.

### Block 0 – Setup (vor 15:00 erledigen)
Projektordner, `npm install three`, `index.html` mit Import Map, Server läuft, Testszene mit Brett lädt `pieces.glb` und zeigt alle Figuren in einer Reihe.
**Abnahme:** Die Blender-Figuren sind im Browser sichtbar, richtig skaliert und richtig ausgerichtet.

### Block 1 – Fundament (Ziel 15:30)
Kamera und Licht im Blender-Look, `config.js`, Game Loop, Titelbildschirm, 2 Bauern mit Steuerung, Auto-Angriff, Vorstoß, gegnerische Bauern, LP, Niederlage, Fallback-Figuren.
**Abnahme:** Zwei Leute können gemeinsam gegnerische Bauern besiegen und sterben.

### Block 2 – Erster Boss und Belohnung (Ziel 16:00)
König mit Lebensbalken, Muster Runde 1 mit Vorwarnung, Rundensieg, Map-Wechsel, Fähigkeiten-Menü, L-Sprung für Spieler, Runde 2 startet (darf vorerst Muster 1 wiederholen).
**Abnahme:** Runde 1 gewinnen, L-Sprung wählen und in Runde 2 benutzen.

### Block 3 – Alle Runden (Ziel 16:30)
Muster Runde 2 und 3, Sturmlauf und Kreuzstrahl, Spielsieg-Bildschirm mit Zeit.
**Abnahme:** Das Spiel ist von Titel bis „SCHACHMATT!“ komplett durchspielbar.

### Block 4 – Juice (Ziel 16:40)
Alles aus Abschnitt 7, was noch fehlt.
**Abnahme:** Jede Aktion hat sichtbares und hörbares Feedback.

### Ab 16:40 – Feature-Stopp
Nur noch Bugs fixen und Werte in `config.js` ändern.

### Notfallpläne
- **3D läuft um 15:30 nicht** (Laden, Performance, Ausrichtung): Wechsel auf **2D-Canvas mit Sprites**. Der Designer rendert dafür ab 15:00 parallel jede Figur als PNG (transparenter Hintergrund, gleicher Kamerawinkel) nach `assets/sprites/`. Die Spiellogik bleibt gleich, nur die Darstellung ändert sich.
- **Block 2 um 16:10 nicht fertig:** Runde 3 streichen. Zwei Runden reichen für den Playtest.
- **Performance schlecht:** Schatten aus, Glas-Material ersetzen (3.5), Pixel Ratio auf 1.

---

## 9. Aufgaben Designer (zur Koordination, nicht für Claude)

- **Sofort bei Ankunft:** Figuren als `pieces.glb` exportieren: File → Export → glTF 2.0, Format *glTF Binary (.glb)*, „Apply Modifiers“ an, +Y Up, **Animationen an** (Animation-Modus „Actions“, jede Action klar benennen, z. B. `king_defeat`; der Drehpunkt/Origin jeder Figur sollte unten am Fuß liegen), Objektnamen wie in 3.6. Texturen max. 1024 px. Jede der 5 Maps als eigene Datei `map1.glb` … `map5.glb`, das Brett darin heißt `board`. Prozedurale Materialien (z. B. Marmor aus Noise-Knoten) vorher zu Bild-Texturen backen.
- 15:00–15:30: Sprite-Backup rendern (siehe Notfallpläne), Farben in `config.js` vorgeben.
- Ab 15:30: Spielen, Werte anpassen, Wünsche als kurze Liste an Thanh. Wünsche außerhalb des MVP kommen auf eine „Später“-Liste.
- Ab 16:00: fremde Leute testen lassen.
- 16:40–17:00: 60-Sekunden-Pitch üben (Idee in einem Satz → 30 s live spielen → ein Satz dazu, wie Claude geholfen hat und dass die Modelle aus Blender stammen).
- Zur Fairness: Beim Check-in oder im Pitch offen sagen, dass die 3D-Modelle vorher in Blender entstanden sind und der Code heute.

---

## 10. Playtest (17:00–17:30)

- Das Spiel läuft auf **beiden Laptops** (Projektordner per USB-Stick oder AirDrop kopieren, Server starten). Doppelt so viele Leute können gleichzeitig spielen, das bringt mehr Stimmen.
- Titelbildschirm erklärt die Steuerung. Wir sagen nur: „Zu zweit, besiegt den König, stehlt seine Kraft.“
- Wer spielt, bekommt am Ende die Zeit angezeigt. Bestzeit auf einem Zettel neben dem Laptop schafft Wettbewerb.

---

## 11. Prompts für Thanh (zum Kopieren)

**Block 0:**
```
Lies CLAUDE.md komplett. Erledige Block 0: Projektstruktur aus 3.2, Three.js lokal per npm, Import Map, Testszene, die assets/pieces.glb lädt und alle Figuren normalisiert in einer Reihe zeigt. Gib mir am Ende die Befehle zum Starten.
```

**Block 1:**
```
Block 0 ist abgenommen. Baue Block 1 laut CLAUDE.md. Alle Werte in config.js mit deutschen Kommentaren. Fallback-Figuren nicht vergessen.
```

**Nächster Block:**
```
Block [N] ist abgenommen. Baue jetzt Block [N+1] laut CLAUDE.md. Ändere nichts, was schon funktioniert.
```

**Bug:**
```
Bug: [was passiert] statt [was passieren soll]. So reproduziere ich es: [...]. Fixe nur das, ohne andere Logik umzubauen.
```

**Werte vom Designer:**
```
Ändere in config.js: [Wert] von [alt] auf [neu]. Sonst nichts.
```

**Modell sieht falsch aus:**
```
Das Modell [Name] ist [zu groß / liegt / schaut falsch herum / schwebt]. Korrigiere die Normalisierung oder Rotation nur für dieses Modell über CONFIG.
```

**Notfall 2D:**
```
3D ist keine Option mehr. Stelle die Darstellung auf 2D-Canvas mit den PNGs aus assets/sprites/ um. Spiellogik und config.js bleiben unverändert.
```

**Feature-Stopp (16:40):**
```
Ab jetzt keine neuen Features. Prüfe den Code auf Fehler, die das Spiel abstürzen lassen können, und fixe nur diese.
```
