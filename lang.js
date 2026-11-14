// ============================================================
//  lang.js – alle Texte auf Deutsch und Englisch.
//  Umschalten im Titelbildschirm mit der Taste L.
//  Neue Texte: einfach hier in beiden Sprachen eintragen.
//  {n}, {r}, {k}, {t} werden im Spiel durch Zahlen ersetzt.
// ============================================================

export const TEXT = {
  de: {
    loading: 'Lade Figuren …',
    subtitle: 'Besiegt den König. Stehlt seine Macht.',
    player1: 'SPIELER 1',
    player2: 'SPIELER 2',
    ctrl1: 'Ziehen <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><br>Vorstoß <kbd>Shift links</kbd><br>Fähigkeit <kbd>Leertaste</kbd>',
    ctrl2: 'Ziehen <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd><br>Vorstoß <kbd>Shift rechts</kbd><br>Fähigkeit <kbd>Enter</kbd>',
    pressStart: 'Leertaste oder Enter zum Starten',
    titleHint: 'Pause: <kbd>Esc</kbd> &nbsp;·&nbsp; Sprache / Language: <kbd>L</kbd> <b>Deutsch</b>',
    pressRestart: 'Leertaste oder Enter für Neustart',
    gameoverTitle: 'GESCHLAGEN',
    winTitle: 'SCHACHMATT!',
    hudDash: 'Vorstoß',
    hudSkill: 'Fähigkeit',
    menuTitle: 'WÄHLT EURE MACHT',
    menuHint: 'Spieler 1: <kbd>A</kbd> / <kbd>D</kbd> wählen, <kbd>Leertaste</kbd> bestätigen &nbsp;·&nbsp; Spieler 2: <kbd>←</kbd> / <kbd>→</kbd> wählen, <kbd>Enter</kbd> bestätigen',
    pauseResume: 'Weiter: <kbd>Esc</kbd> oder <kbd>Leertaste</kbd> / <kbd>Enter</kbd>',
    pauseTitle: 'Zum Titelbildschirm: <kbd>M</kbd>',
    round: 'RUNDE {n}',
    powerStolen: 'MACHT ERBEUTET!',
    kingDefeated: 'KÖNIG BESIEGT!',
    gameoverInfo: 'Runde {r} erreicht · {k} Bauern geschlagen',
    winInfo: 'Gesamtzeit {t}',
    tut1Title: 'IHR SEID BAUERN',
    tut1Text: 'Zieht Feld für Feld: Spieler 1 mit <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, Spieler 2 mit den <kbd>Pfeiltasten</kbd>. Angegriffen wird <b>automatisch</b>, sobald ein Gegner neben euch steht.',
    tut2Title: 'VORSTOSS',
    tut2Text: '<kbd>Shift</kbd>: zwei Felder nach vorn – dabei seid ihr unverwundbar und trefft alles auf dem Weg. Der Ring unter eurer Figur zeigt, wann er wieder bereit ist.',
    tut3Title: 'ROT = GEFAHR!',
    tut3Text: 'Bevor der König angreift, leuchtet der Boden <b>rot</b>. Sofort wegziehen! Wer getroffen wird, verliert ein Herz – der Bildschirm blitzt rot.',
    tut4Title: 'STEHLT SEINE MACHT',
    tut4Text: 'Besiegt den König und erbeutet seine Kraft als Fähigkeit (<kbd>Leertaste</kbd> / <kbd>Enter</kbd>). Drei Runden bis zum Schachmatt!',
    tutHint: 'Weiter: <kbd>Leertaste</kbd> / <kbd>Enter</kbd> &nbsp;·&nbsp; Überspringen: <kbd>Esc</kbd>',
    tutGo: 'Los geht\'s: <kbd>Leertaste</kbd> / <kbd>Enter</kbd> &nbsp;·&nbsp; Überspringen: <kbd>Esc</kbd>',
    // Runden-Titel und Fähigkeiten auf Deutsch kommen aus config.js
  },
  en: {
    loading: 'Loading pieces …',
    subtitle: 'Defeat the King. Steal his power.',
    player1: 'PLAYER 1',
    player2: 'PLAYER 2',
    ctrl1: 'Move <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><br>Dash <kbd>Left Shift</kbd><br>Skill <kbd>Space</kbd>',
    ctrl2: 'Move <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd><br>Dash <kbd>Right Shift</kbd><br>Skill <kbd>Enter</kbd>',
    pressStart: 'Press Space or Enter to start',
    titleHint: 'Pause: <kbd>Esc</kbd> &nbsp;·&nbsp; Sprache / Language: <kbd>L</kbd> <b>English</b>',
    pressRestart: 'Press Space or Enter to restart',
    gameoverTitle: 'DEFEATED',
    winTitle: 'CHECKMATE!',
    hudDash: 'Dash',
    hudSkill: 'Skill',
    menuTitle: 'CHOOSE YOUR POWER',
    menuHint: 'Player 1: <kbd>A</kbd> / <kbd>D</kbd> to choose, <kbd>Space</kbd> to confirm &nbsp;·&nbsp; Player 2: <kbd>←</kbd> / <kbd>→</kbd> to choose, <kbd>Enter</kbd> to confirm',
    pauseResume: 'Resume: <kbd>Esc</kbd> or <kbd>Space</kbd> / <kbd>Enter</kbd>',
    pauseTitle: 'Back to title: <kbd>M</kbd>',
    round: 'ROUND {n}',
    powerStolen: 'POWER STOLEN!',
    kingDefeated: 'KING DEFEATED!',
    gameoverInfo: 'Reached round {r} · {k} pawns defeated',
    winInfo: 'Total time {t}',
    tut1Title: 'YOU ARE PAWNS',
    tut1Text: 'Move square by square: Player 1 with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, Player 2 with the <kbd>arrow keys</kbd>. Attacks happen <b>automatically</b> when an enemy is next to you.',
    tut2Title: 'DASH',
    tut2Text: '<kbd>Shift</kbd>: two squares forward – you are invincible and hit everything in your path. The ring under your piece shows when it is ready again.',
    tut3Title: 'RED = DANGER!',
    tut3Text: 'Before the King attacks, the floor glows <b>red</b>. Move away now! Whoever gets hit loses a heart – the screen flashes red.',
    tut4Title: 'STEAL HIS POWER',
    tut4Text: 'Defeat the King and steal his power as a skill (<kbd>Space</kbd> / <kbd>Enter</kbd>). Three rounds to checkmate!',
    tutHint: 'Next: <kbd>Space</kbd> / <kbd>Enter</kbd> &nbsp;·&nbsp; Skip: <kbd>Esc</kbd>',
    tutGo: 'Let\'s go: <kbd>Space</kbd> / <kbd>Enter</kbd> &nbsp;·&nbsp; Skip: <kbd>Esc</kbd>',
    roundTitle1: 'THE KING RIDES',
    roundTitle2: 'THE KING CHARGES',
    roundTitle3: 'THE KING BLESSES',
    skill_lsprung_name: 'L-LEAP',
    skill_lsprung_text: 'Leaps in an L – the landing hits everything around',
    skill_sturmlauf_name: 'RAMPAGE',
    skill_sturmlauf_text: 'Charges straight to the edge and rams everything aside',
    skill_kreuzstrahl_name: 'CROSS BEAM',
    skill_kreuzstrahl_text: 'Four golden beams along both diagonals, piercing',
  },
};

// Gewählte Sprache merken (falls der Browser das erlaubt)
let lang = 'de';
try { lang = localStorage.getItem('bauer-lang') || 'de'; } catch (e) { /* egal */ }

export function getLang() { return lang; }
export function toggleLang() {
  lang = lang === 'de' ? 'en' : 'de';
  try { localStorage.setItem('bauer-lang', lang); } catch (e) { /* egal */ }
}

// Text holen: t('round', { n: 2 }) → "RUNDE 2" bzw. "ROUND 2"
export function t(key, vars = {}) {
  let s = TEXT[lang][key] ?? TEXT.de[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
// Gibt es diesen Text in der aktuellen Sprache?
export function has(key) { return key in TEXT[lang]; }

// Alle Elemente mit data-i18n="schlüssel" in der aktuellen Sprache füllen
export function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
}
