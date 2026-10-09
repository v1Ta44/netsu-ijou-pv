"""Cut an asset using a green-screen redraw from the image model as the mask.

The model redraws the image with the background replaced by flat #00FF00 (see .scratch/ai_key/prompt.txt).
Only its mask is used; the colors come from the original image, so faces stay pixel-exact.

Usage: python tools/ai_mask.py <original.png> <green.png> <out.png> [--grow 1]
"""
import argparse

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def main():
    p = argparse.ArgumentParser()
    p.add_argument("orig")
    p.add_argument("green")
    p.add_argument("dst")
    p.add_argument("--grow", type=int, default=1, help="dilate mask by N px to cover redraw drift at edges")
    a = p.parse_args()

    o = np.array(Image.open(a.orig).convert("RGB"))
    g = np.array(Image.open(a.green).convert("RGB").resize((o.shape[1], o.shape[0]), Image.LANCZOS)).astype(int)
    greenness = g[..., 1] - np.maximum(g[..., 0], g[..., 2])
    subj = greenness < 90
    subj = ndi.binary_opening(subj, iterations=1)
    lab, n = ndi.label(subj)
    if n > 1:
        area = ndi.sum(subj, lab, np.arange(1, n + 1))
        subj = np.isin(lab, 1 + np.nonzero(area >= 200)[0])
    if a.grow:
        subj = ndi.binary_dilation(subj, iterations=a.grow)
    # soft 1px edge
    alpha = ndi.gaussian_filter(subj.astype(np.float32), 0.7)
    alpha = np.where(ndi.binary_erosion(subj, iterations=1), 1.0, alpha)
    out = np.dstack([o, (alpha * 255).astype(np.uint8)])
    Image.fromarray(out, "RGBA").save(a.dst)
    print(f"{a.dst}: transparent {100 * (alpha == 0).mean():.1f}%")


if __name__ == "__main__":
    main()
