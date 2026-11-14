#!/bin/bash
# ============================================================
#  Spiel starten.command – Doppelklick startet das Spiel.
#  1. Startet einen kleinen Server (nötig, damit Chrome die .glb-Modelle laden darf)
#  2. Öffnet das Spiel in Chrome als eigenes Fenster im Vollbild
#  Beenden: Spiel mit Cmd + Q schließen, dann dieses Terminal-Fenster schließen.
# ============================================================

# In den Ordner wechseln, in dem diese Datei liegt (egal, von wo gestartet)
cd "$(dirname "$0")" || exit 1

# Ersten freien Port ab 8000 suchen (falls schon etwas auf 8000 läuft)
PORT=8000
while lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done
URL="http://localhost:$PORT"

echo "Starte Server auf $URL ..."
python3 server.py "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!

# Wenn dieses Fenster geschlossen wird, auch den Server beenden
trap 'kill $SERVER_PID 2>/dev/null' EXIT

# Warten, bis der Server antwortet (höchstens ca. 5 Sekunden)
for i in $(seq 1 50); do
  curl -s -o /dev/null "$URL" && break
  sleep 0.1
done

# Chrome als eigenes App-Fenster im Vollbild öffnen.
# Eigenes Profil im Temp-Ordner = sauberes Fenster ohne Tabs und Erweiterungen.
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args \
    --app="$URL" \
    --start-fullscreen \
    --user-data-dir="${TMPDIR:-/tmp/}bauer-aufstieg-chrome" \
    --no-first-run --no-default-browser-check \
    --autoplay-policy=no-user-gesture-required
else
  echo "Chrome nicht gefunden – öffne Standard-Browser."
  open "$URL"
fi

echo ""
echo "Das Spiel läuft. Dieses Fenster offen lassen!"
echo "Zum Beenden: Spiel mit Cmd + Q schließen und dieses Fenster schließen."
wait $SERVER_PID
