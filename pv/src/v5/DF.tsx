import React from "react";
import { BEAT, BURST_E, clamp, easeIn, easeInOut, feat, FPS, HITS, prog, SEC } from "../lib/time";
import { heatAt, MINCHO, paletteAt, RED, WHITE } from "../lib/heat";
import { Haze } from "../fx/fx";
import { Sys, Wave } from "../sys/sys";
import { Ctx, Render, Spec } from "./engine";
import { makeRun } from "./run";
import { Particles } from "./art";
import { crop, full, inv, place, PixText, stack, svg, thresh, tone } from "./shots";
import { SlowPlayer, timeline } from "./slow";

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const B8 = BEAT * 8;

// ---------------- D 吟唱 1:28–1:50 (T3): she is there but does not speak ----------------
const D0 = SEC.D[0];
// D is the darkest grade of the film: lift the quiet water so it still reads
const still = (id: string, z: number, push: number, py = 0, pre?: string): Render => full(id, { z: [z, z], px: [0, 0], py: [py, py], drift: push, pre });
const LIFT = "brightness(1.6) contrast(1.1)";
const dark: Render = (c: Ctx) => <div style={{ ...abs, background: tone(heatAt(c.t), 0) }} />;
const D_SHOTS = timeline(BURST_E, [
  [D0, stack(still("BG06a", 1.1, 0.01, 0, LIFT), svg((c) => <Particles seed="dsea" t={c.t} color="#9FB4C8" n={160} speed={-40} />)), "dissolve", 1.0],
  [D0 + B8, place("CH-F1", { h: 1150, cx: 1150, cy: 600, bg: dark, drift: 0.012 }), "dissolve", 1.0],
  [D0 + B8 * 2, place("OBJ02", { h: 420, cx: 820, cy: 760, bg: still("BG03", 1.05, 0.008, 0, LIFT), drift: 0.006 }), "dissolve", 1.0],
  [D0 + B8 * 3, still("CH-E2", 1.15, 0.01), "dissolve", 1.0],
  [D0 + B8 * 4, place("CH04", { h: 1150, cx: 1100, cy: 660, bg: dark, drift: 0.01 }), "dissolve", 1.0],
  [D0 + B8 * 5, place("CH-H2a", { w: 1500, cx: 960, cy: 600, bg: dark, drift: 0.01 }), "dissolve", 1.0],
  [D0 + B8 * 6, still("CH-N1", 1.1, 0.012), "dissolve", 1.0],
  [D0 + B8 * 7, still("BG04", 1.05, 0.006, 0.1, LIFT), "dissolve", 1.0],
  [108.9, () => <div style={{ ...abs, background: "#000" }} />, "black", 0.6],
  [110.0, (c) => place("OBJ14", { w: 1100, cx: 960, cy: 1240 - easeInOut(prog(c.t, 110.0, 110.15)) * 560, rot: -6, bg: "#000", drift: 0 })(c), "cut"],
]);
const tc = (t: number) => {
  const f = Math.floor(t * FPS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(f / (FPS * 60)) % 60)}:${p(Math.floor(f / FPS) % 60)}:${p(f % FPS)}`;
};

export const SceneD5: React.FC<{ t: number }> = ({ t }) => {
  const P = paletteAt(heatAt(t));
  const silent = t >= 108.9;
  // standby log: only timestamps, one every 2 beats
  const n = Math.max(0, Math.floor((t - D0) / (BEAT * 2)));
  const rows = Array.from({ length: Math.min(8, n + 1) }, (_, i) => {
    const k = n - Math.min(7, n) + i;
    return `[${tc(D0 + k * BEAT * 2)}]  -- standby --`;
  });
  return (
    <div style={abs}>
      <SlowPlayer t={t} shots={D_SHOTS} />
      {!silent && (
        <>
          <PixText x={120} y={170} size={24} color={P.ui} lines={rows} lh={1.6} bg={P.plate} opacity={0.85} />
          <Sys>
            <Wave x0={120} x1={1800} y={930} amp={6 + 90 * feat("vocal", t)} t={t} color={WHITE} sharp={0.2} width={3} />
          </Sys>
          <PixText x={1800} y={960} size={24} color={P.ui} anchor="end" lines={[`VOX ${(feat("vocal", t) * 100).toFixed(0).padStart(3, " ")}%   NO TEXT`]} />
        </>
      )}
    </div>
  );
};

// ---------------- F1 沈黙 + 強打 2:12–2:22.7: black; hits flash the past backwards ----------------
const AH0 = 132.13; // 「ああ。」 sung 132.13–132.85
const AH_END = 132.85;
const AH1 = 133.35; // no flash-backs until the silence after it settles
const PAST = ["CH-E1", "OBJ09", "CH04", "CH03", "CH02", "CH-H2a", "BG06a", "CH-F1", "BG05", "OBJ08", "CH-E2", "OBJ06", "BG04", "OBJ05", "OBJ04", "CH-M1", "OBJ01", "BG02", "CH-N1", "BG01"];
const F1_HITS = HITS.filter(([ht, s]) => ht >= 131.85 && ht < 142.7 && s >= 0.5 && !(ht > AH0 + 0.05 && ht < AH1));

export const SceneF15: React.FC<{ t: number }> = ({ t }) => {
  let idx = -1;
  for (let i = 0; i < F1_HITS.length; i++) if (F1_HITS[i][0] <= t) idx = i;
  const on = idx >= 0 && t - F1_HITS[idx][0] < (F1_HITS[idx][1] > 0.9 ? 0.1 : 0.067);
  const P = paletteAt(heatAt(t));
  let flash: React.ReactNode = null;
  if (on) {
    const c: Ctx = { t, s: F1_HITS[idx][0], e: F1_HITS[idx][0] + 0.1, lt: t - F1_HITS[idx][0], p: 0, k: idx, j: 0, seed: `f1${idx}`, li: -1, rep: 0 };
    const id = PAST[idx % PAST.length];
    const r = crop(id, { z: [1.1, 2.4] });
    flash = [r, thresh(r), inv(r)][idx % 3](c);
  }
  // ああ。: three characters land with the voice, then fade with it
  const ah = "ああ。";
  const n = t < AH0 ? 0 : t < AH0 + 0.27 ? 1 : t < AH0 + 0.55 ? 2 : 3;
  // hard cut the moment the voice stops
  const ahOpacity = t >= AH0 && t < AH_END ? 1 : 0;
  return (
    <div style={{ ...abs, background: "#000" }}>
      {flash}
      {n > 0 && ahOpacity > 0 && (
        <>
          <div
            style={{
              position: "absolute",
              left: 960,
              top: 470,
              transform: `translate(-50%,-50%) scale(${1 + 0.04 * (t - AH0)})`,
              fontFamily: MINCHO,
              fontWeight: 600,
              fontSize: 150,
              letterSpacing: "0.2em",
              color: WHITE,
              opacity: ahOpacity,
              whiteSpace: "pre",
            }}
          >
            {[...ah].map((ch, i) => (i < n ? ch : "　")).join("")}
          </div>
          <Sys>
            <Wave x0={560} x1={1360} y={660} amp={4 + 70 * feat("vocal", t)} t={t} color={WHITE} sharp={0.1} width={2} opacity={ahOpacity} />
          </Sys>
          <PixText x={120} y={980} size={24} color={P.ui} lines={[`0091+  ${ah.slice(0, n)}`]} opacity={ahOpacity} />
        </>
      )}
    </div>
  );
};

// ---------------- F2 警報 2:22.7–2:45.5 (2-beat cuts): the temperature is the protagonist ----------------
const F20 = SEC.F2[0];
const F21 = SEC.F2[1];
const ALARM = BEAT * 2;
const rain = (id: string, z: [number, number]): Render => full(id, { z, px: [-0.4, 0.4], py: [-0.2, 0.3], drift: 0.03 });
const kneelEnd: Render = (c) => {
  const k = easeInOut(prog(c.t, F21 - B8, F21 - 0.3));
  return (
    <div style={{ ...abs, background: "#000" }}>
      <div style={{ ...abs, opacity: 0.6 }}>{full("BG07", { z: [1.1, 1.1], px: [0, 0], py: [0.2, 0.2], drift: 0.01 })(c)}</div>
      <div style={{ ...abs, opacity: k }}>{place("CH05", { h: 620, cx: 560, cy: 760, bg: "transparent", drift: 0.005 })(c)}</div>
    </div>
  );
};
const SPECS: Spec[] = [
  {
    li: 90,
    at: F20,
    div: 0.5,
    fill: 0.1,
    ins: 0.1,
    trans: 0.15,
    m: [rain("BG07", [1.0, 1.3]), rain("BG11", [1.0, 1.25]), rain("BG12", [1.0, 1.3]), full("OBJ16", { z: [1.0, 1.2] }), rain("BG07h", [1.0, 1.3]), full("OBJ17", { z: [1.0, 1.4] }), crop("BG07", { z: [2, 3] }), rain("BG13", [1.0, 1.2])],
  },
  { li: 90, at: F21 - B8, fixed: true, m: [kneelEnd] },
];

export const F2 = makeRun({
  name: "f2",
  start: F20,
  end: F21,
  tier: 2,
  pool: ["BG07", "BG07h", "BG11", "BG12", "OBJ16", "OBJ17", "BG13", "CH05"],
  specs: SPECS,
  lyricFrom: 999,
  fillW: { bars: 0, term: 3, frag: 6, raw: 2, blocks: 0 },
});

const F2Overlay: React.FC<{ t: number }> = ({ t }) => {
    const P = paletteAt(heatAt(t));
    const p = prog(t, F20, F21);
    const temp = 52 + (180 - 52) * p;
    const cyc = ((t - F20) % ALARM) / ALARM;
    const blink = cyc < 0.5;
    const sink = easeIn(prog(t, F21 - B8, F21));
    return (
      <>
        <Sys>
          <circle cx={960} cy={540} r={60 + cyc * 1100} fill="none" stroke={P.ui} strokeWidth={3} opacity={(1 - cyc) * 0.7 * (1 - sink)} />
          {blink && sink < 0.5 && <rect x={24} y={24} width={1872} height={1032} fill="none" stroke={RED} strokeWidth={10} opacity={0.85} />}
          <g opacity={1 - sink}>
            <rect x={110} y={505} width={1700} height={70} fill={P.plate} opacity={0.75} />
            <rect x={110} y={505} width={1700} height={70} fill="none" stroke={P.ui} strokeWidth={2} />
            <rect x={116} y={511} width={1688 * clamp((temp - 30) / 220)} height={58} fill={blink ? RED : P.ui} />
            {Array.from({ length: 12 }, (_, i) => (
              <text key={i} x={110 + (i * 1700) / 11} y={636} fontFamily="FusionPixel12" fontSize={24} fill={P.ui} textAnchor="middle">
                {30 + i * 20}
              </text>
            ))}
          </g>
        </Sys>
        <div style={{ ...abs, opacity: 1 - sink }}>
          <PixText x={110} y={290} size={168} color={WHITE} lines={[`${temp.toFixed(1)}℃`]} />
          <PixText x={1810} y={430} size={36} color={blink ? RED : P.ui} anchor="end" lines={[blink ? "WARNING  CORE OVERHEAT" : "COOLANT: NONE"]} />
          <PixText x={1810} y={660} size={48} color={WHITE} anchor="end" lines={[blink ? "警告　熱異常を検知" : ""]} />
        </div>
        {blink && <div style={{ ...abs, background: RED, mixBlendMode: "screen", opacity: 0.07 * (1 - sink) }} />}
      </>
    );
};

// heat haze bends the world shots only, never the readouts
export const SceneF25: React.FC<{ t: number }> = ({ t }) => (
  <div style={abs}>
    <Haze t={t} amount={0.3 + prog(t, F20, F21) * 0.9}>
      <F2.Scene t={t} />
    </Haze>
    <F2Overlay t={t} />
  </div>
);

