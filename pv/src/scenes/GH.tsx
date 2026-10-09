import React from "react";
import { BLUE, heatAt, MINCHO, MONO, RED, WHITE } from "../lib/heat";
import { after, BEAT, clamp, easeInOut, easeOut, featS, L, noise, prog, pulse, quant, rnd, rndr, stepEase, steps } from "../lib/time";
import { Bg, Char, Glow, Pic, picSize, Silhouette, src, World } from "../lib/world";
import { Black, Flash, Haze, Layer, Slices } from "../fx/fx";
import { Log, Lyric, Sys, Wave } from "../sys/sys";
import { Cap, Manuscript, pal, Shots } from "./common";
import { Glint, STAR_POS } from "./C";
import { Img } from "remotion";

const l = L;
const COLD = 0.04; // narrator stays cold in G

const G_LOG = [
  "boot ADACHI_REI ............ ok",
  "mount /dev/voice ........... ok",
  "rec start",
  "",
  "let dead = vars.filter(v => !v.alive)",
  "for (const v of dead) {",
  "  repeat(v)",
  "  count += 1",
  "}",
  "heat = 180.0",
  "heat += count * 0.1",
  "",
  "send(log, to: ???)",
  "  -> no route to host",
  "  -> timeout",
  "record(monologue)",
  'write("あわれな独り言")',
];

// Rising embers (world layer, free motion).
const Embers: React.FC<{ t: number; n: number; color: string }> = ({ t, n, color }) => (
  <Sys>
    {Array.from({ length: n }, (_, i) => {
      const sp = rndr(`ems${i}`, 60, 220);
      const y = 1100 - ((t * sp + rnd(`emy${i}`) * 1200) % 1200);
      const x = rnd(`emx${i}`) * 1920 + noise(t * 0.8 + i, `emn${i}`) * 60;
      return <rect key={i} x={x} y={y} width={3 + (i % 3)} height={3 + (i % 3)} fill={color} opacity={0.5 + 0.5 * rnd(`emo${i}`)} />;
    })}
  </Sys>
);

export const SceneG: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  const P = pal(heat);
  const C = pal(COLD);
  const g0 = l(91).start;
  const p = prog(t, g0, 186.504);
  const fire = easeInOut(prog(t, l(92).start, l(93).start));
  const inHands = t >= l(93).start && t < l(94).start;
  return (
    <>
      <Black />
      <Haze t={t} amount={0.15 + p * 0.85}>
        <World heat={heat}>
          <Bg id="BG07" zoom={1.08 + p * 0.1} py={0.3} />
          <Bg id="BG07h" zoom={1.08 + p * 0.1} py={0.3} opacity={fire} />
        </World>
        {inHands && (
          <World heat={heat}>
            <Bg id="BG07h" zoom={1.5} opacity={0.6} />
          </World>
        )}
      </Haze>
      <Glow heat={Math.max(heat, 0.66 + p * 0.1)} cx={0.55} cy={0.6} strength={p * 0.6} />
      <Embers t={t} n={Math.round(20 + p * 120)} color={P.ui} />
      {!inHands && (
        <Char heat={COLD}>
          <Pic id="CH05" cx={620} cy={790} h={560} />
        </Char>
      )}
      {inHands && (
        <>
          <Char heat={COLD}>
            <div style={{ position: "absolute", inset: 0, transform: `translateY(${pulse(t, 0.25, 0.12) * 5}px)` }}>
              <Pic id="CH-H1" cx={660} cy={590} w={1150} />
            </div>
          </Char>
          <Sys>
            <Wave x0={740} x1={740 + stepEase(t, l(93).start, l(93).start + BEAT * 6, 2) * 1000} y={355} amp={10 + featS("vocal", t, 0.15) * 60} t={t} color={C.ui} width={2} sharp={0.5} />
          </Sys>
        </>
      )}
      <Sys>
        {!inHands && <Log t={t} t0={g0} lines={G_LOG} x={120} y={190} ui={C.ui} plate={C.plate} max={12} div={0.5} size={24} w={500} />}
      </Sys>
      <Manuscript t={t} idx={[91, 92, 93, 94]} right={1810} top={150} size={52} gap={92} hi={{ 92: { 8: "#FFB020" } }} shadow="0 0 12px rgba(0,0,0,0.9)" />
    </>
  );
};

// ---------------- H ----------------
const SWALLOWS: [string, number][] = [["OBJ10a", 0], ["OBJ10b", 0.35], ["OBJ10c", 0.7]];
const swPath = (i: number, u: number): [number, number] => {
  const y0 = 260 + i * 150;
  return [-300 + u * 2500, y0 + Math.sin(u * 4 + i) * 120 - u * 120];
};

export const SceneH: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  const P = pal(heat);
  const ui = P.ui;
  return (
    <>
      <Black />
      <Shots
        t={t}
        list={[
          // 0096 泣いた細胞が海に戻る
          {
            s: l(95).start,
            e: l(96).start,
            r: (t) => {
              const n = steps(t, l(95).start, 2) + 1;
              const hz = 745;
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG08" zoom={1.1} py={0.2} />
                  </World>
                  <Glow heat={0.9} cx={0.62} cy={0.66} strength={0.5} />
                  <Sys>
                    {Array.from({ length: n }, (_, i) => {
                      const born = l(95).start + (i * BEAT) / 2;
                      const age = t - born;
                      const x = rndr(`cel${i}`, 200, 1700);
                      const fallT = 0.5;
                      const y = 120 + Math.min(1, age / fallT) ** 2 * (hz + rndr(`cz${i}`, 0, 250) - 120);
                      const r = rndr(`cr${i}`, 10, 28);
                      if (age < fallT)
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r={r} fill="none" stroke={WHITE} strokeWidth={2} />
                            <circle cx={x} cy={y} r={r * 0.35} fill={WHITE} />
                          </g>
                        );
                      const ra = age - fallT;
                      return <ellipse key={i} cx={x} cy={y} rx={r + ra * 260} ry={(r + ra * 260) * 0.12} fill="none" stroke={WHITE} strokeWidth={2} opacity={clamp(1 - ra / 1.4)} />;
                    })}
                  </Sys>
                  <Cap t={t} li={95} x={96} y={120} size={78} />
                  <Flash a={after(t, l(95).start, 0.35)} />
                </>
              );
            },
          },
          // 0097 世迷言がへばりつく: the previous line clings to the edges
          {
            s: l(96).start,
            e: l(97).start,
            r: (t) => {
              const n = steps(t, l(96).start, 2) + 1;
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG08" zoom={1.25} px={0.3} py={0.4} />
                  </World>
                  {Array.from({ length: Math.min(n, 16) }, (_, i) => {
                    const side = i % 4;
                    const off = rndr(`sk${i}`, 0.05, 0.8);
                    const pos: React.CSSProperties =
                      side === 0 ? { left: off * 1500, top: 30 + (i >> 2) * 54 } : side === 1 ? { left: 1880 - (i >> 2) * 54, top: off * 900, writingMode: "vertical-rl" } : side === 2 ? { left: off * 1500, top: 1000 - (i >> 2) * 54 } : { left: 10 + (i >> 2) * 54, top: off * 900, writingMode: "vertical-rl" };
                    return (
                      <div key={i} style={{ position: "absolute", ...pos, fontFamily: MINCHO, fontWeight: 700, fontSize: 44, color: i % 3 ? ui : WHITE, opacity: 0.8, whiteSpace: "nowrap", transform: `rotate(${rndr(`skr${i}`, -4, 4)}deg)` }}>
                        {l(95).text}
                      </div>
                    );
                  })}
                  <Cap t={t} li={96} x={960} y={480} size={96} anchor="middle" weight={900} />
                </>
              );
            },
          },
          // 0098–0099 燕が描いた軌跡を / なぞるように灰色の雲が来ている
          {
            s: l(97).start,
            e: l(99).start,
            r: (t) => {
              const s0 = l(97).start;
              const u = (t - s0) / (l(98).end - s0);
              const cloud = t >= l(98).start ? easeOut(prog(t, l(98).start, l(98).end)) : 0;
              const front = 1920 - cloud * 2300;
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG08" zoom={1.3} py={-0.9} />
                  </World>
                  <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${Math.max(0, front)}px)` }}>
                    <World heat={heat}>
                      <Bg id="BG09" zoom={1.2} px={0.4 - cloud * 0.6} />
                    </World>
                  </div>
                  <Sys>
                    <defs>
                      <clipPath id="trailclip">
                        <rect x={0} y={0} width={Math.max(0, front)} height={1080} />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#trailclip)">
                      {SWALLOWS.map(([, d], i) => {
                        const pts: string[] = [];
                        const uu = clamp(u * 1.1 - d * 0.3);
                        for (let k = 0; k <= 60; k++) {
                          const [x, y] = swPath(i, (uu * k) / 60);
                          pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                        }
                        return <polyline key={i} points={pts.join(" ")} fill="none" stroke={i === 1 ? WHITE : ui} strokeWidth={2} strokeDasharray={i === 2 ? "10 8" : undefined} />;
                      })}
                    </g>
                  </Sys>
                  <World heat={heat}>
                    {SWALLOWS.map(([id, d], i) => {
                      const uu = clamp(u * 1.1 - d * 0.3);
                      const [x, y] = swPath(i, uu);
                      return <Pic key={id} id={id} cx={x} cy={y} w={i === 0 ? 260 : 200} rot={-8} />;
                    })}
                  </World>
                  <Cap t={t} li={97} x={96} y={900} size={72} />
                  <Cap t={t} li={98} x={96} y={900} size={72} />
                </>
              );
            },
          },
          // 0100 編んだ名誉で明日を乞う: the medal taken apart by the grid
          {
            s: l(99).start,
            e: l(100).start,
            r: (t) => {
              const s = stepEase(t, l(99).start, l(99).end, 2);
              const [mw, mh] = picSize("OBJ11", undefined, 900);
              const nx = 4;
              const ny = 7;
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG09" zoom={1.4} opacity={0.5} />
                  </World>
                  <World heat={heat}>
                    {Array.from({ length: nx * ny }, (_, k) => {
                      const i = k % nx;
                      const j = Math.floor(k / nx);
                      const cw = mw / nx;
                      const ch = mh / ny;
                      const dx = (i - (nx - 1) / 2) * 60 * s + rndr(`md${k}`, -1, 1) * 120 * s;
                      const dy = (j - (ny - 1) / 2) * 30 * s + rndr(`me${k}`, -1, 1) * 60 * s;
                      return (
                        <div key={k} style={{ position: "absolute", left: 1150 - mw / 2 + i * cw + dx, top: 540 - mh / 2 + j * ch + dy, width: cw, height: ch, overflow: "hidden" }}>
                          <Img src={src("OBJ11")} style={{ position: "absolute", left: -i * cw, top: -j * ch, width: mw, height: mh }} />
                        </div>
                      );
                    })}
                  </World>
                  <Sys>
                    {Array.from({ length: 13 }, (_, i) => (
                      <line key={i} x1={96 + i * 144} x2={96 + i * 144} y1={0} y2={1080} stroke={ui} strokeWidth={1} opacity={0.35} />
                    ))}
                  </Sys>
                  <Cap t={t} li={99} x={96} y={160} size={72} />
                </>
              );
            },
          },
          // 0101 希望で手が汚れてる
          {
            s: l(100).start,
            e: l(101).start,
            r: (t) => {
              const n = steps(t, l(100).start, 2) + 1;
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG07h" zoom={1.4} opacity={0.4} />
                  </World>
                  <Char heat={heat}>
                    <Pic id="CH-H2b" cx={960} cy={470} w={1350} />
                  </Char>
                  <Sys>
                    {Array.from({ length: n }, (_, i) => (
                      <rect key={i} x={rndr(`bk${i}`, 560, 1300)} y={rndr(`bl${i}`, 300, 880)} width={rndr(`bw${i}`, 30, 140)} height={rndr(`bh${i}`, 16, 60)} fill="#000" transform={`rotate(${rndr(`br${i}`, -20, 20)})`} />
                    ))}
                  </Sys>
                  <Cap t={t} li={100} x={96} y={900} size={72} />
                </>
              );
            },
          },
          // 0102 あなたの澄んだ瞳の: the one cold-blue frame of the film
          {
            s: l(101).start,
            e: l(102).start,
            r: (t, p) => (
              <>
                <World heat={heat}>
                  <Bg id="BG08" zoom={1.3} opacity={0.6} />
                </World>
                <div style={{ position: "absolute", left: 980, top: 120, width: 760, height: 840, overflow: "hidden", outline: `2px solid ${BLUE}` }}>
                  <div style={{ position: "absolute", inset: 0, background: "#04101C" }} />
                  <div style={{ position: "absolute", inset: 0, filter: "grayscale(1) brightness(1.1) contrast(1.1)" }}>
                    <Pic id="OBJ12" cx={420 + p * 20} cy={480} h={900} />
                  </div>
                  <div style={{ position: "absolute", inset: 0, background: BLUE, mixBlendMode: "multiply" }} />
                </div>
                <Lyric text={l(101).text} t={t} start={l(101).start} end={l(101).end} x={96} y={760} size={92} weight={600} hi={{ 0: BLUE, 1: BLUE, 2: BLUE }} span={0.5} />
              </>
            ),
          },
          // 0103 色をした星に問いかけている: a blue star where the gray one was
          {
            s: l(102).start,
            e: l(102).end,
            r: (t, p) => (
              <>
                <World heat={heat}>
                  <Bg id="BG06a" zoom={1.35} py={-0.7} />
                </World>
                <Glow heat={0.85} cx={0.3} cy={1.05} strength={0.5} />
                <Sys>
                  <Glint x={STAR_POS.x} y={STAR_POS.y} s={9 + featS("vocal", t, 0.3) * 4} color={BLUE} t={t} />
                  <circle cx={STAR_POS.x} cy={STAR_POS.y} r={60} fill="none" stroke={BLUE} strokeWidth={1.5} strokeDasharray="6 8" />
                </Sys>
                <Char heat={heat}>
                  <Pic id="CH-F1" cx={620} cy={1000 - p * 40} h={1000} />
                </Char>
                <Lyric text={l(102).text} t={t} start={l(102).start} end={l(102).end} x={96} y={120} size={78} weight={500} span={0.55} />
              </>
            ),
          },
        ]}
      />
    </>
  );
};

