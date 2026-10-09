"""Local lyric timing editor. Run: python tools/lyric_editor/server.py  -> http://127.0.0.1:8765
Binds to localhost only. Saving writes data/lyrics.json + pv/public/lyrics.json (backup kept in data/backup/).
"""
import bisect
import json
import shutil
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
LYRICS = ROOT / "data" / "lyrics.json"
PUBLIC_LYRICS = ROOT / "pv" / "public" / "lyrics.json"
ANALYSIS = ROOT / "data" / "analysis.json"
FILES = {
    "/": (HERE / "index.html", "text/html; charset=utf-8"),
    "/audio": (ROOT / "assets" / "audio" / "netsu_ijou.mp4", "audio/mp4"),
    "/lyrics.json": (LYRICS, "application/json; charset=utf-8"),
    "/analysis.json": (ANALYSIS, "application/json; charset=utf-8"),
}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        entry = FILES.get(self.path.split("?")[0])
        if not entry:
            return self.send_error(404)
        path, ctype = entry
        data = path.read_bytes()
        # Range support so the audio element can seek
        rng = self.headers.get("Range")
        if rng and rng.startswith("bytes="):
            a, _, b = rng[6:].partition("-")
            start = int(a or 0)
            end = int(b) if b else len(data) - 1
            chunk = data[start:end + 1]
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{len(data)}")
        else:
            chunk = data
            self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(len(chunk)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(chunk)

    def do_POST(self):
        if self.path != "/save":
            return self.send_error(404)
        try:
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            doc = json.loads(LYRICS.read_text(encoding="utf-8"))
            beats = json.loads(ANALYSIS.read_text(encoding="utf-8"))["beats"]
            lines = sorted(body["lines"], key=lambda l: float(l["start"]))
            for i, l in enumerate(lines):
                l["i"] = i
                l["start"] = round(float(l["start"]), 3)
                l["end"] = round(float(lines[i + 1]["start"]), 3) if i + 1 < len(lines) else round(float(l.get("end", l["start"] + 2)), 3)
                l["beat"] = max(0, bisect.bisect_right(beats, l["start"] + 1e-3) - 1)
            doc["lines"] = lines
            backup = ROOT / "data" / "backup"
            backup.mkdir(exist_ok=True)
            shutil.copy(LYRICS, backup / f"lyrics_{time.strftime('%Y%m%d_%H%M%S')}.json")
            text = json.dumps(doc, ensure_ascii=False, indent=1)
            LYRICS.write_text(text, encoding="utf-8")
            PUBLIC_LYRICS.write_text(text, encoding="utf-8")
            out = json.dumps({"ok": True, "count": len(lines)}).encode()
            self.send_response(200)
        except Exception as e:  # report error to the UI instead of crashing
            out = json.dumps({"ok": False, "error": str(e)}).encode()
            self.send_response(500)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print("Lyric editor: http://127.0.0.1:8765")
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
