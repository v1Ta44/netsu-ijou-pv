import React from "react";
import { BLUE, heatAt, WHITE } from "../lib/heat";
import { BURST_H, clamp, LINES, rnd } from "../lib/time";
import { Char, Pic } from "../lib/world";
import { Render, Spec } from "./engine";
import { LyricCopy } from "./lyrics";
import { makeRun } from "./run";
import { STAR_X, STAR_Y } from "./C";
import { crop, flat, full, place, split, stack, svg, tone, ui } from "./shots";

// H 爆発長句 3:06.5–3:27.5 (T2, hot). The only cold blue of the film is あなた (0101–0102).

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const L = (i: number) => LINES[i];

const dawn = full("BG08", { z: [1.0, 1.2], py: [0, 0.5] });
const cells = (bg: Render): Render =>
  stack(
    bg,
    svg((c) => (
      <g>
        {Array.from({ length: 30 }, (_, i) => {
          const t0 = rnd(`ce${i}t`) * 2;
          const a = c.t - L(95).start - t0;
          if (a < 0) return null;
          const x = 200 + rnd(`ce${i}x`) * 1520;
          const y = Math.min(640, 80 + a * a * 900);
          const hit = y >= 640;
          const r = hit ? 6 + (a - Math.sqrt(560 / 900)) * 260 : 10;
          return <circle key={i} cx={x} cy={y} r={Math.max(4, r)} fill={hit ? "none" : WHITE} stroke={WHITE} strokeWidth={2} opacity={hit ? Math.max(0, 1 - r / 260) : 0.9} />;
        })}
      </g>
    )),
  );
const swallow = (id: string) => place(id, { w: [500, 900], cx: [500, 1400], cy: [300, 600], rot: [-20, 20], bg: full("BG08", { z: [1, 1.1] }) });
const trail = (bg: Render): Render =>
  stack(
    bg,
    svg((c) => {
      const pts = (k: number) =>
        Array.from({ length: 40 }, (_, i) => {
          const u = i / 39;
          return `${u * 2000 - 40},${300 + k * 140 + Math.sin(u * 6 + k * 2) * 160}`;
        });
      const eaten = clamp((c.t - L(98).start) / (L(99).start - L(98).start));
      return (
        <g fill="none" stroke={ui(heatAt(c.t))} strokeWidth={3}>
          {[0, 1, 2].map((k) => (
            <polyline key={k} points={pts(k).slice(Math.floor(eaten * 40)).join(" ")} strokeDasharray="14 10" />
          ))}
        </g>
      );
    }),
  );
const clouds = full("BG09", { z: [1.0, 1.3], px: [-0.5, 0.5] });
const medal = place("OBJ11", { h: [800, 1000], cx: [800, 1100], cy: 540, bg: flat((h) => tone(h, 1)) });
const medalSliced: Render = (c) => {
  const n = 8;
  return (
    <div style={{ ...abs, background: "#000" }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ ...abs, clipPath: `inset(0 ${1920 - ((i + 1) * 1920) / n}px 0 ${(i * 1920) / n}px)`, transform: `translateY(${(rnd(`${c.seed}m${i}`) - 0.5) * 300 * (0.3 + c.p)}px)` }}>
          {medal(c)}
        </div>
      ))}
    </div>
  );
};
const dirty = place("CH-H2b", { w: [1300, 1700], cx: 960, cy: [560, 680], bg: flat((h) => tone(h, 1)) });
const stains = (bg: Render): Render =>
  stack(
    bg,
    svg((c) => (
      <g fill="#000">
        {Array.from({ length: 4 + Math.floor((c.t - L(100).start) * 8) }, (_, i) => (
          <rect key={i} x={500 + rnd(`st${i}x`) * 900} y={300 + rnd(`st${i}y`) * 500} width={20 + rnd(`st${i}w`) * 120} height={20 + rnd(`st${i}h`) * 80} opacity={0.85} />
        ))}
      </g>
    )),
  );
// cold blue: the other person, graded cold regardless of the hot section
const anata = place("OBJ12", { h: [900, 1100], cx: [900, 1100], cy: 560, bg: flat("#06121E"), heat: 0 });
const anataEye = crop("OBJ12", { u: [0.12, 0.3], v: [0.38, 0.42], z: [2.4, 3.4], bg: "#06121E", heat: 0 });
const blueStar: Render = (c) => (
  <div style={{ ...abs, background: "#020409" }}>
    <svg width={1920} height={1080} style={abs}>
      <circle cx={STAR_X} cy={STAR_Y} r={6 + c.lt * 2} fill={BLUE} style={{ filter: `drop-shadow(0 0 12px ${BLUE}) drop-shadow(0 0 30px ${BLUE})` }} />
    </svg>
  </div>
);
const lookUpBlue: Render = (c) => (
  <div style={abs}>
    {blueStar(c)}
    <div style={{ ...abs, transform: `translateY(${-30 * c.lt}px)` }}>
      <Char heat={0.05}>
        <Pic id="CH-F1" cx={600} cy={980} h={900} />
      </Char>
    </div>
  </div>
);

const burst: Render = (c) => (
  <div style={{ ...abs, transform: `scale(${1.25 - 0.25 * Math.min(1, c.lt / 0.2)})` }}>{cells(dawn)(c)}</div>
);

const SPECS: Spec[] = [
  { li: 94, at: BURST_H, fixed: true, m: [burst] },
  { li: 95, anchor: true, m: [cells(dawn), crop("BG08", { z: [2, 3] }), cells(flat("#000")), dawn] },
  { li: 96, anchor: true, m: [place("CH-F1", { h: [1000, 1250], cx: [900, 1200], cy: 560, bg: dawn }), dawn, full("OBJ16", { z: [1, 1.3] })] },
  { li: 97, anchor: true, m: [trail(swallow("OBJ10a")), swallow("OBJ10b"), trail(swallow("OBJ10c")), split([swallow("OBJ10a"), swallow("OBJ10b"), swallow("OBJ10c")])] },
  { li: 98, anchor: true, m: [trail(clouds), clouds, swallow("OBJ10c"), full("BG11", { z: [1, 1.2] })] },
  { li: 99, anchor: true, m: [medal, medalSliced, crop("OBJ11", { v: [0.65, 0.85], z: [2.2, 3.2], bg: "#000" }), medalSliced] },
  { li: 100, anchor: true, m: [stains(dirty), crop("CH-H2b", { z: [1.8, 2.8] }), stains(flat((h) => tone(h, 3)))] },
  { li: 101, anchor: true, m: [anata, anataEye, blueStar], fill: 0.05, ins: 0.05 },
  { li: 102, anchor: true, m: [lookUpBlue, blueStar, anata], fill: 0.05, ins: 0.05 },
  { li: 102, at: 206.3, m: [lookUpBlue], div: 0.5, fill: 0, ins: 0, trans: 0 },
];

export const H = makeRun({
  name: "h",
  start: BURST_H,
  lyricFrom: 95,
  end: 207.526,
  tier: 2,
  pool: ["BG08", "BG09", "CH-F1", "OBJ10a", "OBJ11", "CH-H2b", "BG07h", "OBJ16", "BG11", "OBJ19"],
  specs: SPECS,
  flashes: [{ t: BURST_H, frames: 3, kind: "white" }],
  lyric: (li) => (li >= 101 ? { allow: [0, 2, 8], ghosts: 0 } : undefined),
  // 世迷言がへばりつく: the previous line sticks to the frame edges and piles up
  overlay: (t) => {
    if (t < L(96).start || t >= L(97).start) return null;
    const n = 1 + Math.floor((t - L(96).start) / 0.33);
    const txt = L(95).text;
    const edge = (i: number) => {
      const s = i % 4;
      const u = rnd(`yk${i}`);
      return s === 0 ? { x: 200 + u * 1500, y: 70, r: 0 } : s === 1 ? { x: 200 + u * 1500, y: 1010, r: 180 } : s === 2 ? { x: 60, y: 140 + u * 800, r: -90 } : { x: 1860, y: 140 + u * 800, r: 90 };
    };
    return (
      <div style={abs}>
        {Array.from({ length: n }, (_, i) => {
          const e = edge(i);
          return <LyricCopy key={i} text={txt} x={e.x} y={e.y} size={48 + Math.floor(rnd(`ys${i}`) * 3) * 12} rot={e.r} opacity={0.5 + rnd(`yo${i}`) * 0.4} />;
        })}
      </div>
    );
  },
});
