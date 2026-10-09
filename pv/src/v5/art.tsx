import React from "react";
import { PIX } from "../lib/heat";
import { rnd } from "../lib/time";

// Vector pieces used inside shots (frame coordinates 1920×1080).

const R = (s: string) => rnd(s);

// Lightning crack: jagged polyline with branches. `grow` 0..1 reveals it top-down.
export const Bolt: React.FC<{ seed: string; color: string; width?: number; grow?: number; glow?: string }> = ({ seed, color, width = 7, grow = 1, glow }) => {
  const pts: [number, number][] = [];
  let x = 300 + R(`${seed}x0`) * 1320;
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const y = -40 + (i / n) * 1160;
    x += (R(`${seed}dx${i}`) - 0.5) * 300;
    pts.push([x, y]);
  }
  const m = Math.max(2, Math.ceil(grow * pts.length));
  const main = pts.slice(0, m);
  const branches = [3, 6, 9]
    .filter((i) => i < m - 1)
    .map((i) => {
      const [bx, by] = pts[i];
      const dir = R(`${seed}bd${i}`) < 0.5 ? -1 : 1;
      const b: [number, number][] = [[bx, by]];
      for (let k = 1; k <= 4; k++) b.push([bx + dir * k * (50 + R(`${seed}bk${i}${k}`) * 60), by + k * (40 + R(`${seed}bj${i}${k}`) * 40)]);
      return b;
    });
  const path = (p: [number, number][]) => p.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(0)} ${b.toFixed(0)}`).join(" ");
  return (
    <g fill="none" strokeLinejoin="miter" style={glow ? { filter: `drop-shadow(0 0 10px ${glow}) drop-shadow(0 0 30px ${glow})` } : undefined}>
      <path d={path(main)} stroke={color} strokeWidth={width} />
      {branches.map((b, i) => (
        <path key={i} d={path(b)} stroke={color} strokeWidth={width * 0.45} />
      ))}
    </g>
  );
};

// Branching veins growing from a root. grow 0..1.
export const Veins: React.FC<{ seed: string; x: number; y: number; color: string; grow: number; scale?: number; width?: number }> = ({ seed, x, y, color, grow, scale = 1, width = 3 }) => {
  const segs: React.ReactNode[] = [];
  const walk = (px: number, py: number, ang: number, depth: number, id: string, life: number) => {
    if (depth > 5 || life <= 0) return;
    const len = (60 + R(`${id}l`) * 90) * scale * (1 - depth * 0.1);
    const a = ang + (R(`${id}a`) - 0.5) * 0.9;
    const f = Math.min(1, life);
    const nx = px + Math.cos(a) * len * f;
    const ny = py + Math.sin(a) * len * f;
    segs.push(<line key={id} x1={px} y1={py} x2={nx} y2={ny} stroke={color} strokeWidth={Math.max(1, width * (1 - depth * 0.16))} strokeLinecap="round" />);
    if (life < 1) return;
    walk(nx, ny, a, depth + 1, `${id}a`, life - 1);
    if (R(`${id}b`) < 0.65) walk(nx, ny, a + (R(`${id}s`) < 0.5 ? -0.8 : 0.8), depth + 1, `${id}b`, life - 1.2);
  };
  for (let r = 0; r < 4; r++) walk(x, y, -Math.PI / 2 + (r - 1.5) * 0.9 + (R(`${seed}r${r}`) - 0.5), 0, `${seed}${r}`, grow * 6);
  return <g>{segs}</g>;
};

// Dense dot particles rising.
export const Particles: React.FC<{ seed: string; t: number; color: string; n?: number; speed?: number }> = ({ seed, t, color, n = 260, speed = 60 }) => (
  <g fill={color}>
    {Array.from({ length: n }, (_, i) => {
      const x = R(`${seed}px${i}`) * 1920;
      const y = (((R(`${seed}py${i}`) * 1200 - t * speed * (0.5 + R(`${seed}ps${i}`))) % 1200) + 1200) % 1200 - 60;
      const s = 2 + Math.floor(R(`${seed}pr${i}`) ** 3 * 8);
      return <rect key={i} x={x} y={y} width={s} height={s} opacity={0.3 + R(`${seed}po${i}`) * 0.7} />;
    })}
  </g>
);

// Rectangular tunnel: nested frames toward a vanishing point; `z` advances them toward camera.
export const Tunnel: React.FC<{ z: number; color: string; n?: number; vx?: number; vy?: number; width?: number }> = ({ z, color, n = 10, vx = 960, vy = 540, width = 2 }) => (
  <g fill="none" stroke={color} strokeWidth={width}>
    {Array.from({ length: n }, (_, i) => {
      const d = ((i + (z % 1)) / n) ** 2.2;
      const w = 40 + d * 2600;
      const h = w * 0.5625;
      return <rect key={i} x={vx - w / 2} y={vy - h / 2} width={w} height={h} opacity={0.25 + d * 0.75} />;
    })}
    {[
      [0, 0],
      [1920, 0],
      [0, 1080],
      [1920, 1080],
    ].map(([x, y], i) => (
      <line key={`l${i}`} x1={vx} y1={vy} x2={x} y2={y} opacity={0.5} />
    ))}
  </g>
);

// System dialog box in pixel font.
export const Dialog: React.FC<{ x: number; y: number; w: number; title: string; lines: string[]; fg: string; bg: string }> = ({ x, y, w, title, lines, fg, bg }) => {
  const lh = 48;
  const h = 72 + lines.length * lh + 24;
  return (
    <g fontFamily={PIX}>
      <rect x={x + 12} y={y + 12} width={w} height={h} fill="#000" opacity={0.7} />
      <rect x={x} y={y} width={w} height={h} fill={bg} stroke={fg} strokeWidth={4} />
      <rect x={x} y={y} width={w} height={48} fill={fg} />
      <text x={x + 18} y={y + 36} fontSize={36} fill={bg}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={i} x={x + 24} y={y + 72 + 36 + i * lh} fontSize={36} fill={fg} style={{ whiteSpace: "pre" }}>
          {l}
        </text>
      ))}
    </g>
  );
};

// Spiky audio burst waveform, centered.
export const Burst: React.FC<{ seed: string; t: number; y: number; amp: number; color: string; x0?: number; x1?: number; n?: number; width?: number }> = ({
  seed,
  t,
  y,
  amp,
  color,
  x0 = 0,
  x1 = 1920,
  n = 220,
  width = 3,
}) => {
  const f = Math.floor(t * 30);
  return (
    <g stroke={color} strokeWidth={width}>
      {Array.from({ length: n }, (_, i) => {
        const u = i / (n - 1);
        const env = Math.sin(Math.PI * u) ** 0.5;
        const a = (0.15 + R(`${seed}${f}:${i}`) ** 1.5) * amp * env;
        const x = x0 + (x1 - x0) * u;
        return <line key={i} x1={x} y1={y - a} x2={x} y2={y + a} />;
      })}
    </g>
  );
};
