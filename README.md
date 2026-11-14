# Bauer-Aufstieg ♟

Koop-Bossfight auf dem Schachbrett – gebaut beim **Game Jam Workshop with Claude** in Berlin (14.11.2026).

Zwei Bauern kämpfen an einer Tastatur Runde für Runde gegen den König. In jeder Runde leiht er sich die Kraft einer anderen Figur (Springer, Turm, Läufer). Wer ihn besiegt, **erbeutet genau diese Kraft** als Fähigkeit.

- 3D im Browser mit [Three.js](https://threejs.org), ohne Build-Tool
- 3D-Figuren aus Blender (`assets/figuren/1_Tot.glb`)
- Sounds und Musik komplett aus WebAudio erzeugt
- Deutsch / Englisch (Taste **L** im Titelbildschirm)

## Starten

```bash
npm install          # einmalig: lädt Three.js nach node_modules/
python3 server.py 8000
```

Dann im Browser **http://localhost:8000** öffnen. Auf dem Mac geht es auch per Doppelklick auf `Spiel starten.command`.

## Steuerung

| | Ziehen | Vorstoß | Fähigkeit |
|---|---|---|---|
| Spieler 1 | `W A S D` | `Shift links` | `Leertaste` |
| Spieler 2 | Pfeiltasten | `Shift rechts` | `Enter` |

`Esc` = Pause, in der Pause `M` = zurück zum Titel.

## Dateien

| Datei | Inhalt |
|---|---|
| `config.js` | alle Werte, Farben, Tasten (hier wird gebalanct) |
| `main.js` | Spiel: Szene, Figuren, König, Fähigkeiten, Ablauf |
| `models.js` | lädt die Blender-Modelle (mit Ersatzfiguren, falls etwas fehlt) |
| `lang.js` | alle Texte auf Deutsch und Englisch |
| `index.html` | Bildschirme und Look (HTML/CSS) |
| `server.py` | kleiner lokaler Server ohne Zwischenspeicher |
| `modelcheck.html` | Testseite, um neue Blender-Modelle zu prüfen |

## Team

- **Build:** Thanh (mit Claude Code)
- **Design & 3D-Modelle:** Kollege (Blender)

Die 3D-Modelle sind vorab in Blender entstanden, der Code am Jam-Tag.
