import React from "react";
import { heatAt, MINCHO, MONO, RED, WHITE } from "../lib/heat";
import { after, BEAT, clamp, easeIn, easeInOut, easeOut, feat, featS, L, noise, prog, pulse, quant, rnd, rndr, stepEase, steps } from "../lib/time";
import { Bg, Char, Light, Pic, picSize, Silhouette, src, Tile, World } from "../lib/world";
import { Black, Flash, Invert, Layer, RGBSplit, Shake, Slices } from "../fx/fx";
import { BlackStar, Br, Log, Sys, Target, Wave } from "../sys/sys";
import { branches, Branches, ptsStr, shards, zigzag } from "../sys/gen";
import { Cap, pal, Shots } from "./common";
import { Img } from "remotion";

const l = L;
const CAP_Y = 900;

// Collage debris pool for B (world pieces that pile up and are never cleared).
const POOL: [string, number, number, number][] = [
  // id, u, v, zoom
  ["BG01", 0.3, 0.7, 2],
  ["CH-E1", 0.25, 0.55, 2.5],
  ["BG02", 0.5, 0.5, 1.5],
  ["CH-N1", 0.5, 0.5, 2],
  ["BG03", 0.8, 0.4, 2],
  ["BG01b", 0.7, 0.6, 2.2],
  ["CH-E1", 0.75, 0.55, 2.5],
  ["BG02", 0.2, 0.3, 2.5],
  ["OBJ05", 0.5, 0.3, 1.5],
  ["BG03", 0.3, 0.7, 2.2],
];
const debris = (k: number, seed: string, heat: number) => {
  const [id, u, v, z] = POOL[k % POOL.length];
  const w = rndr(`${seed}w${k}`, 260, 560);
  const h = w * rndr(`${seed}h${k}`, 0.5, 0.9);
  return (
    <World key={`${seed}${k}`} heat={heat}>
      <Tile id={id} cx={rndr(`${seed}x${k}`, 120, 1800)} cy={rndr(`${seed}y${k}`, 100, 980)} w={w} h={h} rot={rndr(`${seed}r${k}`, -18, 18)} u={u} v={v} z={z} />
    </World>
  );
};

// Adults' head positions inside OBJ07 (fractions of the image).
const HEADS: [number, number][] = [
  [0.11, 0.16], [0.19, 0.22], [0.28, 0.2], [0.36, 0.24], [0.49, 0.13], [0.59, 0.22], [0.66, 0.19], [0.76, 0.21], [0.86, 0.17], [0.93, 0.2],
];

export const SceneB: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  const P = pal(heat);
  const ui = P.ui;

  return (
    <>
      <Black />
      <Shots
        t={t}
        list={[
          // 0005 電撃: a lightning slit opens onto her eyes
          {
            s: l(4).start,
            e: l(5).start,
            r: (t) => {
              const zz = zigzag(-40, 140, 1960, 980, 14, 70, "bolt");
              const open = stepEase(t, l(4).start, l(4).start + BEAT * 2, 2) * 150 + 6;
              const top = zz.map(([x, y]) => [x, y - open] as [number, number]);
              const bot = zz.map(([x, y]) => [x, y + open] as [number, number]).reverse();
              const poly = [...top, ...bot].map(([x, y]) => `${x}px ${y}px`).join(",");
              return (
                <>
                  <div style={{ position: "absolute", inset: 0, clipPath: `polygon(${poly})` }}>
                    <Char heat={heat}>
                      <Bg id="CH-E1" zoom={1.25} px={-0.1} />
                    </Char>
                  </div>
                  <Sys>
                    <polyline points={ptsStr(top)} fill="none" stroke={WHITE} strokeWidth={3} />
                    <polyline points={ptsStr(bot)} fill="none" stroke={WHITE} strokeWidth={3} />
                  </Sys>
                  <Cap t={t} li={4} x={96} y={120} size={78} />
                  <Flash a={after(t, l(4).start, 0.1)} />
                </>
              );
            },
          },
          // 0006 恐怖が血管の中に混ざる: veins grow out of the neck seam
          {
            s: l(5).start,
            e: l(6).start,
            r: (t) => {
              const g = stepEase(t, l(5).start, l(5).end, 4);
              const segs = [
                ...branches(1050, 490, -0.6, 260, 5, "v1"),
                ...branches(870, 575, 2.6, 260, 5, "v2"),
                ...branches(1240, 440, -1.4, 220, 5, "v3"),
                ...branches(960, 540, 1.6, 300, 6, "v4"),
              ];
              return (
                <>
                  <Shake t={t} amp={4} seed="b6">
                    <Char heat={heat}>
                      <Bg id="CH-N1" zoom={1.08 + 0.04 * prog(t, l(5).start, l(5).end)} />
                    </Char>
                    <Sys>
                      <Branches segs={segs} grow={g} color={RED} width={2.2} />
                    </Sys>
                  </Shake>
                  <Cap t={t} li={5} x={96} y={CAP_Y} />
                </>
              );
            },
          },
          // 0007 微粒子の濃い煙の向こうに: smoke layers drift, dots step upward
          {
            s: l(6).start,
            e: l(7).start,
            r: (t) => {
              const s = steps(t, l(6).start, 2);
              const d = t - l(6).start;
              return (
                <>
                  <World heat={heat} pre="brightness(1.5) contrast(1.3)">
                    <Bg id="BG02" zoom={1.3} px={noise(d * 0.6, "s1")} py={noise(d * 0.5, "s2")} />
                    <Bg id="BG02" zoom={1.6} px={noise(d * 0.7 + 4, "s3")} py={-0.5 + d * 0.3} rot={180} opacity={0.5} />
                    <Bg id="BG02" zoom={2.2} px={0.5 - d * 0.4} py={noise(d, "s5")} opacity={0.35} />
                  </World>
                  <Sys>
                    {Array.from({ length: 24 * 14 }, (_, i) => {
                      const cx = (i % 24) * 80 + 40;
                      const row = Math.floor(i / 24);
                      const cy = ((row * 80 - s * 40) % 1120 + 1120) % 1120;
                      const on = rnd(`dot${i}`) < 0.35;
                      return on ? <rect key={i} x={cx} y={cy} width={4} height={4} fill={ui} opacity={0.7} /> : null;
                    })}
                  </Sys>
                  <Cap t={t} li={6} x={96} y={CAP_Y} />
                </>
              );
            },
          },
          // 0008 黒い鎖鎌がついてきている: a black sickle silhouette sweeps across a pale field
          {
            s: l(7).start,
            e: l(8).start,
            r: (t) => {
              const p = prog(t, l(7).start, l(7).end);
              const field = `rgb(${P.g.stops[4].map(Math.round).join(",")})`;
              return (
                <>
                  <Layer style={{ background: field }} />
                  {[0.12, 0.06, 0].map((lag, k) => {
                    const q = clamp(p - lag);
                    return (
                      <Silhouette
                        key={k}
                        id="OBJ01"
                        cx={2100 - q * 1900}
                        cy={420 + Math.sin(q * 3) * 120}
                        w={900}
                        rot={-40 + q * 260}
                        color="#000"
                        opacity={k === 2 ? 1 : 0.18}
                      />
                    );
                  })}
                  <Cap t={t} li={7} x={96} y={CAP_Y} plate="#000" />
                </>
              );
            },
          },
          // 0009–0016 消去しても×8: deleted, but every deletion leaves a ghost
          {
            s: l(8).start,
            e: l(16).start,
            r: (t) => {
              const k = Math.min(7, Math.max(0, [8, 9, 10, 11, 12, 13, 14, 15].filter((i) => t >= l(i).start).length - 1));
              const cur = l(8 + k);
              const del = prog(quant(t, 4), cur.start + (cur.end - cur.start) * 0.5, cur.end);
              const word = "消去しても";
              const ghosts = Array.from({ length: k }, (_, i) => i);
              return (
                <>
                  {Array.from({ length: k + 3 }, (_, i) => debris(i, "e", heat))}
                  <Layer style={{ background: "rgba(0,0,0,0.35)" }} />
                  {ghosts.map((i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: 960 + rndr(`gx${i}`, -520, 420),
                        top: 540 + rndr(`gy${i}`, -380, 300),
                        transform: "translate(-50%,-50%)",
                        fontFamily: MINCHO,
                        fontWeight: 900,
                        fontSize: 130,
                        color: i % 2 ? ui : RED,
                        opacity: 0.55,
                        whiteSpace: "nowrap",
                        textDecoration: "line-through",
                        textDecorationThickness: 10,
                      }}
                    >
                      {word}
                    </div>
                  ))}
                  <div
                    style={{
                      position: "absolute",
                      left: 960,
                      top: 540,
                      transform: "translate(-50%,-50%)",
                      fontFamily: MINCHO,
                      fontWeight: 900,
                      fontSize: 190,
                      color: WHITE,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {word}
                    <div style={{ position: "absolute", left: 0, top: "18%", height: "64%", width: `${del * 100}%`, background: "#000" }} />
                  </div>
                  <Sys>
                    <Log
                      t={t}
                      t0={l(8).start}
                      lines={Array.from({ length: 8 }, (_, i) => `rm memory[${i}] ...... ok  (still here)`)}
                      x={110}
                      y={160}
                      ui={ui}
                      div={2 / 3}
                      plate={P.plate}
                      max={8}
                      w={560}
                    />
                  </Sys>
                </>
              );
            },
          },
          // 0017 無くならないの: ghosts collapse into one line, the strike bars fall
          {
            s: l(16).start,
            e: l(17).start,
            r: (t) => {
              const c = stepEase(t, l(16).start, l(16).start + BEAT * 2, 1);
              const fall = Math.max(0, t - l(16).start - BEAT * 2);
              return (
                <>
                  {Array.from({ length: 11 }, (_, i) => debris(i, "e", heat))}
                  <Layer style={{ background: "rgba(0,0,0,0.55)" }} />
                  {Array.from({ length: 7 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: 960 + rndr(`gx${i}`, -520, 420) * (1 - c),
                        top: 540 + rndr(`gy${i}`, -380, 300) * (1 - c) + fall * fall * 900 * (i % 3 === 0 ? 1 : 0),
                        width: 600,
                        height: 10,
                        background: i % 2 ? ui : RED,
                        transform: `translate(-50%,-50%) rotate(${fall * rndr(`fr${i}`, -90, 90)}deg)`,
                        opacity: 0.8,
                      }}
                    />
                  ))}
                  <Cap t={t} li={16} x={960} y={490} size={120} anchor="middle" span={0.3} weight={900} />
                </>
              );
            },
          },
          // 0018–0019 喉 / 叫んだ音は既に列を成さないで
          {
            s: l(17).start,
            e: l(19).start,
            r: (t) => {
              const scream = t >= l(18).start;
              const v = featS("vocal", t, 0.1);
              const text = l(18).text;
              const n = [...text].length;
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG02" zoom={2} opacity={0.35} />
                  </World>
                  <Shake t={t} amp={scream ? 6 : 0} seed="thr">
                    <Char heat={heat}>
                      <Pic id="CH-F1" cx={1380} cy={600} h={1060} />
                    </Char>
                  </Shake>
                  <Sys>
                    <Wave x0={0} x1={1240} y={672} amp={scream ? 40 + v * 160 : 2} t={t} color={WHITE} sharp={scream ? 1 : 0} width={scream ? 3 : 2} n={scream ? 240 : 60} />
                  </Sys>
                  <Cap t={t} li={17} x={96} y={160} size={72} />
                  {scream &&
                    [...text].map((ch, i) => {
                      const tr = l(18).start + ((l(18).end - l(18).start) * 0.6 * i) / n;
                      if (quant(t, 4) < tr) return null;
                      const age = Math.max(0, t - tr - BEAT);
                      return (
                        <div
                          key={i}
                          style={{
                            position: "absolute",
                            left: 110 + i * 74 + age * rndr(`cx${i}`, -120, 120),
                            top: 800 + age * age * rndr(`cy${i}`, 300, 900),
                            fontFamily: MINCHO,
                            fontWeight: 800,
                            fontSize: 72,
                            color: WHITE,
                            transform: `rotate(${age * rndr(`cr${i}`, -240, 240)}deg)`,
                          }}
                        >
                          {ch}
                        </div>
                      );
                    })}
                </>
              );
            },
          },
          // 0020–0021 安楽椅子の上 / 腐りきった三日月が笑っている
          {
            s: l(19).start,
            e: l(21).start,
            r: (t) => {
              const d = t - l(19).start;
              const lock = stepEase(t, l(20).start, l(20).start + BEAT * 3, 2);
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG03" zoom={1.12 + d * 0.015} px={0.2} />
                  </World>
                  <Light id="OBJ03" heat={heat} cx={1700} cy={300} w={130} />
                  <World heat={heat}>
                    <Pic id="OBJ02" cx={760} cy={700} h={560} rot={noise(d * 0.8, "ch") * 2} />
                  </World>
                  <Sys>
                    {t >= l(20).start && <Target x={1700} y={300} r={90} lock={lock} color={ui} label="OBJ: MOON" sub="STATUS: ROTTEN" />}
                  </Sys>
                  <Cap t={t} li={19} x={96} y={CAP_Y} />
                  <Cap t={t} li={20} x={96} y={CAP_Y} />
                </>
              );
            },
          },
          // 0022–0030 もう / すぐそこまで×8: a perspective tunnel, frames rush the camera
          {
            s: l(21).start,
            e: l(30).start,
            r: (t) => {
              const k = [22, 23, 24, 25, 26, 27, 28, 29].filter((i) => t >= l(i).start).length; // 0..8
              const kick = after(t, k > 0 ? l(21 + k).start : l(21).start, 0.12);
              const frames = Array.from({ length: 9 }, (_, i) => i);
              const vx = 960;
              const vy = 520;
              const sickle = 70 * 1.42 ** k;
              return (
                <>
                  <Shake t={t} amp={2 + kick * 14} seed="tun">
                    <Layer style={{ background: `radial-gradient(ellipse 30% 30% at ${vx}px ${vy}px, rgb(${P.g.stops[3].map(Math.round).join(",")}) 0%, rgb(${P.g.stops[2].map(Math.round).join(",")}) 35%, #000 100%)` }} />
                    <Sys>
                      {[[0, 0], [1920, 0], [0, 1080], [1920, 1080]].map(([x, y], i) => (
                        <line key={i} x1={x} y1={y} x2={vx} y2={vy} stroke={ui} strokeWidth={1.5} opacity={0.5} />
                      ))}
                      {Array.from({ length: 14 }, (_, i) => {
                        const z = i + 1 - k;
                        if (z < 0.6) return null;
                        const w = 1900 / z;
                        const h = 1060 / z;
                        return (
                          <g key={i}>
                            <rect x={vx - w / 2} y={vy - h / 2} width={w} height={h} fill="none" stroke={ui} strokeWidth={Math.min(5, 0.8 + 4 / z)} opacity={clamp(1.3 - z / 12)} />
                            {z < 6 && (
                              <text x={vx - w / 2 + 8} y={vy - h / 2 - 8} fontFamily={MONO} fontSize={Math.max(10, 28 / z)} fill={ui} opacity={0.8}>
                                {`-${(z * 1.0).toFixed(1)}m`}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </Sys>
                    <Silhouette id="OBJ01" cx={vx} cy={vy} w={sickle} rot={-20 + k * 4} color="#000" />
                    <Sys>
                      <Target x={vx} y={vy} r={sickle * 0.45 + 20} color={RED} label={`DIST -${Math.max(1, 8 - k + 1)}m`} sub="UNKNOWN / APPROACHING" />
                    </Sys>
                  </Shake>
                  {k > 0 && (
                    <div style={{ position: "absolute", left: 960, top: 820, transform: "translateX(-50%)", fontFamily: MINCHO, fontWeight: 900, fontSize: 92 + k * 10, color: WHITE, whiteSpace: "nowrap" }}>
                      すぐそこまで
                    </div>
                  )}
                  <Cap t={t} li={21} x={960} y={820} size={92} anchor="middle" />
                  <Sys>
                    <text x={960} y={980} textAnchor="middle" fontFamily={MONO} fontSize={28} fill={ui} letterSpacing={6}>
                      {`${"■".repeat(k)}${"□".repeat(8 - k)}`}
                    </text>
                  </Sys>
                </>
              );
            },
          },
          // 0031 なにかが来ている: the silhouette fills the frame, inverts, then black
          {
            s: l(30).start,
            e: 43.0,
            r: (t) => {
              const p = easeIn(prog(t, l(30).start, 42.75));
              const inv = t > 42.75 && t < 42.88;
              return (
                <Invert on={inv}>
                  <Layer style={{ background: `rgb(${P.g.stops[3].map(Math.round).join(",")})` }} />
                  <Silhouette id="OBJ01" cx={960} cy={520} w={70 * 1.42 ** 8 + p * 5200} rot={12 + p * 30} color="#000" />
                  <Cap t={t} li={30} x={960} y={860} size={96} anchor="middle" until={42.75} weight={900} />
                </Invert>
              );
            },
          },
          // B′: only the brackets close in the dark
          {
            s: 43.0,
            e: l(31).start,
            r: (t) => {
              const c = stepEase(t, 43.0, 43.0 + BEAT * 3, 1);
              const gap = 520 - c * 380;
              return (
                <Sys>
                  <Br x={960 - gap} y={540 - 120} s={150} color={WHITE} w={6} />
                  <Br x={960 + gap} y={540 + 120} s={150} close color={WHITE} w={6} />
                </Sys>
              );
            },
          },
          // 0032–0035 大声で泣いた後 + three breathing columns
          {
            s: l(31).start,
            e: l(36).start,
            r: (t) => {
              const s = steps(t, l(31).start, 1);
              const wts = [1 + 0.8 * (s % 3 === 0 ? 1 : 0), 1 + 0.8 * (s % 3 === 1 ? 1 : 0), 1 + 0.8 * (s % 3 === 2 ? 1 : 0)];
              const total = wts.reduce((a, b) => a + b, 0);
              const gap = 14;
              let x = 0;
              const cols = wts.map((w, i) => {
                const cw = ((1920 - gap * 2) * w) / total;
                const c = { x, w: cw, i };
                x += cw + gap;
                return c;
              });
              const impact = after(t, l(31).start, 0.12);
              const mata = t >= l(35).start;
              return (
                <>
                  {!mata &&
                    cols.map((c) => (
                      <div key={c.i} style={{ position: "absolute", left: c.x, top: 0, width: c.w, height: 1080, overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: -c.x, top: 0, width: 1920, height: 1080 }}>
                          {c.i === 0 && (
                            <World heat={heat + 0.1}>
                              <Bg id="BG02" zoom={1.4} opacity={0.6} />
                              <Pic id="OBJ04" cx={c.x + c.w / 2} cy={560} h={1050} rot={noise(t, "flag") * 4} />
                            </World>
                          )}
                          {c.i === 1 && (
                            <Char heat={heat}>
                              <Pic id="CH-E1" cx={c.x + c.w / 2 + 380} cy={540} w={3200} />
                            </Char>
                          )}
                          {c.i === 2 && (
                            <World heat={heat}>
                              <Pic id="OBJ05" cx={c.x + c.w / 2} cy={540 + noise(t * 0.5, "cof") * 30} w={Math.max(c.w, 760)} />
                            </World>
                          )}
                        </div>
                      </div>
                    ))}
                  <Cap t={t} li={31} x={960} y={470} size={120} anchor="middle" weight={900} />
                  <Cap t={t} li={32} x={60} y={CAP_Y} size={64} />
                  <Cap t={t} li={33} x={60} y={CAP_Y} size={64} />
                  <Cap t={t} li={34} x={60} y={CAP_Y} size={64} />
                  {mata && (
                    <div style={{ position: "absolute", left: 960, top: 540, transform: "translate(-50%,-50%)", fontFamily: MINCHO, fontSize: 64, color: WHITE }}>また</div>
                  )}
                  <Invert on={impact > 0.3}>
                    <Flash a={impact} />
                  </Invert>
                </>
              );
            },
          },
          // 0037–0044 どうかしてる×8: columns swap every half beat, rows pile up, channels split
          {
            s: l(36).start,
            e: l(44).start,
            r: (t) => {
              const s = steps(t, l(36).start, 2);
              const k = [36, 37, 38, 39, 40, 41, 42, 43].filter((i) => t >= l(i).start).length;
              const perm = [[0, 1, 2], [2, 0, 1], [1, 2, 0], [0, 2, 1], [2, 1, 0], [1, 0, 2]][s % 6];
              const cw = 640;
              return (
                <RGBSplit d={k * 3 + pulse(t, 2) * 10}>
                  <Slices t={t} amount={k / 14} seed="dk">
                    {perm.map((which, pos) => (
                      <div key={which} style={{ position: "absolute", left: pos * cw, top: 0, width: cw - 10, height: 1080, overflow: "hidden" }}>
                        {which === 0 && (
                          <World heat={heat + 0.1}>
                            <Pic id="OBJ04" cx={cw / 2} cy={560} h={1050} />
                          </World>
                        )}
                        {which === 1 && (
                          <Char heat={heat}>
                            <Pic id="CH-E1" cx={cw / 2 - 300 + (s % 2) * 600} cy={540} w={2600} />
                          </Char>
                        )}
                        {which === 2 && (
                          <World heat={heat}>
                            <Pic id="OBJ05" cx={cw / 2} cy={540} w={760} />
                          </World>
                        )}
                      </div>
                    ))}
                    {Array.from({ length: k }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: 960 + (rnd(`dkx${i}`) * 2 - 1) * (4 + i * 2) * 4,
                          top: 70 + i * 118,
                          transform: "translateX(-50%)",
                          background: i === k - 1 ? "#000" : "transparent",
                          padding: "0 24px",
                          fontFamily: MINCHO,
                          fontWeight: 900,
                          fontSize: 92,
                          lineHeight: 1.2,
                          color: i === k - 1 ? WHITE : ui,
                          opacity: i === k - 1 ? 1 : 0.75,
                          whiteSpace: "nowrap",
                        }}
                      >
                        どうかしてる
                      </div>
                    ))}
                  </Slices>
                </RGBSplit>
              );
            },
          },
          // 0045–0049 そう囁いた〜乗りこんだ舟は爆ぜた
          {
            s: l(44).start,
            e: l(49).start,
            r: (t) => {
              const d = t - l(44).start;
              const burst = quant(l(48).start + 0.85, 2);
              const bp = t >= burst ? t - burst : -1;
              const inv = bp >= 0 && bp < 0.1;
              const [aw, ah] = picSize("OBJ06", 560);
              const ax = 1180 + d * 6;
              const ay = 612;
              return (
                <Invert on={inv}>
                  <World heat={heat}>
                    <Bg id="BG04" zoom={1.05} px={-0.8 + d * 0.22} py={0.1} />
                    {bp < 0 ? (
                      <Pic id="OBJ06" cx={ax} cy={ay} w={aw} />
                    ) : (
                      shards(aw, ah, 5, 3, "ark").map((tri, i) => {
                        const c = tri.reduce((a, p) => [a[0] + p[0] / 3, a[1] + p[1] / 3], [0, 0]);
                        const dir = Math.atan2(c[1] - ah / 2, c[0] - aw / 2) + rndr(`ad${i}`, -0.4, 0.4);
                        const sp = rndr(`as${i}`, 300, 1100) * easeOut(bp * 2);
                        return (
                          <div
                            key={i}
                            style={{
                              position: "absolute",
                              left: ax - aw / 2,
                              top: ay - ah / 2,
                              width: aw,
                              height: ah,
                              clipPath: `polygon(${tri.map(([x, y]) => `${x}px ${y}px`).join(",")})`,
                              transform: `translate(${Math.cos(dir) * sp}px, ${Math.sin(dir) * sp + bp * bp * 400}px) rotate(${bp * rndr(`ar${i}`, -300, 300)}deg)`,
                              transformOrigin: `${c[0]}px ${c[1]}px`,
                            }}
                          >
                            <Img src={src("OBJ06")} style={{ width: aw, height: ah }} />
                          </div>
                        );
                      })
                    )}
                    <Pic id="OBJ07" cx={820 + noise(d * 0.3, "ad") * 10} cy={960} w={1500} />
                  </World>
                  <Sys>
                    {t >= l(45).start && t < l(47).start && (
                      <g opacity={0.6}>
                        {Array.from({ length: 21 }, (_, i) => (
                          <line key={i} x1={960} y1={612} x2={-1500 + i * 245} y2={1080} stroke={ui} strokeWidth={1} />
                        ))}
                        {[0.08, 0.2, 0.4, 0.7].map((f, i) => (
                          <line key={`h${i}`} x1={0} x2={1920} y1={612 + f * 468} y2={612 + f * 468} stroke={ui} strokeWidth={1} />
                        ))}
                        <line x1={0} x2={1920} y1={612} y2={612} stroke={ui} strokeWidth={2} />
                      </g>
                    )}
                  </Sys>
                  <Cap t={t} li={44} x={96} y={160} size={64} />
                  {[45, 46].map((li) =>
                    t >= l(li).start && t < l(47).start ? (
                      <div key={li} style={{ position: "absolute", left: 960, top: li === 45 ? 260 : 380, transform: "translateX(-50%)", fontFamily: MINCHO, fontWeight: 200, fontSize: li === 45 ? 64 : 96, color: WHITE, letterSpacing: "0.2em", whiteSpace: "nowrap", textShadow: "0 0 18px rgba(0,0,0,0.6)" }}>
                        {l(li).text}
                      </div>
                    ) : null,
                  )}
                  <Cap t={t} li={47} x={96} y={160} size={64} />
                  <Cap t={t} li={48} x={96} y={160} size={64} />
                  <Flash a={bp >= 0 ? after(t, burst, 0.25) * 0.8 : 0} />
                </Invert>
              );
            },
          },
          // 0050–0058 黒い星が×8 → 彼らを見ている
          {
            s: l(49).start,
            e: l(58).start,
            r: (t) => {
              const k = [49, 50, 51, 52, 53, 54, 55, 56].filter((i) => t >= l(i).start).length;
              const watch = t >= l(57).start;
              const r = 30 * 1.33 ** k * (1 + pulse(t, 2) * 0.04);
              const sx = 960;
              const sy = 300;
              const [ow, oh] = picSize("OBJ07", 1500);
              const ox = 820 - ow / 2;
              const oy = 960 - oh / 2;
              const locked = watch ? Math.min(HEADS.length, steps(t, l(57).start, 4) + 1) : 0;
              return (
                <>
                  <World heat={heat + 0.04}>
                    <Bg id="BG04" zoom={1.05} px={0.65} py={0.1} />
                  </World>
                  {/* debris being pulled toward the star */}
                  {Array.from({ length: 10 }, (_, i) => {
                    const pull = clamp(k / 8 - i * 0.04);
                    const x0 = rndr(`px${i}`, 80, 1840);
                    const y0 = rndr(`py${i}`, 120, 700);
                    return (
                      <div key={i} style={{ position: "absolute", inset: 0, transform: `translate(${(sx - x0) * pull * 0.9}px, ${(sy - y0) * pull * 0.9}px) rotate(${pull * 40}deg) scale(${1 - pull * 0.7})`, transformOrigin: `${x0}px ${y0}px` }}>
                        {debris(i, "pull", heat)}
                      </div>
                    );
                  })}
                  <World heat={heat}>
                    <Pic id="OBJ07" cx={820} cy={960} w={1500} />
                  </World>
                  <Sys>
                    <BlackStar x={sx} y={sy} r={r} rim={ui} t={t} />
                    {Array.from({ length: k }, (_, i) => {
                      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
                      const rr = r * 2.9 + 40;
                      return (
                        <text key={i} x={sx + Math.cos(a) * rr} y={sy + Math.sin(a) * rr * 0.62 + 20} textAnchor="middle" fontFamily={MINCHO} fontWeight={900} fontSize={44} fill={WHITE} stroke="#000" strokeWidth={6} paintOrder="stroke">
                          黒い星が
                        </text>
                      );
                    })}
                    {HEADS.slice(0, locked).map(([u, v], i) => (
                      <Target key={i} x={ox + u * ow} y={oy + v * oh} r={34} color={RED} label={`TARGET ${String(i + 1).padStart(2, "0")}`} />
                    ))}
                  </Sys>
                  <Cap t={t} li={57} x={960} y={600} size={90} anchor="middle" weight={900} />
                </>
              );
            },
          },
        ]}
      />
    </>
  );
};

