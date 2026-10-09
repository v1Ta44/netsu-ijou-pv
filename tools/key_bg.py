"""Cut a plain-background generated asset to a transparent PNG.

Background is grown only through smooth regions: any color step larger than STEP
(linework, fabric edges) or any pixel far from the background color is a barrier.
This keeps near-white clothing that runs off the frame edge, which a plain
color-distance key would swallow.

- Border-touching smooth regions whose median color is close to the background -> background
- Enclosed smooth regions that are flat and background-colored (gaps between arm and body) -> background
- Pixels on the subject edge get a soft alpha from their distance to the background color

Usage: python tools/key_bg.py <in.png> <out.png> [--step 8] [--far 40] [--near 10] [--fit] [--no-pockets] [--report]
"""
import argparse

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def fit_background(rgb, iters=4, tol=12):
    """Robust quadratic surface fit per channel over border pixels (for vignetted / gradient backgrounds)."""
    H, W, _ = rgb.shape
    m = np.zeros((H, W), bool)
    b = 6
    m[:b], m[-b:], m[:, :b], m[:, -b:] = True, True, True, True
    ys, xs = np.nonzero(m)
    u, v = xs / W - 0.5, ys / H - 0.5
    A = np.stack([np.ones_like(u), u, v, u * u, v * v, u * v], 1)
    vals = rgb[ys, xs].astype(np.float64)
    keep = np.ones(len(ys), bool)
    for _ in range(iters):
        coef = np.linalg.lstsq(A[keep], vals[keep], rcond=None)[0]
        res = np.abs(A @ coef - vals).max(1)
        keep = res < tol
    gy, gx = np.mgrid[0:H, 0:W]
    gu, gv = gx / W - 0.5, gy / H - 0.5
    G = np.stack([np.ones_like(gu), gu, gv, gu * gu, gv * gv, gu * gv], -1)
    return G @ coef, keep.mean()


def cut(src, dst, step=8, far=40, near=10, report=False, fit=False, pockets=True):
    rgb = np.array(Image.open(src).convert("RGB")).astype(np.int16)
    H, W, _ = rgb.shape
    k = 24
    corners = np.concatenate([rgb[:k, :k].reshape(-1, 3), rgb[:k, -k:].reshape(-1, 3),
                              rgb[-k:, :k].reshape(-1, 3), rgb[-k:, -k:].reshape(-1, 3)])
    bg = np.median(corners, 0)
    if fit:
        surf, inlier = fit_background(rgb)
        dist = np.abs(rgb - surf).max(-1)
        if report:
            print(f"  background fit: {100 * inlier:.0f}% border inliers")
    else:
        dist = np.abs(rgb - bg).max(-1)

    # largest color step to any 4-neighbour
    s = np.zeros((H, W), np.int16)
    dx = np.abs(rgb[:, 1:] - rgb[:, :-1]).max(-1)
    dy = np.abs(rgb[1:] - rgb[:-1]).max(-1)
    s[:, 1:] = np.maximum(s[:, 1:], dx)
    s[:, :-1] = np.maximum(s[:, :-1], dx)
    s[1:] = np.maximum(s[1:], dy)
    s[:-1] = np.maximum(s[:-1], dy)

    barrier = (s > step) | (dist > far)
    lab, n = ndi.label(~barrier)
    idx = np.arange(1, n + 1)
    area = ndi.sum(np.ones_like(lab), lab, idx)
    med = ndi.median(dist, lab, idx)
    p95 = np.array([0.0] * n)
    border_ids = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}

    is_bg = np.zeros(n + 1, bool)
    for i in idx:
        if i in border_ids:
            is_bg[i] = med[i - 1] <= near
        elif pockets and area[i - 1] > 2000 and med[i - 1] <= 4:
            # enclosed: only very flat background-colored pockets
            vals = dist[lab == i]
            p95[i - 1] = np.percentile(vals, 95)
            is_bg[i] = p95[i - 1] <= 7
    bgmask = is_bg[lab]

    subj = ~bgmask
    # drop tiny specks left in the background
    sl, sn = ndi.label(subj)
    if sn > 1:
        sa = ndi.sum(subj, sl, np.arange(1, sn + 1))
        keep = np.zeros(sn + 1, bool)
        keep[1:] = sa >= 150
        subj = keep[sl]

    alpha = subj.astype(np.float32)
    edge = subj & ndi.binary_dilation(~subj, iterations=1)
    alpha[edge] = np.clip(dist[edge] / 45.0, 0.0, 1.0)

    out = np.dstack([rgb.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
    Image.fromarray(out, "RGBA").save(dst)
    if report:
        kept_border = [(int(i), int(area[i - 1]), float(med[i - 1])) for i in sorted(border_ids) if not is_bg[i] and area[i - 1] > 500]
        print(f"{dst}: bg={bg.astype(int).tolist()} transparent {100 * (alpha == 0).mean():.1f}%  "
              f"kept border regions (id, area, medDist): {kept_border[:8]}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--step", type=int, default=8)
    p.add_argument("--far", type=int, default=40)
    p.add_argument("--near", type=int, default=10)
    p.add_argument("--report", action="store_true")
    p.add_argument("--fit", action="store_true", help="fit a gradient background instead of one flat color")
    p.add_argument("--no-pockets", action="store_true", help="never clear enclosed regions (subject fill ~ background color)")
    a = p.parse_args()
    cut(a.src, a.dst, a.step, a.far, a.near, a.report, a.fit, not a.no_pockets)
