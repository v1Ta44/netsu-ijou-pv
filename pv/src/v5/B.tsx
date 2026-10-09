import React from "react";
import { heatAt, RED, WHITE } from "../lib/heat";
import { BURST_C, clamp, LINES, prog, rnd } from "../lib/time";
import { Light, picSize } from "../lib/world";
import { BlackStar, Target, Wave } from "../sys/sys";
import { Bolt, Burst, Dialog, Particles, Tunnel, Veins } from "./art";
import { Ctx, Render, Spec } from "./engine";
import { BLACK } from "./filler";
import { LyricCopy } from "./lyrics";
import { makeRun } from "./run";
import { crop, flat, full, inv, place, PixText, plate, sil, split, stack, svg, thresh, tone, ui } from "./shots";

// B 疾走 0:22–1:06.5 (T1). B′ rest 43.0–44.23 holds one still frame.

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const REST = 43.0;
const L = (i: number) => LINES[i];

// ---------------- first half: 電撃 … なにかが来ている ----------------
const eye = crop("CH-E1", { u: [0.3, 0.7], v: [0.42, 0.58], z: [1.6, 3.2] });
const eye2 = crop("CH-E2", { u: [0.35, 0.55], v: [0.4, 0.6], z: [1.2, 2.4] });
const bolt = (bg: Render): Render => stack(bg, svg((c) => <Bolt seed={c.seed} color={WHITE} grow={clamp(0.4 + c.p * 1.5)} glow={ui(heatAt(c.t))} />));
const veins = (bg: Render): Render =>
  stack(bg, svg((c) => <Veins seed={`v${c.li}${c.j % 3}`} x={rnd(`${c.seed}vx`) * 1200 + 360} y={760 + rnd(`${c.seed}vy`) * 200} color={RED} grow={clamp(0.35 + (c.t - L(5).start) / 1.4)} scale={1.6} width={5} />));
const smokeOverRuins: Render = (c) => (
  <div style={abs}>
    {full("BG01", { z: [1.05, 1.3] })(c)}
    <div style={{ ...abs, opacity: 0.7, mixBlendMode: "screen" }}>{full("BG02", { z: [1.2, 1.8] })({ ...c, seed: `${c.seed}s` })}</div>
  </div>
);
const particles: Render = stack(flat((h) => tone(h, 1)), svg((c) => <Particles seed="pt" t={c.t} color={tone(heatAt(c.t), 4)} n={340} speed={140} />));
const sickleSil = (w: [number, number]) => sil("OBJ01", { color: "#000", bg: (h) => tone(h, 3), w, cx: [700, 1200], cy: [420, 660], rot: [-30, 30] });
const chaser = full("OBJ20", { z: [1.0, 1.5], px: [-0.4, 0.4], py: [-0.2, 0.3] });

const DELETED = ["CH-E1", "CH-N1", "BG02", "OBJ01", "BG01", "CH03", "CH-F1", "BG07"];
const erase: Render = (c) => {
  const id = DELETED[c.rep % DELETED.length];
  const heat = heatAt(c.t);
  const w = clamp(c.p * 1.4) * 1920;
  return (
    <div style={abs}>
      {crop(id, { z: [1.1, 1.8] })(c)}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: w, background: "#000" }} />
      <PixText x={96} y={150} size={36} color={ui(heat)} lines={[`> rm -f /mem/${id.toLowerCase()}.${String(c.rep).padStart(2, "0")}`, w > 960 ? "  deleted." : "  deleting..."]} bg="#000" />
    </div>
  );
};
const dialog: Render = (c) => {
  const heat = heatAt(c.t);
  return (
    <div style={{ ...abs, background: plate(heat) }}>
      {crop(DELETED[(c.rep + 3) % DELETED.length], { z: [1.2, 2] })(c)}
      <div style={{ ...abs, background: "#000", opacity: 0.55 }} />
      <svg width={1920} height={1080} style={abs}>
        <Dialog x={360 + rnd(`${c.seed}dx`) * 400} y={300 + rnd(`${c.seed}dy`) * 200} w={780} title={` memory[${c.rep}]`} lines={["DELETE? [Y/n]", "> Y", c.p > 0.5 ? "ERR: still here" : "..."]} fg={ui(heat)} bg={plate(heat)} />
      </svg>
    </div>
  );
};
const erased: Render = (c) => inv(crop(DELETED[(c.rep + 5) % DELETED.length], { z: [1.5, 3] }))(c);
const returned: Render[] = DELETED.map((id, i) => (c: Ctx) => (i % 2 ? inv(crop(id, { z: [1, 1.6] })) : crop(id, { z: [1, 1.6] }))(c));

const throat = crop("CH-F1", { u: [0.4, 0.55], v: [0.72, 0.85], z: [2, 3] });
const mouth = crop("CH-M1", { u: [0.3, 0.5], v: [0.3, 0.6], z: [1.1, 1.8] });
const flatWave: Render = (c) => (
  <div style={abs}>
    {place("CH-F1", { h: [900, 1100], cx: [1200, 1500], cy: 560 })(c)}
    {svg((cc) => <Wave x0={0} x1={1920} y={600} amp={4} t={cc.t} color={WHITE} sharp={0} />)(c)}
  </div>
);
const scream = (bg: Render): Render => stack(bg, svg((c) => <Burst seed={c.seed} t={c.t} y={540 + (rnd(`${c.seed}by`) - 0.5) * 300} amp={160 + 300 * c.p} color={WHITE} width={4} />));

const chairRoom = place("OBJ02", { h: [560, 760], cx: [700, 1200], cy: [560, 640], bg: full("BG03", { z: [1.0, 1.15] }) });
const chairSil = sil("OBJ02", { color: "#000", bg: (h) => tone(h, 3), w: [600, 900], cx: [800, 1100], cy: 560 });
const moon: Render = (c) => {
  const heat = heatAt(c.t);
  return (
    <div style={{ ...abs, background: tone(heat, 0) }}>
      <Light id="OBJ03" heat={heat} cx={700 + rnd(`${c.seed}mx`) * 520} cy={420 + rnd(`${c.seed}my`) * 240} w={380 + rnd(`${c.seed}mw`) * 520} glow={1.6} />
    </div>
  );
};
const moonRot = thresh(crop("OBJ03", { z: [2, 3.5], bg: "#000" }));

const closer = (c: Ctx) => {
  const k = c.rep;
  const heat = heatAt(c.t);
  const w = 260 * 1.42 ** k;
  const [, ph] = picSize("OBJ01", w);
  return (
    <div style={{ ...abs, background: tone(heat, 3) }}>
      <svg width={1920} height={1080} style={abs}>
        <Tunnel z={k * 0.5 + c.lt * 2} color="#000" />
      </svg>
      {sil("OBJ01", { color: "#000", bg: "transparent", w, cx: 960 + (rnd(`${c.seed}x`) - 0.5) * 80, cy: 540 + ph * 0.05, rot: [-12, 12] })(c)}
    </div>
  );
};
const corridor: Render = (c) => full("BG13", { z: [1 + c.rep * 0.25, 1.1 + c.rep * 0.3], px: [-0.1, 0.1], py: [-0.1, 0.1] })(c);
const distance: Render = (c) => {
  const heat = heatAt(c.t);
  return (
    <div style={{ ...abs, background: "#000" }}>
      <PixText x={960} y={300} size={288} color={ui(heat)} anchor="middle" lines={[`-${8 - c.rep}m`]} />
      <PixText x={960} y={700} size={48} color={ui(heat)} anchor="middle" lines={[`${"■".repeat(c.rep + 1)}${"□".repeat(7 - c.rep)}`]} />
    </div>
  );
};
const noSignal: Render = (c) => (
  <div style={{ ...abs, background: "#000" }}>
    <PixText x={960} y={540 - 24} size={48} color={ui(heatAt(c.t))} anchor="middle" lines={["NO SIGNAL"]} opacity={Math.floor(c.t * 2) % 2 ? 1 : 0.4} />
  </div>
);

// ---------------- second half: 大声で泣いた後 … 彼らを見ている ----------------
const flag = place("OBJ04", { h: [800, 1000], cx: [700, 1200], cy: 540, bg: flat((h) => tone(h, 1)), rot: [-8, 8] });
const flagFire = crop("OBJ04", { u: [0.55, 0.8], v: [0.1, 0.4], z: [2.4, 4], bg: "#000" });
const flagSil = sil("OBJ04", { color: "#000", bg: (h) => tone(h, 4), w: [600, 900], rot: [-12, 12] });
const crowdBack = place("OBJ07", { w: [1500, 1900], cx: 960, cy: [620, 760], bg: flat((h) => tone(h, 2)) });
const crowdLow = full("BG14", { z: [1.0, 1.3] });
const coffin = full("OBJ05", { z: [1.0, 1.4], py: [-0.6, 0.6] });
const treasure = crop("OBJ05", { u: [0.4, 0.6], v: [0.35, 0.55], z: [2.2, 3.6] });
const skull = crop("OBJ05", { u: [0.45, 0.6], v: [0.08, 0.2], z: [2.4, 3.6] });
const photo = full("OBJ18", { z: [1.1, 1.6] });
const triple: Render = (c) =>
  split(
    [[flag, eye, coffin], [flagFire, eye2, skull], [crowdBack, mouth, treasure], [flagSil, inv(eye), coffin]][(c.rep + c.j) % 4],
    { dir: rnd(`${c.seed}d`) < 0.7 ? "v" : "h", jitter: 0.6 },
  )(c);
const sea = full("BG04", { z: [1.0, 1.2], py: [-0.3, 0.3] });
const ark = place("OBJ06", { w: [500, 800], cx: [700, 1200], cy: [520, 580], bg: full("BG04", { z: [1.0, 1.1] }) });
const horizonGrid: Render = stack(
  full("BG04", { z: [1.0, 1.05] }),
  svg((c) => (
    <g stroke={ui(heatAt(c.t))} strokeWidth={1.5} opacity={0.7}>
      {Array.from({ length: 24 }, (_, i) => (
        <line key={`v${i}`} x1={960} y1={600} x2={-1400 + i * 200} y2={1080} />
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const y = 600 + 480 * ((i + ((c.t * 2) % 1)) / 8) ** 2;
        return <line key={`h${i}`} x1={0} y1={y} x2={1920} y2={y} />;
      })}
    </g>
  )),
);
const arkShards: Render = (c) => {
  const n = 7;
  return (
    <div style={{ ...abs, background: tone(heatAt(c.t), 4) }}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rnd(`${c.seed}a${i}`);
        const d = 40 + c.lt * (900 + rnd(`${c.seed}s${i}`) * 900);
        const pts = [0, 1, 2].map((k) => {
          const b = a + (k - 1) * 0.5;
          return `${50 + Math.cos(b) * 60}% ${50 + Math.sin(b) * 60}%`;
        });
        return (
          <div key={i} style={{ ...abs, clipPath: `polygon(50% 50%, ${pts.join(", ")})`, transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) rotate(${(rnd(`${c.seed}r${i}`) - 0.5) * 40 * c.lt}deg)` }}>
            {ark({ ...c, seed: `${c.seed}k` })}
          </div>
        );
      })}
    </div>
  );
};
const star = (bg: Render, grow = 1): Render =>
  stack(bg, svg((c) => <BlackStar x={960 + (rnd(`${c.seed}sx`) - 0.5) * 400} y={420 + (rnd(`${c.seed}sy`) - 0.5) * 200} r={(40 + c.rep * 46) * grow} rim={ui(heatAt(c.t))} t={c.t} />));
const targets: Render = (c) => {
  const heat = heatAt(c.t);
  const n = Math.min(12, 1 + Math.floor(((c.t - L(57).start) / (REST2 - L(57).start)) * 12));
  return (
    <div style={abs}>
      {[crowdLow, crowdBack, photo][c.j % 3](c)}
      <svg width={1920} height={1080} style={abs}>
        {Array.from({ length: n }, (_, i) => (
          <Target key={i} x={200 + rnd(`tg${i}x`) * 1520} y={240 + rnd(`tg${i}y`) * 560} r={46} color={i === n - 1 ? RED : ui(heat)} label={`TARGET ${String(i + 1).padStart(2, "0")}`} />
        ))}
      </svg>
    </div>
  );
};
const REST2 = BURST_C;
const BOOM = 59.45; // 爆ぜた

const repLines = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const SPECS: Spec[] = [
  { li: 4, m: [bolt(eye), bolt(flat("#000")), inv(eye2), bolt(full("CH-E1", { z: [1, 1.15] }))] },
  { li: 5, m: [veins(full("CH-N1", { z: [1, 1.3] })), veins(crop("CH-N1", { u: [0.35, 0.6], v: [0.6, 0.85], z: [2.2, 3.6] })), veins(flat("#000")), full("OBJ17", { z: [1.1, 1.6] })] },
  { li: 6, m: [full("BG02", { z: [1.1, 1.7] }), smokeOverRuins, particles, full("BG11", { z: [1.0, 1.3] })] },
  { li: 7, m: [sickleSil([800, 1300]), chaser, place("CH03", { h: [520, 760], cx: [800, 1120], cy: [600, 700], bg: full("BG07", { z: [1.0, 1.2] }) }), crop("OBJ01", { u: [0.1, 0.25], v: [0.1, 0.3], z: [3, 4.5] })] },
  ...repLines(8, 15).map((li): Spec => ({ li, m: [erase, dialog, erase, erased], div: 4, fill: 0.2, ins: 0.2, trans: 0 })),
  { li: 16, m: returned, div: 4, fill: 0.1, ins: 0, trans: 0 },
  { li: 17, m: [flatWave, throat, place("CH-F1", { h: [1300, 1700], cx: [900, 1300], cy: [500, 700], bg: flat((h) => tone(h, 0)) })] },
  { li: 18, m: [scream(mouth), scream(flat("#000")), mouth, scream(thresh(crop("CH-F1", { z: [1.2, 2] })))] },
  { li: 19, m: [chairRoom, chairSil, crop("OBJ02", { z: [2, 3.5] })] },
  { li: 20, m: [moon, chairRoom, moonRot, inv(moon), chairSil] },
  { li: 21, m: [BLACK], fixed: true },
  ...repLines(22, 29).map((li): Spec => ({ li, m: [closer, distance, corridor, closer], div: 4, fill: 0.2, ins: 0.15, trans: 0 })),
  { li: 30, m: [sickleSil([1600, 2600]), inv(eye), chaser, closer, mouth, moonRot, full("BG12", { z: [1, 1.4] })], div: 4, fill: 0.45, ins: 0.35 },
  { li: 30, at: REST, fixed: true, m: [noSignal] },
  { li: 31, m: [mouth, scream(eye2), inv(mouth), scream(flat("#000"))] },
  { li: 32, m: [flag, flagFire, crowdBack, flagSil, split([flag, crowdBack], { jitter: 0.5 })] },
  { li: 33, m: [treasure, coffin, photo, crop("OBJ05", { u: [0.3, 0.7], v: [0.4, 0.7], z: [3, 5] })] },
  { li: 34, m: [coffin, skull, triple, thresh(skull)] },
  { li: 35, m: [BLACK], fixed: true },
  ...repLines(36, 43).map((li): Spec => ({ li, m: [triple, triple, eye2], div: 4, fill: 0.15, ins: 0.15, trans: 0 })),
  { li: 44, m: [crop("CH-F1", { u: [0.2, 0.32], v: [0.5, 0.62], z: [2.6, 3.6] }), place("CH-F1", { h: [1000, 1300], cx: [800, 1200], cy: 560, bg: flat((h) => tone(h, 1)) }), full("OBJ16", { z: [1, 1.3] })] },
  { li: 45, m: [sea, crowdBack, crop("BG04", { u: [0.4, 0.6], v: [0.45, 0.6], z: [2, 3] })] },
  { li: 46, m: [horizonGrid, ark, full("BG08", { z: [1, 1.2] }), horizonGrid] },
  { li: 47, m: [crowdBack, crowdLow, photo, crop("BG14", { z: [1.8, 2.6] })] },
  { li: 48, m: [ark, sea, crop("OBJ06", { z: [1.6, 2.4], bg: "#000" })] },
  { li: 48, at: BOOM, m: [arkShards, inv(crop("OBJ06", { z: [2, 4], bg: "#000" })), arkShards, full("OBJ19", { z: [1, 1.4] })], div: 4, fill: 0.3, ins: 0.3, trans: 0 },
  ...repLines(49, 56).map((li): Spec => ({ li, m: [star(flat("#000")), star(crowdLow, 0.8), star(eye, 0.7), star(full("BG06a", { z: [1, 1.3] }))], div: 4, fill: 0.15, ins: 0.15, trans: 0 })),
  { li: 57, m: [targets], div: 2, fill: 0.15, ins: 0.15, moves: ["whipL", "whipR", "push", "slice"] },
];

const isRep = (li: number) => (li >= 8 && li <= 16) || (li >= 21 && li <= 30) || (li >= 35 && li <= 43) || (li >= 49 && li <= 56);
const repOf = (li: number) => (li >= 8 && li <= 15 ? li - 8 : li >= 22 && li <= 29 ? li - 22 : li >= 36 && li <= 43 ? li - 36 : li >= 49 && li <= 56 ? li - 49 : 0);

export const B = makeRun({
  name: "b",
  start: 21.965,
  end: BURST_C,
  tier: 1,
  pool: ["CH-E1", "CH-E2", "CH-N1", "BG02", "BG01", "OBJ01", "CH03", "BG07", "CH-F1", "CH-M1", "OBJ02", "BG03", "OBJ04", "OBJ05", "OBJ06", "OBJ07", "BG04", "OBJ16", "OBJ17", "BG11", "BG12"],
  specs: SPECS,
  repOf,
  rep: isRep,
  lyricFrom: 4,
  hideLyric: (t) => t >= REST && t < L(31).start,
  lyric: (li) => (li === 18 ? { allow: [7, 7, 3, 6] } : li >= 8 && li <= 15 ? { ghosts: 0 } : undefined),
  flashes: [
    { t: 21.965, frames: 2, kind: "white" },
    { t: 44.23, frames: 2, kind: "white" },
    { t: BOOM, frames: 3, kind: "invert" },
  ],
  kick: (t) => {
    if (t >= L(30).start && t < REST) return 0.3 + 0.6 * prog(t, L(30).start, REST);
    if (t >= L(36).start && t < L(44).start) return 0.1 + 0.08 * Math.max(0, LINES.slice(36, 44).filter((x) => t >= x.start).length - 1);
    return 0;
  },
  overlay: (t) => {
    // 消去しても copies accumulate and never leave (until 喉)
    const n = t >= L(8).start && t < L(17).start ? LINES.slice(8, 16).filter((x) => t >= x.start).length : 0;
    if (!n) return null;
    const shake = t >= L(16).start;
    return (
      <div style={abs}>
        {Array.from({ length: n * 2 }, (_, i) => {
          const j = shake ? (rnd(`es${i}:${Math.floor(t * 15)}`) - 0.5) * 40 : 0;
          return (
            <LyricCopy
              key={i}
              text="消去しても"
              x={160 + rnd(`ex${i}`) * 1600 + j}
              y={120 + rnd(`ey${i}`) * 840 + j}
              size={Math.round(48 + rnd(`es${i}`) * 110)}
              rot={(rnd(`er${i}`) - 0.5) * 16}
              opacity={0.25 + rnd(`eo${i}`) * 0.45}
              strike={rnd(`ek${i}`) < 0.6}
              outline={rnd(`eol${i}`) < 0.3}
              color={rnd(`ec${i}`) < 0.25 ? RED : WHITE}
            />
          );
        })}
      </div>
    );
  },
});
