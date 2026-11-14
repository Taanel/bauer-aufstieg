# ============================================================
#  server.py – kleiner lokaler Webserver für das Spiel.
#  Wie "python3 -m http.server", aber:
#   - der Browser speichert nichts zwischen (man sieht sofort den neuen Stand)
#   - verkraftet viele gleichzeitige Anfragen (sonst kam manchmal eine
#     Programmdatei leer an und das Spiel blieb bei "Lade Figuren …" hängen)
#  Start:  python3 server.py 8000
# ============================================================
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    # HTTP/1.1: der Browser darf eine Verbindung für mehrere Dateien benutzen
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        # Browser: bitte nichts zwischenspeichern
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, *args):
        pass  # keine Ausgabe für jede einzelne Datei


class GameServer(ThreadingHTTPServer):
    request_queue_size = 128   # viele Anfragen gleichzeitig annehmen (Standard ist nur 5)
    daemon_threads = True      # beim Beenden nicht auf offene Verbindungen warten

    def handle_error(self, request, client_address):
        pass  # abgebrochene Verbindungen (z. B. Seite neu geladen) sind kein Problem


# Immer den Ordner ausliefern, in dem diese Datei liegt (egal, von wo gestartet)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f"Spiel läuft auf http://localhost:{port}  (Beenden: Ctrl + C)")
GameServer(("", port), NoCacheHandler).serve_forever()
