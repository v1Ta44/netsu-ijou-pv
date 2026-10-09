import React from "react";
import { heatAt, RED, WHITE } from "../lib/heat";
import { BURST_E, clamp, LINES, prog, rnd } from "../lib/time";
import { picSize, src } from "../lib/world";
import { BlackStar, Tag } from "../sys/sys";
import { Burst } from "./art";
import { Ctx, Render, Spec } from "./engine";
import { BLACK } from "./filler";
import { makeRun } from "./run";
import { crop, flat, full, fx, place, PixText, sil, stack, svg, tone, ui, word } from "./shots";

// E 疾走 1:50–2:12 (T1): the blade turns on her. Chaos gets into her own components.

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const L = (i: number) => LINES[i];

const hands = place("CH-H2a", { w: [1300, 1700], cx: 960, cy: [560, 680], bg: flat((h) => tone(h, 1)) });
const drops = (bg: Render): Render =>
  stack(
    bg,
    svg((c) => (
      <g fill={WHITE}>
        {Array.from({ length: 18 }, (_, i) => {
          const t0 = rnd(`dr${i}`) * 0.8;
          const y = 560 + Math.max(0, c.t - L(66).start - t0) ** 2 * 2600;
          return <ellipse key={i} cx={700 + rnd(`dx${i}`) * 520} cy={y % 1200} rx={6} ry={12} opacity={0.9} />;
        })}
      </g>
    )),
  );
const salt = full("BG15", { z: [1.0, 1.6], pre: "brightness(0.55) contrast(1.4)" });
const lattice: Render = stack(
  flat("#000"),
  svg((c) => {
    const g = 64;
    const grow = clamp((c.t - L(67).start) / 1.2);
    return (
      <g stroke={WHITE} strokeWidth={2} opacity={0.9}>
        {Array.from({ length: 30 }, (_, i) => (
          <line key={`v${i}`} x1={i * g} y1={1080} x2={i * g} y2={1080 - grow * 600 * (0.5 + rnd(`lv${i}`) * 0.5)} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={1080 - i * g} x2={1920 * grow} y2={1080 - i * g} />
        ))}
      </g>
    );
  }),
);
const WORDS = ["祈り", "苦しみ", "同情"];
const tagged = (bg: Render, n: number, sold = false): Render =>
  stack(
    bg,
    svg((c) => {
      const f = Math.floor(c.t * 12);
      return (
        <g>
          {Array.from({ length: n }, (_, i) => (
            <Tag
              key={i}
              x={160 + rnd(`tg${i}x`) * 1500}
              y={160 + rnd(`tg${i}y`) * 760}
              rot={(rnd(`tg${i}r`) - 0.5) * 50}
              s={1 + Math.floor(rnd(`tg${i}s`) * 2)}
              text={sold && rnd(`sd${i}${f}`) < 0.5 ? "SOLD" : `¥${Math.floor(rnd(`p${i}${f}`) * 99999)}`}
              color={sold ? RED : ui(heatAt(c.t))}
              ink={sold ? WHITE : "#000"}
            />
          ))}
        </g>
      );
    }),
  );
const wordShot: Render = (c) => word(WORDS[Math.min(2, Math.floor(((c.t - L(68).start) / (L(69).start - L(68).start)) * 3))], { size: 460, bg: (h) => tone(h, 1) })(c);
const rei2 = place("CH02", { h: [1000, 1250], cx: [800, 1200], cy: [620, 700], bg: flat((h) => tone(h, 2)) });

// 背を向けても ×7: each repetition she is further away and darker
const back: Render = (c) => {
  const k = c.rep;
  const h = 900 * 0.72 ** k;
  return (
    <div style={abs}>
      {full("BG13", { z: [1.0, 1.05], px: [-0.05, 0.05], py: [-0.05, 0.05] })(c)}
      <div style={{ ...abs, opacity: 1 - k * 0.1 }}>{place("CH03", { h, cx: 960, cy: 540 + h * 0.18, bg: "transparent" })(c)}</div>
      <div style={{ ...abs, background: "#000", opacity: k * 0.08 }} />
    </div>
  );
};
const backSil = (c: Ctx) => sil("CH03", { color: "#000", bg: (h) => tone(h, 3), w: 420 * 0.75 ** c.rep, cy: 560 })(c);

const scream = (bg: Render): Render => stack(bg, svg((c) => <Burst seed={c.seed} t={c.t} y={540} amp={300 + 200 * c.p} color={WHITE} width={5} n={300} />));
// CH04 silhouette used as a window onto the deep sea
const seaWindow: Render = (c) => {
  const heat = heatAt(c.t);
  const [w, h] = picSize("CH04", undefined, 1100);
  const fishX = 1500 - ((c.t - L(78).start) * 420) % 2400;
  return (
    <div style={{ ...abs, background: tone(heat, 3) }}>
      <div
        style={{
          position: "absolute",
          left: 960 - w / 2,
          top: 1080 - h + 60,
          width: w,
          height: h,
          WebkitMaskImage: `url(${src("CH04")})`,
          WebkitMaskSize: "100% 100%",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: -(960 - w / 2), top: -(1080 - h + 60), width: 1920, height: 1080 }}>
          {full("BG06a", { z: [1.0, 1.05] })(c)}
          {place("OBJ09", { w: 900, cx: fishX, cy: 520, bg: "transparent" })(c)}
        </div>
      </div>
    </div>
  );
};
// 幸福を手放す: a flower let go of, falling
const flowerFall: Render = (c) => place("OBJ15", { w: 700, cx: 960 + Math.sin(c.t * 3) * 120, cy: 200 + (c.t - L(78).start) * 700, rot: c.t * 90, bg: flat((h) => tone(h, 0)) })(c);
const fish = place("OBJ09", { w: [1100, 1600], cx: [700, 1200], cy: [480, 600], bg: full("BG06a", { z: [1, 1.2] }), rot: [-8, 8] });
const blood = (bg: Render): Render =>
  stack(bg, (c) => {
    const lvl = clamp((c.t - L(81).start) / (L(82).start - L(81).start));
    const y = 1080 - lvl * 1000;
    return (
      <svg width={1920} height={1080} style={abs}>
        <path d={`M0 ${y} ${Array.from({ length: 25 }, (_, i) => `L${i * 80} ${y + Math.sin(i * 0.9 + c.t * 9) * 14}`).join(" ")} L1920 ${y} L1920 1080 L0 1080 Z`} fill={RED} opacity={0.88} />
      </svg>
    );
  });
const eyeStar = (bg: Render): Render =>
  stack(bg, svg((c) => <BlackStar x={960} y={560} r={30 + c.rep * 70} rim={ui(heatAt(c.t))} t={c.t} />));

const repLines = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const burst: Render = (c) => (
  <div style={{ ...abs, transform: `scale(${1.3 - 0.3 * Math.min(1, c.lt / 0.18)})` }}>{drops(hands)(c)}</div>
);

const SPECS: Spec[] = [
  { li: 65, at: BURST_E, fixed: true, m: [burst] },
  { li: 66, m: [drops(hands), crop("CH-H2a", { z: [1.8, 2.6] }), drops(flat("#000")), full("OBJ17", { z: [1, 1.4] })] },
  { li: 67, m: [drops(hands), salt, lattice, fx(crop("BG15", { z: [2, 3.5] }), "brightness(0.55) contrast(1.4)")] },
  { li: 68, m: [wordShot, tagged(flat((h) => tone(h, 1)), 3), wordShot], div: 1 },
  { li: 69, m: [tagged(rei2, 6), tagged(crop("CH02", { z: [1.6, 2.4] }), 10, true), tagged(full("OBJ18", { z: [1, 1.3] }), 8, true)] },
  ...repLines(70, 76).map((li): Spec => ({ li, m: [back, backSil, back], div: 4, fill: 0.2, ins: 0.15, trans: 0 })),
  { li: 77, m: [scream(flat("#000")), scream(crop("CH-M1", { z: [1.1, 1.6] })), crop("CH-M1", { z: [1.4, 2.2] }), scream(full("OBJ16", { z: [1, 1.2] }))] },
  { li: 78, m: [seaWindow, sil("CH04", { color: "#000", bg: (h) => tone(h, 3), w: [700, 900], cy: 640 }), flowerFall] },
  { li: 79, m: [seaWindow, fish, crop("OBJ09", { u: [0.1, 0.3], z: [2.5, 4], bg: "#000" })] },
  { li: 80, m: [fish, full("BG06a", { z: [1.0, 1.3] }), seaWindow] },
  { li: 81, m: [blood(seaWindow), blood(full("BG07", { z: [1, 1.2] })), blood(flat("#000"))] },
  ...repLines(82, 89).map((li): Spec => ({ li, m: [eyeStar(full("CH-E2", { z: [1, 1.2] })), eyeStar(full("CH-E1", { z: [1, 1.15] })), eyeStar(flat("#000"))], div: 4, fill: 0.15, ins: 0.15, trans: 0 })),
  { li: 90, m: [eyeStar(full("CH-E1", { z: [1, 1.05] })), (c) => eyeStar(full("CH-E1", { z: [1, 1.05] }))({ ...c, rep: 8 + c.j * 3 })], div: 1, fill: 0, ins: 0.2 },
  { li: 90, at: 131.3, fixed: true, m: [BLACK] },
];

export const E = makeRun({
  name: "e",
  start: BURST_E,
  flashes: [{ t: BURST_E, frames: 2, kind: "white" }],
  lyricFrom: 66,
  end: 131.5,
  tier: 1,
  pool: ["CH-H2a", "CH02", "CH03", "CH04", "CH-E1", "CH-E2", "CH-M1", "BG06a", "BG07", "BG13", "OBJ09", "OBJ16", "OBJ17", "OBJ18"],
  specs: SPECS,
  repOf: (li) => (li >= 70 && li <= 76 ? li - 70 : li >= 82 && li <= 89 ? li - 82 : 0),
  rep: (li) => (li >= 70 && li <= 76) || (li >= 82 && li <= 89),
  lyric: (li) => (li === 68 ? { allow: [1, 8] } : li >= 70 && li <= 76 ? { ghosts: 0 } : undefined),
  hideLyric: (t) => t >= 131.3,
  kick: (t) => (t >= L(90).start && t < 131.5 ? 0.2 + 0.5 * prog(t, L(90).start, 131.3) : 0),
  over: (t) =>
    t >= L(90).start && t < 131.3 ? (
      <PixText x={960} y={980} size={24} color={RED} anchor="middle" lines={["TARGET: SELF"]} opacity={Math.floor(t * 6) % 2 ? 1 : 0.3} />
    ) : null,
});
