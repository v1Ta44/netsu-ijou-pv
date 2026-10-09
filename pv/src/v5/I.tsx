import React from "react";
import { heatAt, RED, WHITE } from "../lib/heat";
import { clamp, easeOut, LINES, prog, rnd } from "../lib/time";
import { Char, Light, picSize, Pic, World } from "../lib/world";
import { Br, Target } from "../sys/sys";
import { Burst, Tunnel } from "./art";
import { Ctx, Render, Spec } from "./engine";
import { BLACK } from "./filler";
import { makeRun } from "./run";
import { crop, flat, full, inv, place, PixText, sil, split, stack, svg, thresh, tone, ui, word } from "./shots";

// I 疾走・峰値 3:27.5–3:49 (T1): the order breaks. Signal at its worst; the closing 」 is the only order restored.

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const L = (i: number) => LINES[i];
const CUT_T = 209.2; // 夢を殺す: the vertical cut
const FINAL = 228.0; // everything stops; only 」 remains

const handsBase = (gap: number, cut: number): Render => (c) => {
  const heat = heatAt(c.t);
  const [rw] = picSize("CH-H3", 1100);
  const [hw] = picSize("OBJ13", 1100);
  const off = cut > 0 ? easeOut(cut) * 260 : 0;
  return (
    <div style={{ ...abs, background: "#000" }}>
      <div style={{ ...abs, transform: `translate(${-off}px, ${cut > 0 ? off * 0.4 : 0}px) rotate(${-cut * 6}deg)` }}>
        <Char heat={heat}>
          <Pic id="CH-H3" cx={960 - gap - rw / 2 + 140} cy={540} w={1100} />
        </Char>
      </div>
      <div style={{ ...abs, transform: `translate(${off}px, ${cut > 0 ? -off * 0.4 : 0}px) rotate(${cut * 6}deg)` }}>
        <World heat={heat}>
          <Pic id="OBJ13" cx={960 + gap + hw / 2 - 140} cy={560} w={1100} />
        </World>
      </div>
    </div>
  );
};
const hands: Render = (c) => handsBase(260 * (1 - clamp((c.t - L(103).start) / 1.6)), 0)(c);
const handsCut: Render = (c) => {
  const cut = clamp((c.t - CUT_T) / 0.4);
  return (
    <div style={abs}>
      {handsBase(40, c.t >= CUT_T ? cut : 0)(c)}
      {c.t >= CUT_T && c.t < CUT_T + 0.15 && <div style={{ position: "absolute", left: 957, top: 0, width: 6, height: 1080, background: WHITE }} />}
    </div>
  );
};
const remnants: Render = (c) => {
  const heat = heatAt(c.t);
  const lines = ["while (true) heat++", "var hope = undefined", "let dream = null // killed", "const you = NaN", "if (real) { } else { }", "catch (e) { /* ignored */ }", "love = love - love", "return void", "hands.length === 0"];
  return (
    <div style={{ ...abs, background: "#000" }}>
      {lines.map((s, i) => (
        <PixText key={i} x={80 + rnd(`${c.seed}x${i}`) * 1100} y={80 + i * 104 + (rnd(`${c.seed}y${i}`) - 0.5) * 40} size={[36, 48, 72][i % 3]} color={i % 3 ? ui(heat) : WHITE} lines={[s]} opacity={0.6 + rnd(`${c.seed}o${i}`) * 0.4} />
      ))}
    </div>
  );
};
const errOver: Render = (c) => (
  <div style={abs}>
    {full("BG07h", { z: [1.0, 1.2] })(c)}
    <div style={{ ...abs, background: "#2A0000", opacity: 0.4 }} />
    <PixText x={960} y={420} size={240} color={WHITE} anchor="middle" lines={["ERR.OVER"]} />
    <PixText x={960} y={700} size={72} color={WHITE} anchor="middle" lines={["CORE 999.9℃"]} />
  </div>
);
const netsu = word("熱異常", { size: 560, bg: (h) => tone(h, 1), color: WHITE });
const glass = full("OBJ19", { z: [1.0, 1.6] });
// strips: CH-F1 cut into horizontal bands, each displaced
const strips = (id: string): Render => (c) => {
  const n = 10;
  return (
    <div style={{ ...abs, background: "#000" }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ ...abs, clipPath: `inset(${(i * 1080) / n}px 0 ${1080 - ((i + 1) * 1080) / n}px 0)`, transform: `translateX(${(rnd(`${c.seed}s${i}`) - 0.5) * 500}px)` }}>
          {place(id, { h: 1200, cx: 1000, cy: 560, bg: flat((h) => tone(h, 2)) })(c)}
        </div>
      ))}
    </div>
  );
};
const scream = (bg: Render): Render => stack(bg, svg((c) => <Burst seed={c.seed} t={c.t} y={540} amp={300 + 200 * c.p} color={WHITE} width={5} n={300} />));
const chair = place("OBJ02", { h: [600, 800], cx: [700, 1200], cy: 600, bg: full("BG03", { z: [1, 1.15] }) });
const moon: Render = (c) => {
  const heat = heatAt(c.t);
  return (
    <div style={{ ...abs, background: tone(heat, 0) }}>
      <Light id="OBJ03" heat={heat} cx={700 + rnd(`${c.seed}mx`) * 520} cy={420 + rnd(`${c.seed}my`) * 240} w={400 + rnd(`${c.seed}mw`) * 600} glow={1.6} />
      <svg width={1920} height={1080} style={abs}>
        <Target x={960} y={540} r={220} color={RED} label="MOON / LAUGHING" />
      </svg>
    </div>
  );
};
const closer = (c: Ctx) => {
  const k = c.rep;
  return (
    <div style={abs}>
      {full("BG13", { z: [1 + k * 0.2, 1.05 + k * 0.22], px: [-0.1, 0.1], py: [-0.1, 0.1] })(c)}
      {sil("OBJ01", { color: "#000", bg: "transparent", w: 300 * 1.45 ** k, rot: [-15, 15] })(c)}
      <svg width={1920} height={1080} style={abs}>
        <Tunnel z={k * 0.5 + c.lt * 3} color={RED} width={3} />
      </svg>
    </div>
  );
};
const chaser = (c: Ctx) => full("OBJ20", { z: [1.2 + c.rep * 0.35, 1.3 + c.rep * 0.4], px: [-0.2, 0.2], py: [-0.1, 0.2] })(c);
const distance: Render = (c) => (
  <div style={{ ...abs, background: RED }}>
    <PixText x={960} y={300} size={288} color="#000" anchor="middle" lines={[`-${8 - c.rep}m`]} />
  </div>
);
const finalBracket: Render = (c) => {
  // the shattered bracket pieces fly back and lock into one 」
  const q = easeOut(clamp((c.t - FINAL) / 0.35));
  return (
    <div style={{ ...abs, background: "#000" }}>
      <svg width={1920} height={1080} style={abs}>
        {Array.from({ length: 6 }, (_, i) => {
          const dx = (rnd(`fb${i}x`) - 0.5) * 1600 * (1 - q);
          const dy = (rnd(`fb${i}y`) - 0.5) * 900 * (1 - q);
          const r = (rnd(`fb${i}r`) - 0.5) * 180 * (1 - q);
          return (
            <g key={i} transform={`translate(${dx} ${dy}) rotate(${r} 1060 640)`} clipPath={`url(#fbc${i})`}>
              <defs>
                <clipPath id={`fbc${i}`}>
                  <rect x={760} y={240 + i * 70} width={400} height={70} />
                </clipPath>
              </defs>
              <Br x={1060} y={640} s={420} close color={WHITE} w={30} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const repLines = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const SPECS: Spec[] = [
  { li: 103, m: [hands, crop("CH-H3", { z: [1.6, 2.4], bg: "#000" }), hands, crop("OBJ13", { z: [1.6, 2.4], bg: "#000" })], fill: 0.15, ins: 0.2 },
  { li: 104, m: [handsCut], fill: 0.1, ins: 0.1, trans: 0 },
  { li: 104, at: CUT_T, m: [handsCut], fixed: true },
  { li: 105, m: [remnants, thresh(crop("CH-E2", { z: [1.2, 2] })), remnants, full("OBJ17", { z: [1, 1.4] })] },
  { li: 106, m: [errOver, netsu, full("BG07h", { z: [1.1, 1.5] }), errOver, inv(netsu)], fill: 0.2 },
  ...repLines(107, 110).map((li): Spec => ({ li, m: [glass, thresh(glass), split([glass, full("BG07h", { z: [1.1, 1.5] }), crop("CH-E2", { z: [1.2, 2] })], { jitter: 0.8 }), full("OBJ16", { z: [1, 1.3] })], fill: 0.35, ins: 0.4 })),
  { li: 111, m: [strips("CH-F1"), thresh(crop("CH-F1", { z: [1.2, 2] })), strips("CH02")], fill: 0.35, ins: 0.4 },
  { li: 112, m: [strips("CH-F1"), crop("CH-M1", { z: [1.1, 1.8] })], fill: 0.35, ins: 0.4 },
  { li: 113, m: [scream(crop("CH-M1", { z: [1.1, 1.6] })), scream(flat("#000")), strips("CH-F1")], fill: 0.35, ins: 0.4 },
  { li: 114, m: [chair, moon, chair, moon], div: 4, fill: 0.2, ins: 0.2, trans: 0 },
  { li: 115, m: [moon, chair, thresh(crop("OBJ03", { z: [2, 3.5], bg: "#000" })), inv(moon)], div: 4, fill: 0.25, ins: 0.25, trans: 0 },
  { li: 116, m: [BLACK], fixed: true },
  ...repLines(117, 124).map((li): Spec => ({ li, m: [closer, chaser, distance, closer], div: 4, fill: 0.4, ins: 0.3, trans: 0 })),
  { li: 125, m: [closer, chaser, glass, strips("CH-F1"), errOver, crop("CH-M1", { z: [1.1, 1.6] })], div: 4, fill: 0.55, ins: 0.4, trans: 0 },
  { li: 125, at: FINAL, fixed: true, m: [finalBracket] },
];

export const I = makeRun({
  name: "i",
  start: 207.526,
  end: 228.55,
  tier: 1,
  pool: ["CH-H3", "OBJ13", "CH-E2", "CH-F1", "CH-M1", "CH02", "BG07h", "OBJ19", "OBJ16", "OBJ17", "OBJ02", "BG03", "OBJ20", "BG13", "OBJ01", "BG12", "OBJ05", "CH-E1"],
  specs: SPECS,
  repOf: (li) => (li >= 107 && li <= 110 ? li - 107 : li >= 117 && li <= 124 ? li - 117 : 0),
  rep: (li) => (li >= 107 && li <= 110) || li >= 114,
  // the lyric loses its brackets from こんなの耐えられないの on
  lyric: (li) => (li >= 111 ? { allow: [0, 1, 2, 3, 4, 5, 6, 7] } : undefined),
  hideLyric: (t) => t >= FINAL,
  flashes: [
    { t: L(106).start, frames: 3, kind: "white" },
    ...[107, 108, 109, 110].map((li) => ({ t: L(li).start, frames: 2, kind: "invert" as const })),
  ],
  kick: (t) => (t >= FINAL ? 0 : t >= L(106).start ? 0.25 + 0.35 * prog(t, L(106).start, FINAL) : 0.15),
});

