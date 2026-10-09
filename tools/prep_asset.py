"""Clean a generated transparent asset for compositing.

- Clears faint alpha residue (below LOW) and solidifies near-opaque pixels (above HIGH)
- Crops to the opaque bounding box with a small padding

Usage: python tools/prep_asset.py <in.png> <out.png> [--low 24] [--high 235] [--pad 8]
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--low", type=int, default=24)
    p.add_argument("--high", type=int, default=235)
    p.add_argument("--pad", type=int, default=8)
    a = p.parse_args()

    im = np.array(Image.open(a.src).convert("RGBA"))
    alpha = im[..., 3]
    alpha[alpha < a.low] = 0
    alpha[alpha > a.high] = 255
    im[..., 3] = alpha

    ys, xs = np.nonzero(alpha)
    if len(xs):
        h, w = alpha.shape
        x0, x1 = max(0, xs.min() - a.pad), min(w, xs.max() + 1 + a.pad)
        y0, y1 = max(0, ys.min() - a.pad), min(h, ys.max() + 1 + a.pad)
        im = im[y0:y1, x0:x1]

    Path(a.dst).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(im).save(a.dst)
    print(f"{a.dst} {im.shape[1]}x{im.shape[0]}")


if __name__ == "__main__":
    main()
