import React from "react";
import { heatAt, WHITE } from "../lib/heat";
import { BEAT, BURST_C, LINES, rnd } from "../lib/time";
import { Char, Pic } from "../lib/world";
import { Log } from "../sys/sys";
import { A_LOG5 } from "./AG";
import { Particles } from "./art";
import { Render, Spec } from "./engine";
import { makeRun } from "./run";
import { crop, flat, full, place, PixText, stack, svg, thresh, tone, ui, word } from "./shots";

// C 爆発長句 1:06.5–1:28 (T2): one beat per cut, the line's anchor shot keeps returning.

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const L = (i: number) => LINES[i];

const rays = (bg: Render): Render =>
  stack(
    bg,
    svg((c) => {
      const n = 36;
      const r0 = 120;
      const k = 1 + c.lt * 3;
      return (
        <g stroke={WHITE} strokeWidth={3} opacity={0.85}>
          {Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2 + rnd(`${c.seed}ra`) * 0.2;
            const l = (500 + rnd(`${c.seed}r${i}`) * 900) * k;
            return <line key={i} x1={960 + Math.cos(a) * r0} y1={540 + Math.sin(a) * r0} x2={960 + Math.cos(a) * l} y2={540 + Math.sin(a) * l} />;
          })}
        </g>
      );
    }),
  );
const rings = (bg: Render): Render =>
  stack(
    bg,
    svg((c) => {
      // one ring per beat, expanding
      const ph = (c.t / BEAT) % 1;
      return (
        <g fill="none" stroke={ui(heatAt(c.t))} strokeWidth={3}>
          {[0, 1, 2, 3].map((i) => {
            const r = (i + ph) * 320;
            return <circle key={i} cx={960} cy={430} r={r} opacity={Math.max(0, 1 - (i + ph) / 4)} />;
          })}
        </g>
      );
    }),
  );
const tower = place("OBJ08", { h: [900, 1150], cx: [800, 1100], cy: [560, 620], bg: flat((h) => tone(h, 1)) });
const bell = crop("OBJ08", { u: [0.45, 0.55], v: [0.25, 0.32], z: [3, 5], bg: "#000" });
const desert = full("BG05", { z: [1.0, 1.2], py: [0.2, 0.6] });
const sand: Render = stack(crop("BG05", { v: [0.75, 0.9], z: [3, 5] }), svg((c) => <Particles seed="sand" t={c.t * 3} color={tone(heatAt(c.t), 4)} n={600} speed={-260} />));
const history: Render = (c) => {
  const heat = heatAt(c.t);
  const years = Array.from({ length: 16 }, (_, i) => {
    const y = 2026 - Math.floor(rnd(`${c.seed}y${i}`) * 4000);
    return `${String(y).padStart(5, " ")}  ${["創世", "契約", "洪水", "塔", "戦争", "記録", "沈黙", "灰"][i % 8]} ........ ${rnd(`${c.seed}o${i}`) < 0.3 ? "LOST" : "ok"}`;
  });
  return (
    <div style={{ ...abs, background: "#000" }}>
      {desert(c)}
      <div style={{ ...abs, background: "#000", opacity: 0.6 }} />
      <PixText x={120} y={110} size={48} color={ui(heat)} lines={years} lh={1.18} />
    </div>
  );
};
const logWall: Render = (c) => (
  <div style={abs}>
    {full("BG01b", { z: [1.0, 1.2] })(c)}
    <svg width={1920} height={1080} style={abs}>
      <Log t={c.t} t0={L(62).start - 6} lines={A_LOG5} x={120} y={160} ui={ui(heatAt(c.t))} max={22} size={36} div={2} garble={0.25} plate="#000" w={1100} />
    </svg>
  </div>
);
const tempBig: Render = (c) => (
  <div style={{ ...abs, background: "#000" }}>
    {full("BG07h", { z: [1.0, 1.2] })(c)}
    <div style={{ ...abs, background: "#000", opacity: 0.45 }} />
    <PixText x={960} y={330} size={288} color={WHITE} anchor="middle" lines={[c.p < 0.3 ? "41.2℃" : "52.0℃"]} />
  </div>
);
const rei2 = place("CH02", { h: [1000, 1250], cx: [800, 1200], cy: [620, 700], bg: full("BG07h", { z: [1.0, 1.15] }) });
// a single cold star in a near-black sky (C's star; H's cold-blue star sits at the same spot)
export const STAR_X = 1250;
export const STAR_Y = 300;
const sky: Render = (c) => (
  <div style={{ ...abs, background: "#020306" }}>
    <svg width={1920} height={1080} style={abs}>
      <circle cx={STAR_X} cy={STAR_Y} r={5} fill="#C9D3DC" style={{ filter: "drop-shadow(0 0 8px #C9D3DC)" }} />
      {Array.from({ length: 40 }, (_, i) => (
        <rect key={i} x={rnd(`sk${i}x`) * 1920} y={rnd(`sk${i}y`) * 900} width={2} height={2} fill="#5A6470" opacity={0.3 + 0.4 * Math.abs(Math.sin(c.t * 2 + i))} />
      ))}
    </svg>
  </div>
);
const lookUp: Render = (c) => (
  <div style={abs}>
    {sky(c)}
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${-30 * c.lt}px)` }}>
      <Char heat={0.05}>
        <Pic id="CH-F1" cx={600} cy={980} h={900} />
      </Char>
    </div>
  </div>
);

// the burst lands a beat before 哭いた閃光: image first, words after
const burst: Render = (c) => (
  <div style={{ ...abs, transform: `scale(${1.25 - 0.25 * Math.min(1, c.lt / 0.2)})` }}>{rays(full("CH-E2", { z: [1.0, 1.05] }))(c)}</div>
);

const SPECS: Spec[] = [
  { li: 57, at: BURST_C, fixed: true, m: [burst] },
  { li: 58, anchor: true, m: [full("CH-E1", { z: [1.0, 1.1] }), rays(crop("CH-E2", { z: [1.1, 1.6] })), rays(flat("#000")), crop("CH-E1", { u: [0.25, 0.75], v: [0.45, 0.55], z: [2.2, 3.2] })] },
  { li: 59, anchor: true, m: [rings(tower), bell, rings(flat("#000")), full("BG01", { z: [1, 1.2] })] },
  { li: 60, anchor: true, m: [desert, history, place("OBJ08", { h: [380, 500], cx: [1300, 1500], cy: 520, bg: desert }), word("歴史", { size: 520, bg: "#000" })] },
  { li: 61, anchor: true, m: [sand, desert, thresh(crop("BG05", { z: [2, 3] })), full("BG15", { z: [1, 1.4], pre: "brightness(0.55) contrast(1.4)" })] },
  { li: 62, anchor: true, m: [full("BG01b", { z: [1.0, 1.15] }), logWall, place("CH01", { h: [380, 520], cx: [1200, 1500], cy: 640, bg: full("BG01b", { z: [1, 1.1] }) })] },
  { li: 63, anchor: true, m: [rei2, tempBig, crop("CH02", { u: [0.45, 0.65], v: [0.12, 0.25], z: [2.4, 3.4] }), full("BG07h", { z: [1.1, 1.4] })] },
  { li: 64, anchor: true, m: [sky, crop("CH-E2", { z: [1.0, 1.4] }), full("BG06a", { z: [1, 1.2] })], fill: 0.1, ins: 0.08 },
  { li: 65, anchor: true, m: [lookUp, sky, crop("CH-E2", { z: [1.0, 1.3] })], fill: 0.08, ins: 0.05 },
  // the line resolves: cuts widen to 2 beats, then hold
  { li: 65, at: 86.2, m: [lookUp], div: 0.5, fill: 0, ins: 0, trans: 0 },
];

export const C = makeRun({
  name: "c",
  start: BURST_C,
  end: 87.54,
  tier: 2,
  pool: ["CH-E1", "CH-E2", "OBJ08", "BG05", "BG01b", "BG01", "CH02", "BG07h", "CH01", "BG06a", "OBJ16"],
  specs: SPECS,
  flashes: [{ t: BURST_C, frames: 2, kind: "white" }],
  hideLyric: (t) => t < LINES[58].start,
  lyric: (li) => (li >= 64 ? { allow: [0, 2, 8], ghosts: 0 } : undefined),
});

