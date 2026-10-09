"""Re-proportion a full-body character cutout while keeping the head pixel-exact.

Head (hair top → chin) is untouched. Below the chin the body is scaled by `k`
(horizontally around the neck axis and vertically), and the leg segment
(skirt hem → shoe top) gets an extra vertical factor `l`. Scale changes are
eased over a short neck/shoulder zone so no seam appears.

Usage:
  python tools/reproportion.py in.png out.png --heads 6.0 --k 0.85 [--flip]
`--heads` is the target head count; `l` is solved from it.
"""
import argparse

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates


def landmarks(a):
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    op = al > 128
    H = a.shape[0]
    rows = lambda m: np.nonzero(m.any(1))[0]
    hair = op & (r > 200) & (g > 70) & (g < 170) & (b < 90)
    skin = op & (r > 225) & (g > 190) & (g < 235) & (b > 150) & (b < 215) & (r - b > 25)
    gray = op & (abs(r - g) < 14) & (abs(g - b) < 14) & (r > 90) & (r < 190)
    top = rows(hair).min()
    chin = rows(skin[: int(H * 0.3)]).max()
    bottom = rows(op).max()
    low = hair.copy()
    low[: int(H * 0.86)] = False
    shoe = rows(low).min()
    # skirt hem: bottom edge of the contiguous gray (skirt) block around its peak row.
    # Small gray bits further down (cable connectors) are ignored.
    mid = gray[:, a.shape[1] // 4 : 3 * a.shape[1] // 4]
    counts = mid.sum(1)
    peak = int(np.argmax(counts[: int(H * 0.75)]))
    hem = peak
    while hem + 1 < H and counts[hem + 1] > 25:
        hem += 1
    xs = np.nonzero(op[chin])[0]
    cx = (xs.min() + xs.max()) / 2
    return dict(top=top, chin=chin, hem=hem, shoe=shoe, bottom=bottom, cx=cx)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--heads", type=float, default=6.0)
    p.add_argument("--k", type=float, default=0.85)
    p.add_argument("--flip", action="store_true")
    o = p.parse_args()

    im = Image.open(o.src).convert("RGBA")
    if o.flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.array(im).astype(np.float32)
    L = landmarks(a.astype(np.uint8))
    head = L["chin"] - L["top"]
    torso = L["hem"] - L["chin"]
    legs = L["shoe"] - L["hem"]
    feet = L["bottom"] - L["shoe"]
    target = o.heads * head
    l = (target - head - o.k * (torso + feet)) / (o.k * legs)
    print(f"landmarks {L} head {head} -> solving l={l:.3f} (k={o.k})")

    H, W = a.shape[:2]
    ys = np.arange(H, dtype=np.float32)
    ease_end = L["chin"] + 0.35 * head

    def smooth(t):
        t = np.clip(t, 0, 1)
        return t * t * (3 - 2 * t)

    # vertical density (output px per source px) and horizontal scale per source row
    t_neck = smooth((ys - L["chin"]) / (ease_end - L["chin"]))
    sy = 1 + (o.k - 1) * t_neck
    sx = sy.copy()
    leg_t = smooth((ys - L["hem"]) / 30) * (1 - smooth((ys - L["shoe"]) / 30))
    sy = sy * (1 + (l - 1) * leg_t)

    # forward map source row -> output row, anchored at the hair top
    yo = np.concatenate([[0], np.cumsum(sy[:-1])])
    yo = yo - yo[L["top"]] + L["top"]
    out_h = int(np.ceil(yo[L["bottom"]])) + 4
    # place figure bottom at the same baseline as before, keep canvas size
    shift = round(L["bottom"] - yo[L["bottom"]])  # integer, so the head is copied without resampling
    yo = yo + shift

    out_y = np.arange(H, dtype=np.float32)
    src_y = np.interp(out_y, yo, ys, left=-1, right=H + 1)
    row_sx = np.interp(src_y, ys, sx)
    out_x = np.arange(W, dtype=np.float32)
    YY = np.repeat(src_y[:, None], W, 1)
    XX = L["cx"] + (out_x[None, :] - L["cx"]) / row_sx[:, None]

    # premultiplied resampling to avoid fringes
    alpha = a[..., 3:4] / 255.0
    pre = np.concatenate([a[..., :3] * alpha, alpha * 255], axis=2)
    res = np.stack([map_coordinates(pre[..., c], [YY, XX], order=1, cval=0) for c in range(4)], axis=2)
    al = res[..., 3:4]
    rgb = np.where(al > 0, res[..., :3] / np.maximum(al / 255.0, 1e-6), 0)
    outa = np.concatenate([rgb, al], axis=2).clip(0, 255).astype(np.uint8)
    # head (hair top → chin): paste the source pixels verbatim at the integer offset
    src8 = np.array(im)
    y0, y1 = 0, L["chin"] + 1
    outa[y0 + shift : y1 + shift] = src8[y0:y1]
    Image.fromarray(outa).save(o.dst)
    final_h = L["chin"] - L["top"]
    body = (np.nonzero((outa[..., 3] > 128).any(1))[0].max()) - (L["top"] + shift)
    print(f"result heads {body / final_h:.2f} (head kept {final_h}px)  saved {o.dst}")


if __name__ == "__main__":
    main()
