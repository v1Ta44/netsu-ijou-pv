import React from "react";
import { heatAt, MINCHO, MONO, RED, WHITE } from "../lib/heat";
import { after, BEAT, clamp, easeIn, easeInOut, featS, HITS, L, noise, prog, pulse, quant, rnd, rndr, stepEase, steps } from "../lib/time";
import { Bg, Char, Pic, picSize, src, Tile, World } from "../lib/world";
import { Black, Flash, Haze, Invert, Layer, RGBSplit, Shake, Slices } from "../fx/fx";
import { BlackStar, Br, Sys, Tag, Target, Wave } from "../sys/sys";
import { Cap, pal, Shots } from "./common";

const l = L;
const CAP_Y = 900;

const count = (t: number, from: number, to: number) => {
  let n = 0;
  for (let i = from; i <= to; i++) if (t >= l(i).start) n++;
  return n;
};

export const SceneE: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  const P = pal(heat);
  const ui = P.ui;
  return (
    <>
      <Black />
      <Shots
        t={t}
        list={[
          // 0067–0068 悲しみは / やがて流れ落ち塩になる: drops through the fingers become salt
          {
            s: l(66).start,
            e: l(68).start,
            r: (t) => {
              const s0 = l(66).start;
              const n = steps(t, s0, 2) + 1;
              const salt = t >= l(67).start ? steps(t, l(67).start, 4) + 1 : 0;
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG06a" zoom={1.4} opacity={0.4} />
                  </World>
                  <Char heat={heat}>
                    <Pic id="CH-H2a" cx={960} cy={330} w={1250} />
                  </Char>
                  <Sys>
                    {Array.from({ length: n }, (_, i) => {
                      const born = s0 + (i * BEAT) / 2;
                      const age = t - born;
                      const x = 960 + rndr(`dr${i}`, -60, 60);
                      const y = 650 + age * age * 1600;
                      if (y > 980) return null;
                      return <path key={i} d={`M${x} ${y - 16} Q${x + 7} ${y} ${x} ${y + 6} Q${x - 7} ${y} ${x} ${y - 16} Z`} fill={WHITE} opacity={0.9} />;
                    })}
                    {/* salt lattice */}
                    {Array.from({ length: Math.min(60, salt * 3) }, (_, i) => {
                      const col = (i * 7) % 30;
                      const row = Math.floor(i / 12);
                      const hx = 960 + (col - 15) * 34 + (row % 2) * 17 + rndr(`sx${i}`, -4, 4);
                      const hy = 1000 - row * 30;
                      const r = 15;
                      const pts = Array.from({ length: 6 }, (_, k) => `${hx + r * Math.cos((k * Math.PI) / 3)},${hy + r * Math.sin((k * Math.PI) / 3)}`).join(" ");
                      return <polygon key={i} points={pts} fill={i % 4 ? "none" : WHITE} stroke={WHITE} strokeWidth={1.5} opacity={0.85} />;
                    })}
                  </Sys>
                  <Cap t={t} li={66} x={96} y={120} size={64} />
                  <Cap t={t} li={67} x={96} y={120} size={64} />
                </>
              );
            },
          },
          // 0069 祈り 苦しみ 同情: three words, three tags
          {
            s: l(68).start,
            e: l(69).start,
            r: (t) => {
              const words = ["祈り", "苦しみ", "同情"];
              const k = Math.min(3, steps(t, l(68).start, 1) + 1);
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG03" zoom={1.3} opacity={0.35} />
                  </World>
                  {words.slice(0, k).map((w, i) => (
                    <div key={w} style={{ position: "absolute", left: 300 + i * 620, top: 330, transform: "translateX(-50%)", fontFamily: MINCHO, fontWeight: 800, fontSize: 150, color: WHITE, whiteSpace: "nowrap" }}>
                      {w}
                    </div>
                  ))}
                  <Sys>
                    {words.slice(0, k).map((w, i) => (
                      <Tag key={w} x={300 + i * 620} y={640 + Math.sin(t * 4 + i) * 6} rot={Math.sin(t * 3 + i * 2) * 8} text={`¥${Math.floor(rnd(`p${i}${Math.floor(t * 8)}`) * 999)}`} color={ui} s={1.4} />
                    ))}
                  </Sys>
                </>
              );
            },
          },
          // 0070 憐れみにさえ じきに値がつく: tags paper over her, prices race, SOLD
          {
            s: l(69).start,
            e: l(70).start,
            r: (t) => {
              const n = steps(t, l(69).start, 4) + 1;
              const sold = t > l(69).end - BEAT * 1.5;
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG03" zoom={1.2} opacity={0.5} />
                  </World>
                  <Char heat={heat}>
                    <Pic id="CH02" cx={960} cy={720} h={1500} />
                  </Char>
                  <Sys>
                    {Array.from({ length: Math.min(n, 22) }, (_, i) => (
                      <Tag
                        key={i}
                        x={rndr(`tx${i}`, 640, 1240)}
                        y={rndr(`ty${i}`, 260, 1000)}
                        rot={rndr(`tr${i}`, -30, 30)}
                        text={sold ? "SOLD" : `¥${Math.floor(rnd(`tp${i}${Math.floor(t * 12)}`) * 99999)}`}
                        color={sold ? RED : ui}
                        ink={sold ? WHITE : "#000"}
                        s={1.1}
                      />
                    ))}
                  </Sys>
                  <Cap t={t} li={69} x={96} y={CAP_Y} />
                </>
              );
            },
          },
          // 0071–0077 今 背を向けても×7: each time a step back and one more bracket
          {
            s: l(70).start,
            e: l(77).start,
            r: (t) => {
              const k = count(t, 70, 76); // 1..7
              const S = 1.0 * 0.72 ** (k - 1);
              const cx = 1250;
              const cy = 540;
              return (
                <>
                  <div style={{ position: "absolute", inset: 0, transform: `scale(${S})`, transformOrigin: `${cx}px ${cy}px` }}>
                    <World heat={heat}>
                      <Bg id="BG07" zoom={1.0} opacity={0.6} />
                    </World>
                    <Char heat={heat}>
                      <Pic id="CH03" cx={cx} cy={cy + 160} h={1400} />
                    </Char>
                  </div>
                  <Sys>
                    {Array.from({ length: k }, (_, i) => {
                      const s = 0.72 ** i;
                      const w = 900 * S / s;
                      const h = 1200 * S / s;
                      return (
                        <g key={i} opacity={i === k - 1 ? 1 : 0.6}>
                          <Br x={cx - w / 2} y={cy - h / 2} s={Math.min(220, 60 / s)} color={WHITE} w={3} />
                          <Br x={cx + w / 2} y={cy + h / 2} s={Math.min(220, 60 / s)} close color={WHITE} w={3} />
                        </g>
                      );
                    })}
                  </Sys>
                  <Cap t={t} li={70 + k - 1} x={96} y={CAP_Y} size={72} span={0.3} />
                </>
              );
            },
          },
          // 0078 鮮明に聞こえる悲鳴が: the screen is all scream
          {
            s: l(77).start,
            e: l(78).start,
            r: (t) => {
              const v = featS("vocal", t, 0.08);
              return (
                <Slices t={t} amount={0.3 + pulse(t, 2) * 0.4} seed="scr">
                  <Sys>
                    {Array.from({ length: 9 }, (_, i) => (
                      <Wave key={i} x0={-20} x1={1940} y={120 + i * 105} amp={30 + v * 120 + i * 4} t={t + i * 0.37} color={i % 3 === 0 ? RED : i % 3 === 1 ? WHITE : ui} sharp={1} width={i % 3 === 1 ? 3 : 2} n={300} seed={`s${i}`} />
                    ))}
                  </Sys>
                  <Cap t={t} li={77} x={960} y={480} size={96} anchor="middle" weight={900} />
                </Slices>
              );
            },
          },
          // 0079–0082 幸福を手放す〜自意識の海を泳ぐ: her silhouette is a deep sea; then blood rises
          {
            s: l(78).start,
            e: l(82).start,
            r: (t) => {
              const d = t - l(78).start;
              const [w, h] = picSize("CH04", undefined, 1300);
              const blood = t >= l(81).start ? easeIn(prog(t, l(81).start, l(81).end)) : 0;
              const level = 1080 - blood * 1200;
              const wv = Array.from({ length: 41 }, (_, i) => `${i * 48},${level + Math.sin(i * 0.7 + t * 6) * 14}`).join(" ");
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG07" zoom={1.1} opacity={0.25} />
                  </World>
                  <div
                    style={{
                      position: "absolute",
                      left: 1150 - w / 2,
                      top: 540 - h / 2 + 120,
                      width: w,
                      height: h,
                      WebkitMaskImage: `url(${src("CH04")})`,
                      WebkitMaskSize: "100% 100%",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ position: "absolute", left: -(1150 - w / 2), top: -(540 - h / 2 + 120), width: 1920, height: 1080 }}>
                      <World heat={0.04} pre="brightness(1.7)">
                        <Bg id="BG06a" zoom={1.3} px={noise(d * 0.2, "sea")} />
                        <Pic id="OBJ09" cx={1950 - d * 420} cy={330 + Math.sin(d * 2) * 30} w={950} rot={Math.sin(d * 2.4) * 4} />
                      </World>
                    </div>
                  </div>
                  <Sys>
                    <polygon points={`0,1080 ${wv} 1920,1080`} fill="#5A0303" opacity={0.92} />
                    <polyline points={wv} fill="none" stroke={RED} strokeWidth={3} />
                  </Sys>
                  <Cap t={t} li={78} x={96} y={160} size={64} />
                  <Cap t={t} li={79} x={96} y={160} size={64} />
                  <Cap t={t} li={80} x={96} y={160} size={64} />
                  <Cap t={t} li={81} x={96} y={160} size={64} />
                </>
              );
            },
          },
          // 0083–0091 黒い星が×8 out of her own pupil → 私を見ている
          {
            s: l(82).start,
            e: l(90).end,
            r: (t) => {
              const k = count(t, 82, 89);
              const z = 1.6 + k * 0.08;
              const px = 960 + (1395 - 960) * z;
              const py = 540 + (585 - 540) * z;
              const last = t >= l(90).start ? easeIn(prog(t, l(90).start, l(90).end - 0.2)) : 0;
              const r = 34 * 1.42 ** k + last * 2600;
              return (
                <>
                  <Shake t={t} amp={2 + k} seed="e9">
                    <Char heat={heat}>
                      <div style={{ position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: "50% 50%" }}>
                        <Bg id="CH-E1" />
                      </div>
                    </Char>
                  </Shake>
                  <Sys>
                    <BlackStar x={px} y={py} r={r} rim={ui} t={t} />
                    {Array.from({ length: k }, (_, i) => {
                      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
                      const rr = r * 2.6 + 60;
                      return (
                        <text key={i} x={px + Math.cos(a) * rr} y={py + Math.sin(a) * rr * 0.7} textAnchor="middle" fontFamily={MINCHO} fontWeight={900} fontSize={46} fill={WHITE} stroke="#000" strokeWidth={6} paintOrder="stroke">
                          黒い星が
                        </text>
                      );
                    })}
                  </Sys>
                  {t >= l(90).start && (
                    <div style={{ position: "absolute", left: 960, top: 470, transform: "translateX(-50%)", fontFamily: MINCHO, fontWeight: 900, fontSize: 120, color: WHITE, whiteSpace: "nowrap" }}>
                      私を見ている
                    </div>
                  )}
                </>
              );
            },
          },
        ]}
      />
    </>
  );
};

// ---------------- F1: silence + hits ----------------
type Flashable = (heat: number, t: number) => React.ReactNode;
const F1_FLASH: Flashable[] = [
  (h) => <World heat={h}><Pic id="OBJ14" cx={960} cy={540} w={900} /></World>,
  (h) => <Char heat={h}><Bg id="CH-E1" zoom={2.2} px={0.6} /></Char>,
  (h) => <World heat={0.04}><Pic id="OBJ09" cx={960} cy={540} w={1500} /></World>,
  (h, t) => <Sys><BlackStar x={960} y={540} r={220} rim={WHITE} t={t} /></Sys>,
  (h) => <Char heat={h}><Pic id="CH03" cx={960} cy={700} h={1500} /></Char>,
  (h) => <Char heat={h}><Pic id="CH-H2a" cx={960} cy={540} w={1500} /></Char>,
  (h) => <World heat={h}><Pic id="OBJ08" cx={960} cy={600} h={1300} rot={8} /></World>,
  (h) => <World heat={h}><Bg id="BG05" /></World>,
  (h) => <World heat={h}><Pic id="OBJ07" cx={960} cy={600} w={1800} /></World>,
  (h) => <World heat={h}><Pic id="OBJ05" cx={960} cy={540} w={1100} /></World>,
  (h) => <World heat={h}><Pic id="OBJ04" cx={960} cy={540} h={1060} /></World>,
  (h) => <Sys><Br x={420} y={180} s={420} color={WHITE} w={16} /><Br x={1500} y={900} s={420} close color={WHITE} w={16} /></Sys>,
  (h) => <World heat={h}><Pic id="OBJ02" cx={960} cy={560} h={950} /></World>,
  (h) => <Char heat={h}><Pic id="CH-F1" cx={960} cy={560} h={1100} /></Char>,
  (h) => <World heat={h}><Pic id="OBJ01" cx={960} cy={540} w={1000} /></World>,
  (h) => <Char heat={h}><Bg id="CH-N1" /></Char>,
  (h) => <Char heat={h}><Pic id="CH-H1" cx={960} cy={560} w={1600} /></Char>,
  (h) => <Char heat={h}><Pic id="CH01" cx={960} cy={560} h={1000} /></Char>,
  (h) => <World heat={h}><Bg id="BG01" /></World>,
];
const F1_HITS = HITS.filter(([ht, s]) => ht >= 132.9 && ht < 142.7 && s >= 0.5);

export const SceneF1: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  let idx = -1;
  for (let i = 0; i < F1_HITS.length; i++) if (F1_HITS[i][0] <= t) idx = i;
  const on = idx >= 0 && t - F1_HITS[idx][0] < (F1_HITS[idx][1] > 0.9 ? 0.1 : 0.067);
  return (
    <>
      <Black />
      {on && (
        <Invert on={idx % 3 === 2}>
          <Slices t={t} amount={idx % 2 ? 0.4 : 0} seed={`f1${idx}`}>
            {F1_FLASH[idx % F1_FLASH.length](heat, t)}
          </Slices>
        </Invert>
      )}
    </>
  );
};

// ---------------- F2: alarm ----------------
const ALARM = BEAT * 2;

export const SceneF2: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  const P = pal(heat);
  const ui = P.ui;
  const t0 = 142.7;
  const t1 = 165.557;
  const p = prog(t, t0, t1);
  const temp = 52 + (180 - 52) * p;
  const cyc = ((t - t0) % ALARM) / ALARM;
  const blink = cyc < 0.5;
  const sink = easeIn(prog(t, t1 - BAR2, t1));
  const kneel = easeInOut(prog(t, t1 - BAR2, t1 - 0.3));
  return (
    <>
      <Black />
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${sink * 500}px)`, opacity: 1 - sink * 0.8 }}>
        <Haze t={t} amount={0.3 + p * 0.9}>
          <World heat={heat} pre={`saturate(${1 - p * 0.6})`}>
            <Bg id="BG07" zoom={1.0 + p * 0.15} py={0.2} />
          </World>
          {/* debris rain: pieces of the film fall, tilt, fade */}
          {Array.from({ length: 14 }, (_, i) => {
            const st = t0 + i * 1.5;
            if (t < st) return null;
            const a = t - st;
            const ids = ["CH-E1", "BG04", "OBJ08", "BG05", "OBJ06", "BG03", "CH-N1"];
            const id = ids[i % ids.length];
            return (
              <World key={i} heat={heat} pre={`saturate(${Math.max(0, 1 - a * 0.15)})`}>
                <Tile id={id} cx={rndr(`fx${i}`, 150, 1770) + noise(a * 0.5, `fn${i}`) * 60} cy={-200 + a * a * 45 + a * 80} w={rndr(`fw${i}`, 220, 420)} h={rndr(`fh${i}`, 140, 300)} rot={rndr(`fr${i}`, -20, 20) + a * rndr(`fs${i}`, -15, 15)} z={2} u={rnd(`fu${i}`)} v={rnd(`fv${i}`)} opacity={clamp(1.4 - a * 0.1)} />
              </World>
            );
          })}
        </Haze>
      </div>
      {kneel > 0 && (
        <Char heat={heat} style={{ opacity: kneel }}>
          <Pic id="CH05" cx={560} cy={760} h={620} />
        </Char>
      )}
      <Sys>
        {/* scan ring each alarm cycle */}
        <circle cx={960} cy={540} r={60 + cyc * 1100} fill="none" stroke={ui} strokeWidth={3} opacity={(1 - cyc) * 0.7 * (1 - sink)} />
        {/* warning frame */}
        {blink && sink < 0.5 && <rect x={24} y={24} width={1872} height={1032} fill="none" stroke={RED} strokeWidth={10} opacity={0.85} />}
        {/* thermometer */}
        <g opacity={1 - sink}>
          <rect x={110} y={505} width={1700} height={70} fill={P.plate} opacity={0.75} />
          <rect x={110} y={505} width={1700} height={70} fill="none" stroke={ui} strokeWidth={2} />
          <rect x={116} y={511} width={1688 * clamp((temp - 30) / 220)} height={58} fill={blink ? RED : ui} />
          {Array.from({ length: 23 }, (_, i) => (
            <g key={i}>
              <line x1={110 + (i * 1700) / 22} x2={110 + (i * 1700) / 22} y1={585} y2={i % 2 ? 597 : 610} stroke={ui} strokeWidth={2} />
              {i % 2 === 0 && (
                <text x={110 + (i * 1700) / 22} y={636} fontFamily={MONO} fontSize={24} fill={ui} textAnchor="middle">
                  {30 + i * 10}
                </text>
              )}
            </g>
          ))}
          <text x={110} y={480} fontFamily={MONO} fontSize={168} fill={WHITE}>
            {`${temp.toFixed(1)}℃`}
          </text>
          <text x={1810} y={480} fontFamily={MONO} fontSize={36} fill={blink ? RED : ui} textAnchor="end">
            {blink ? "WARNING  CORE OVERHEAT" : "COOLANT: NONE"}
          </text>
          <text x={1810} y={708} fontFamily={MONO} fontSize={48} fill={WHITE} textAnchor="end">
            {blink ? "警告　熱異常を検知" : ""}
          </text>
        </g>
      </Sys>
      <Flash a={blink ? 0.08 * (1 - sink) : 0} color={RED} blend="screen" />
    </>
  );
};
const BAR2 = BEAT * 8;

