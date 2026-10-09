import React from "react";
import { rnd } from "../lib/time";

// Procedural vector shapes for the narrator layer.

type Seg = { x1: number; y1: number; x2: number; y2: number; d: number; order: number; w: number };

// Branching growth (veins, cracks). Returns segments with a growth order.
export const branches = (x: number, y: number, ang: number, len: number, depth: number, seed: string): Seg[] => {
  const out: Seg[] = [];
  const grow = (x: number, y: number, a: number, l: number, d: number, order: number, s: string) => {
    if (d <= 0 || l < 4) return;
    let cx = x;
    let cy = y;
    const n = 3;
    for (let i = 0; i < n; i++) {
      const aa = a + (rnd(`${s}a${i}`) - 0.5) * 0.9;
      const nx = cx + Math.cos(aa) * (l / n);
      const ny = cy + Math.sin(aa) * (l / n);
      out.push({ x1: cx, y1: cy, x2: nx, y2: ny, d, order: order + i, w: d });
      cx = nx;
      cy = ny;
    }
    const kids = rnd(`${s}k`) < 0.5 ? 2 : 3;
    for (let k = 0; k < kids; k++) grow(cx, cy, a + (rnd(`${s}b${k}`) - 0.5) * 1.6, l * (0.55 + rnd(`${s}l${k}`) * 0.25), d - 1, order + n, `${s}${k}`);
  };
  grow(x, y, ang, len, depth, 0, seed);
  return out;
};

export const Branches: React.FC<{ segs: Seg[]; grow: number; color: string; width?: number; opacity?: number }> = ({ segs, grow, color, width = 1.4, opacity = 1 }) => {
  const max = Math.max(...segs.map((s) => s.order)) + 1;
  return (
    <g stroke={color} strokeLinecap="round" opacity={opacity}>
      {segs
        .filter((s) => s.order < grow * max)
        .map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={width * (0.5 + s.w * 0.5)} />
        ))}
    </g>
  );
};

// Zigzag polyline between two points (lightning, tears).
export const zigzag = (x0: number, y0: number, x1: number, y1: number, n: number, amp: number, seed: string): [number, number][] => {
  const pts: [number, number][] = [];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy);
  const nx = -dy / L;
  const ny = dx / L;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const o = i === 0 || i === n ? 0 : (rnd(`${seed}${i}`) * 2 - 1) * amp;
    pts.push([x0 + dx * u + nx * o, y0 + dy * u + ny * o]);
  }
  return pts;
};
export const ptsStr = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// Random triangle shards covering a box (for shattering an image).
export const shards = (w: number, h: number, nx: number, ny: number, seed: string) => {
  const P: [number, number][][] = [];
  for (let j = 0; j <= ny; j++) {
    P[j] = [];
    for (let i = 0; i <= nx; i++) {
      const edgeX = i === 0 || i === nx;
      const edgeY = j === 0 || j === ny;
      P[j][i] = [
        (i / nx) * w + (edgeX ? 0 : (rnd(`${seed}x${i}${j}`) - 0.5) * (w / nx) * 0.7),
        (j / ny) * h + (edgeY ? 0 : (rnd(`${seed}y${i}${j}`) - 0.5) * (h / ny) * 0.7),
      ];
    }
  }
  const tris: [number, number][][] = [];
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i + 1], d = P[j + 1][i];
      if (rnd(`${seed}f${i}${j}`) < 0.5) tris.push([a, b, c], [a, c, d]);
      else tris.push([a, b, d], [b, c, d]);
    }
  return tris;
};
