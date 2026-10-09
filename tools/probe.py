"""Render a contact sheet of PV frames at given song times.
Usage: python tools/probe.py OUT.png t1 t2 ... [--scale 0.5] [--cols 4]
"""
import json, subprocess, sys, shutil, tempfile
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PV = ROOT / "pv"

def main():
    args = sys.argv[1:]
    scale, cols = 0.5, 4
    if "--scale" in args:
        i = args.index("--scale"); scale = float(args[i + 1]); del args[i:i + 2]
    if "--cols" in args:
        i = args.index("--cols"); cols = int(args[i + 1]); del args[i:i + 2]
    out = Path(args[0]); times = [float(x) for x in args[1:]]
    tmp = Path(tempfile.mkdtemp(prefix="probe_", dir=ROOT / "pv" / "out"))
    props = tmp / "props.json"
    props.write_text(json.dumps({"times": times}))
    cmd = ["npx", "remotion", "render", "src/index.ts", "Probe", str(tmp / "f"), "--sequence",
           "--image-format=jpeg", "--gl=angle", f"--scale={scale}", f"--props={props}", "--log=error"]
    r = subprocess.run(cmd, cwd=PV, shell=True)
    if r.returncode: sys.exit(r.returncode)
    frames = sorted((tmp / "f").glob("*.jpeg"))
    ims = [Image.open(f) for f in frames]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w + (cols + 1) * 6, rows * (h + 22) + 6), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for k, (im, t) in enumerate(zip(ims, times)):
        x = 6 + (k % cols) * (w + 6); y = 6 + (k // cols) * (h + 22)
        sheet.paste(im, (x, y + 16)); d.text((x, y + 2), f"{t:.2f}s", fill=(230, 230, 230))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    shutil.rmtree(tmp, ignore_errors=True)
    print(out)

if __name__ == "__main__":
    main()
