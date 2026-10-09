"""Green-screen redraw (image model) for every transparent component, then mask the original with it.

Usage: python tools/ai_key_batch.py [--only ID,ID]
Writes .scratch/ai_key/<ID>.png (green redraw) and .scratch/ai_key/<ID>.cut.png (original pixels + alpha).
"""
import argparse
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from batch_gen import ITEMS, GEN, ROOT, raw_files  # noqa: E402

OUT = ROOT / ".scratch/ai_key"
PROMPT = (
    "Keep the subject of this image exactly as it is: same pose, same position, same size, same outline, same "
    "linework and colors, nothing added or removed. Replace ONLY the background (sky, ground, horizon, floor, any "
    "backdrop, and every gap between parts of the subject) with one completely flat pure green color #00FF00, edge "
    "to edge, with no gradient, no shadow, no ground line. The subject is: {subj}"
)
SUBJ = {"char": "the character only (her body, clothes, hair, ribbon, cables and anything she holds).",
        "world": "the single object only."}


def run(i, kind):
    src = raw_files(i)[0]
    if not (OUT / f"{i}.png").exists():
        w, h = Image.open(src).size
        pf = OUT / f"{i}.txt"
        pf.write_text(PROMPT.format(subj=SUBJ[kind]), encoding="utf-8")
        cmd = [sys.executable, str(GEN), "--prompt-file", str(pf), "--model", "gpt-image-2.5-sunburst",
               "--size", f"{w}x{h}", "--image", str(src), "--out-dir", str(OUT), "--name", i]
        for _ in range(2):
            if subprocess.run(cmd, capture_output=True, cwd=ROOT).returncode == 0 and (OUT / f"{i}.png").exists():
                break
    if not (OUT / f"{i}.png").exists():
        return f"{i}: FAIL"
    r = subprocess.run([sys.executable, str(ROOT / "tools/ai_mask.py"), str(src), str(OUT / f"{i}.png"),
                        str(OUT / f"{i}.cut.png"), "--grow", "0"], capture_output=True, text=True, cwd=ROOT)
    return r.stdout.strip() or r.stderr.strip()[-200:]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--only", default="")
    a = p.parse_args()
    only = set(filter(None, a.only.split(",")))
    OUT.mkdir(parents=True, exist_ok=True)
    items = [(i, k) for i, k, _, tr, *_ in ITEMS if tr and (not only or i in only)]
    with ThreadPoolExecutor(4) as ex:
        for res in ex.map(lambda t: run(*t), items):
            print(res, flush=True)


if __name__ == "__main__":
    main()
