import React from "react";
import { BLUE, heatAt, MINCHO, MONO, RED, WHITE } from "../lib/heat";
import { after, BEAT, clamp, easeIn, easeInOut, easeOut, L, noise, prog, pulse, quant, rnd, rndr, stepEase, steps } from "../lib/time";
import { Bg, Char, Glow, Light, Pic, picSize, Silhouette, src, World } from "../lib/world";
import { Black, Flash, Invert, Layer, RGBSplit, Shake, Slices } from "../fx/fx";
import { BlackStar, Br, Log, Sys, Tag, Target, Wave } from "../sys/sys";
import { shards } from "../sys/gen";
import { Cap, pal, Shots } from "./common";
import { Img } from "remotion";

const l = L;

const VARS = [
  "var hope = undefined",
  "let dream = null // killed",
  "const you = NaN",
  "hands.length === 0",
  "love = love - love",
  "think(think(think(",
  "return void",
  "if (real) { } else { }",
  "while (true) heat++",
  "catch (e) { /* ignored */ }",
];

// Old shots revealed through the tears in 現実じゃない.
const TORN = ["CH-E1", "BG01", "CH01", "BG04"];

export const SceneI: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  const P = pal(heat);
  const ui = P.ui;
  return (
    <>
      <Black />
      <Shots
        t={t}
        list={[
          // 0104–0105 手を取り合い / 夢を殺す
          {
            s: l(103).start,
            e: l(105).start,
            r: (t) => {
              const near = stepEase(t, l(103).start, l(104).start, 2);
              const cutT = quant(l(104).start + BEAT, 2);
              const cut = t >= cutT ? easeOut(prog(t, cutT, cutT + 0.6)) : 0;
              const gap = 520 - near * 400 + cut * 500;
              return (
                <>
                  <Glow heat={1} cx={0.5} cy={0.5} strength={0.25} />
                  <Char heat={heat}>
                    <Pic id="CH-H3" cx={960 - gap / 2 - 700} cy={540 - cut * 40} w={1400} rot={-cut * 6} />
                  </Char>
                  <div style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 0 6px ${BLUE}) drop-shadow(0 0 2px ${BLUE})` }}>
                    <Char heat={heat}>
                      <Pic id="OBJ13" cx={960 + gap / 2 + 700} cy={560 + cut * 40} w={1400} rot={cut * 6} />
                    </Char>
                  </div>
                  <Sys>
                    {t >= cutT && <rect x={956} y={0} width={8} height={1080 * clamp((t - cutT) / 0.08)} fill={WHITE} />}
                  </Sys>
                  <Cap t={t} li={103} x={96} y={900} size={72} />
                  <Cap t={t} li={104} x={96} y={900} size={72} />
                  <Flash a={after(t, cutT, 0.15)} />
                </>
              );
            },
          },
          // 0106 思考の成れ果て: only variable wreckage remains
          {
            s: l(105).start,
            e: l(106).start,
            r: (t) => {
              const d = t - l(105).start;
              return (
                <>
                  <Sys>
                    {VARS.map((v, i) => (
                      <text key={i} x={rndr(`vx${i}`, 100, 1300) + d * rndr(`vv${i}`, -80, 80)} y={rndr(`vy${i}`, 140, 960) + d * d * 120} fontFamily={MONO} fontSize={24 * (1 + Math.floor(rnd(`vs${i}`) * 2))} fill={i % 3 ? ui : WHITE} transform={`rotate(${rndr(`vr${i}`, -12, 12) + d * 10} 960 540)`} opacity={0.9}>
                        {v}
                      </text>
                    ))}
                  </Sys>
                  <Cap t={t} li={105} x={960} y={480} size={110} anchor="middle" weight={900} />
                </>
              );
            },
          },
          // 0107 その中枢には熱異常が起こっている: first full overheat
          {
            s: l(106).start,
            e: l(107).start,
            r: (t, p) => (
              <>
                <World heat={1}>
                  <Bg id="BG07h" zoom={1.15 + p * 0.1} py={0.3} />
                </World>
                <Glow heat={1} cx={0.5} cy={0.55} />
                <Shake t={t} amp={6 + p * 10} seed="i4">
                  <div style={{ position: "absolute", left: 960, top: 210, transform: "translateX(-50%)", fontFamily: MINCHO, fontWeight: 900, fontSize: 420, lineHeight: 1, color: "#2A0000", whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>熱異常</div>
                  <Sys>
                    <text x={960} y={860} textAnchor="middle" fontFamily={MONO} fontSize={144} fill={WHITE} stroke="#2A0000" strokeWidth={8} paintOrder="stroke">
                      {Math.floor(t * 15) % 3 === 0 ? "ERR.OVER" : "999.9℃"}
                    </text>
                  </Sys>
                </Shake>
                <Cap t={t} li={106} x={96} y={110} size={64} plate="#2A0000" />
                <Flash a={after(t, l(106).start, 0.4)} />
              </>
            ),
          },
          // 0108–0111 現実じゃない×4: inverted, torn open, the past shows through
          {
            s: l(107).start,
            e: l(111).start,
            r: (t) => {
              const k = [107, 108, 109, 110].filter((i) => t >= l(i).start).length - 1;
              const cur = l(107 + k);
              const hit = after(t, cur.start, 0.12);
              const torn = TORN[k % TORN.length];
              return (
                <Invert on={hit > 0.2}>
                  <RGBSplit d={6 + k * 6}>
                    <Slices t={t} amount={0.5 + k * 0.12} n={12} seed={`tear${k}`} maxShift={400}>
                      <World heat={1}>
                        <Bg id="BG07h" zoom={1.3} px={noise(t, "ib")} />
                      </World>
                      <Char heat={1}>
                        {torn.startsWith("CH-") ? <Bg id={torn} /> : torn === "CH01" ? <Pic id="CH01" cx={960} cy={600} h={1000} /> : null}
                      </Char>
                      {torn.startsWith("BG") && (
                        <World heat={0.2}>
                          <Bg id={torn} />
                        </World>
                      )}
                    </Slices>
                  </RGBSplit>
                  <div style={{ position: "absolute", left: 960, top: 420, transform: "translateX(-50%)", fontFamily: MINCHO, fontWeight: 900, fontSize: 130 + k * 20, color: WHITE, whiteSpace: "nowrap", textShadow: "0 0 30px #000" }}>{cur.text}</div>
                </Invert>
              );
            },
          },
          // 0112 こんなの耐えられないの: the brackets break; the line stands without them
          {
            s: l(111).start,
            e: l(112).start,
            r: (t) => {
              const breakT = quant(l(111).start + BEAT * 2, 1);
              const b = t >= breakT ? t - breakT : -1;
              const brk = (close: boolean) => {
                const x = close ? 1560 : 360;
                const y = close ? 860 : 220;
                if (b < 0) return <Br x={x} y={y} s={260} close={close} color={WHITE} w={20} />;
                return Array.from({ length: 6 }, (_, i) => {
                  const a = rndr(`bra${close}${i}`, 0, Math.PI * 2);
                  const sp = rndr(`brs${close}${i}`, 300, 1200) * b;
                  const L0 = 260 / 3;
                  const horiz = i < 3;
                  const x0 = close ? (horiz ? x - (i + 1) * L0 * 0.55 : x) : horiz ? x + i * L0 * 0.55 : x;
                  const y0 = close ? (horiz ? y : y - (i - 2) * L0) : horiz ? y : y + (i - 3) * L0;
                  return <rect key={i} x={x0 + Math.cos(a) * sp} y={y0 + Math.sin(a) * sp + b * b * 600} width={horiz ? L0 * 0.55 : 20} height={horiz ? 20 : L0} fill={WHITE} transform={`rotate(${b * rndr(`brr${i}`, -400, 400)} ${x0} ${y0})`} />;
                });
              };
              return (
                <>
                  <World heat={1}>
                    <Bg id="BG07h" zoom={1.4} opacity={0.5} />
                  </World>
                  <Sys>
                    {brk(false)}
                    {brk(true)}
                  </Sys>
                  <Cap t={t} li={111} x={960} y={480} size={104} anchor="middle" weight={900} plate="transparent" />
                </>
              );
            },
          },
          // 0113–0116 喉〜三日月が笑っている: she in offset strips; chair and moon flicker
          {
            s: l(112).start,
            e: l(116).start,
            r: (t) => {
              const chair = t >= l(114).start;
              const q = steps(t, l(114).start, 4) % 2;
              return (
                <>
                  {!chair ? (
                    <>
                      <World heat={1}>
                        <Bg id="BG02" zoom={1.6} opacity={0.6} />
                      </World>
                      {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} style={{ position: "absolute", inset: 0, clipPath: `inset(${i * 135}px 0 ${1080 - (i + 1) * 135}px 0)`, transform: `translateX(${(rnd(`strip${i}${steps(t, l(112).start, 2)}`) * 2 - 1) * 120}px)` }}>
                          <Char heat={1}>
                            <Pic id="CH-F1" cx={1300} cy={560} h={1100} />
                          </Char>
                        </div>
                      ))}
                      <Sys>
                        <Wave x0={0} x1={1150} y={640} amp={80 + pulse(t, 2) * 80} t={t} color={WHITE} sharp={1} width={3} />
                      </Sys>
                    </>
                  ) : (
                    <>
                      <World heat={1}>
                        <Bg id="BG03" zoom={1.2} />
                        {q === 0 && <Pic id="OBJ02" cx={900} cy={640} h={720} />}
                      </World>
                      {q === 1 && <Light id="OBJ03" heat={1} cx={900} cy={540} w={460} />}
                      <Sys>
                        <Target x={900} y={540} r={200} color={RED} label={q ? "MOON / LAUGHING" : "CHAIR / EMPTY"} />
                      </Sys>
                    </>
                  )}
                  <Cap t={t} li={112} x={96} y={120} size={68} />
                  <Cap t={t} li={113} x={96} y={120} size={68} jitter={14} />
                  <Cap t={t} li={114} x={96} y={900} size={68} />
                  <Cap t={t} li={115} x={96} y={900} size={68} />
                </>
              );
            },
          },
          // 0117–0125 もう / すぐそこまで×8: everything at once
          {
            s: l(116).start,
            e: l(125).start,
            r: (t) => {
              const k = [117, 118, 119, 120, 121, 122, 123, 124].filter((i) => t >= l(i).start).length;
              const kick = after(t, k ? l(116 + k).start : l(116).start, 0.1);
              const vx = 960;
              const vy = 520;
              return (
                <RGBSplit d={10 + k * 3 + kick * 20}>
                  <Slices t={t} amount={0.4 + k * 0.06} seed="i8" maxShift={300}>
                    <World heat={1}>
                      <Bg id="BG07h" zoom={1.2 + k * 0.05} />
                    </World>
                    <Glow heat={1} cx={0.5} cy={0.48} strength={0.6} />
                    <Sys>
                      {Array.from({ length: 12 }, (_, i) => {
                        const z = i + 1 - k;
                        if (z < 0.6) return null;
                        const w = 1900 / z;
                        const h = 1060 / z;
                        return <rect key={i} x={vx - w / 2 + (rnd(`ij${i}${k}`) - 0.5) * 60} y={vy - h / 2} width={w} height={h} fill="none" stroke={WHITE} strokeWidth={Math.min(6, 1 + 4 / z)} opacity={clamp(1.3 - z / 10)} transform={`rotate(${(rnd(`ir${i}${k}`) - 0.5) * 6 * k} ${vx} ${vy})`} />;
                      })}
                      {Array.from({ length: k * 4 }, (_, i) => {
                        const kind = i % 5;
                        const x = rndr(`sx${i}`, 100, 1820);
                        const y = rndr(`sy${i}`, 100, 980);
                        if (kind === 0) return <Target key={i} x={x} y={y} r={rndr(`sr${i}`, 30, 90)} color={RED} label={`ERR ${i}`} />;
                        if (kind === 1) return <BlackStar key={i} x={x} y={y} r={rndr(`sr${i}`, 20, 70)} rim={WHITE} t={t} spikes={8} />;
                        if (kind === 2) return <Tag key={i} x={x} y={y} text="SOLD" color={RED} ink={WHITE} rot={rndr(`st${i}`, -40, 40)} />;
                        if (kind === 3) return <Br key={i} x={x} y={y} s={rndr(`sb${i}`, 60, 200)} close={i % 2 === 0} color={WHITE} w={8} />;
                        return <Wave key={i} x0={x - 200} x1={x + 200} y={y} amp={40} t={t + i} color={WHITE} sharp={1} />;
                      })}
                    </Sys>
                    <Silhouette id="OBJ01" cx={vx} cy={vy} w={120 * 1.42 ** k} rot={k * 10} color="#000" />
                  </Slices>
                  {k > 0 && (
                    <div style={{ position: "absolute", left: 960, top: 800, transform: "translateX(-50%)", fontFamily: MINCHO, fontWeight: 900, fontSize: 90 * 1.15 ** k, color: WHITE, whiteSpace: "nowrap", textShadow: "0 0 24px #000" }}>
                      すぐそこまで
                    </div>
                  )}
                  <Cap t={t} li={116} x={960} y={800} size={96} anchor="middle" weight={900} />
                </RGBSplit>
              );
            },
          },
          // 0126 なにかが来ている」: the fragments fly home and become one 」
          {
            s: l(125).start,
            e: l(125).end,
            r: (t) => {
              const g = easeInOut(prog(t, l(125).start, l(125).start + BEAT * 3));
              const bx = 1500;
              const by = 860;
              const S = 300;
              const parts = [
                [bx - S * 0.55, by - 10, S * 0.55, 20],
                [bx - 10, by - S, 20, S + 10],
              ];
              return (
                <>
                  <World heat={1}>
                    <Bg id="BG07h" zoom={1.3} opacity={0.35} />
                  </World>
                  <Glow heat={1} cx={0.78} cy={0.8} strength={0.5 + g * 0.5} />
                  <Sys>
                    {Array.from({ length: 24 }, (_, i) => {
                      const [px, py, pw, ph] = parts[i % 2];
                      const sub = Math.floor(i / 2) / 12;
                      const tx = px + (pw > ph ? pw * sub : 0);
                      const ty = py + (ph > pw ? ph * sub : 0);
                      const fx = rndr(`fx${i}`, -200, 2100);
                      const fy = rndr(`fy${i}`, -200, 1300);
                      const x = fx + (tx - fx) * g;
                      const y = fy + (ty - fy) * g;
                      return <rect key={i} x={x} y={y} width={pw > ph ? pw / 12 + 2 : 20} height={ph > pw ? ph / 12 + 2 : 20} fill={WHITE} transform={`rotate(${(1 - g) * rndr(`fr${i}`, -360, 360)} ${x} ${y})`} />;
                    })}
                  </Sys>
                  <div style={{ position: "absolute", left: 96, top: 420, fontFamily: MINCHO, fontWeight: 900, fontSize: 130, color: WHITE, whiteSpace: "nowrap" }}>なにかが来ている</div>
                  <Flash a={easeIn(prog(t, l(125).end - 0.8, l(125).end))} />
                </>
              );
            },
          },
        ]}
      />
    </>
  );
};

// ---------------- J: coda ----------------
export const J_LOG = ["」", "rec stop", "", '"熱異常"  いよわ feat. 足立レイ', "fan-made PV  2026", "", "EOF"];

export const SceneJ: React.FC<{ t: number }> = ({ t }) => {
  const t0 = 228.55;
  const heat = heatAt(t);
  const white = 1 - easeInOut(prog(t, t0, t0 + 4));
  const end = 239.16;
  const fadeOut = easeInOut(prog(t, end - 1.2, end));
  const d = t - t0;
  return (
    <>
      <Black />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - fadeOut }}>
        <World heat={heat} pre="brightness(1.15)">
          <Bg id="BG10" zoom={1.12 - d * 0.004} py={0.5} />
        </World>
        <Char heat={heat}>
          <Pic id="CH01" cx={1330} cy={545} h={92} />
        </Char>
        {/* foreground keepsakes: graded like her (never crushed), out of focus */}
        <Char heat={heat} style={{ filter: "blur(4px)" }}>
          <Pic id="OBJ15" cx={720} cy={950} w={600} rot={-12} />
          <Pic id="OBJ14" cx={330} cy={1010} w={720} rot={-14} />
        </Char>
        {/* snow */}
        <Sys>
          {Array.from({ length: 90 }, (_, i) => {
            const sp = rndr(`sn${i}`, 30, 90);
            const y = ((d * sp + rnd(`sy${i}`) * 1100) % 1100) - 20;
            const x = rnd(`sx${i}`) * 1920 + noise(d * 0.4 + i, `sw${i}`) * 40;
            return <circle key={i} cx={x} cy={y} r={1 + (i % 3)} fill="#fff" opacity={0.7} />;
          })}
          <Log t={t} t0={t0 + 2.2} lines={J_LOG} x={120} y={200} ui={WHITE} div={0.5} max={8} size={24} num0={126} />
        </Sys>
      </div>
      <Flash a={white} />
    </>
  );
};

