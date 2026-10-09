import React from "react";
import { heatAt, MINCHO, WHITE } from "../lib/heat";
import { after, BEAT, clamp, easeInOut, featS, L, noise, prog, pulse, quant, rnd, rndr, steps } from "../lib/time";
import { Bg, Char, GlyphWindow, Pic, Silhouette, World } from "../lib/world";
import { Black, Flash, Layer } from "../fx/fx";
import { Log, Lyric, Sys } from "../sys/sys";
import { pal, Shots } from "./common";

const l = L;
export const STAR_POS = { x: 1250, y: 290 };

// Burst-line lyric: large, no plate, bottom-left on the grid.
const Big: React.FC<{ t: number; li: number; y?: number; x?: number; size?: number; weight?: number; color?: string }> = ({ t, li, y = 830, x = 96, size = 96, weight = 800, color = WHITE }) => (
  <Lyric text={l(li).text} t={t} start={l(li).start} end={l(li).end} x={x} y={y} size={size} weight={weight} span={0.55} color={color} shadow="0 0 24px rgba(0,0,0,0.85)" />
);

// Narrow glint: a cold 4-point star.
export const Glint: React.FC<{ x: number; y: number; s: number; color: string; t: number }> = ({ x, y, s, color, t }) => {
  const tw = 1 + 0.15 * Math.sin(t * 9);
  return (
    <g>
      <circle cx={x} cy={y} r={s * 0.5} fill={color} style={{ filter: `blur(${s * 0.4}px)` }} opacity={0.8} />
      <path d={`M${x} ${y - s * 3 * tw} L${x + s * 0.25} ${y} L${x} ${y + s * 3 * tw} L${x - s * 0.25} ${y} Z`} fill={color} />
      <path d={`M${x - s * 2 * tw} ${y} L${x} ${y + s * 0.2} L${x + s * 2 * tw} ${y} L${x} ${y - s * 0.2} Z`} fill={color} />
      <circle cx={x} cy={y} r={s * 0.35} fill="#fff" />
    </g>
  );
};

export const SceneC: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  const P = pal(heat);
  const ui = P.ui;
  return (
    <>
      <Black />
      <Shots
        t={t}
        list={[
          // 0059 哭いた閃光が目に刺さる
          {
            s: l(58).start,
            e: l(59).start,
            r: (t, p) => {
              const px = 1400;
              const py = 610;
              const z = 1 + p * 0.5;
              const sx = 960 + (px - 960) * z;
              const sy = 540 + (py - 540) * z;
              const rot = steps(t, l(58).start, 2) * 9;
              return (
                <>
                  <Char heat={heat}>
                    <div style={{ position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: "50% 50%" }}>
                      <Bg id="CH-E1" />
                    </div>
                  </Char>
                  <Sys>
                    <g opacity={0.85} style={{ mixBlendMode: "screen" }}>
                      {Array.from({ length: 36 }, (_, i) => {
                        const a = ((i * 10 + rot) * Math.PI) / 180;
                        const r0 = 90 * z;
                        const r1 = r0 + rndr(`ray${i}`, 300, 1400) * (0.6 + 0.4 * pulse(t, 1));
                        return <line key={i} x1={sx + Math.cos(a) * r0} y1={sy + Math.sin(a) * r0} x2={sx + Math.cos(a) * r1} y2={sy + Math.sin(a) * r1} stroke={WHITE} strokeWidth={i % 3 ? 1.5 : 4} />;
                      })}
                    </g>
                  </Sys>
                  <div style={{ position: "absolute", left: 40, top: -120, fontFamily: MINCHO, fontWeight: 900, fontSize: 900, lineHeight: 1, color: "transparent", WebkitTextStroke: `3px ${WHITE}`, opacity: 0.5 }}>閃</div>
                  <Big t={t} li={58} />
                  <Flash a={after(t, l(58).start, 0.3)} />
                </>
              );
            },
          },
          // 0060 お別かれの鐘が鳴る
          {
            s: l(59).start,
            e: l(60).start,
            r: (t, p) => {
              const bx = 1340;
              const by = 150;
              const k = steps(t, l(59).start, 1);
              const ph = pulse(t, 1, 0.3);
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG04" zoom={1.1} px={0.6} py={-0.4} />
                  </World>
                  <World heat={heat - 0.15} style={{ opacity: 0.95 }}>
                    <GlyphWindow text="鐘" id="BG07h" x={40} y={80} size={940} font={MINCHO} bgSize="1920px 1080px" bgPos="-40px -80px" />
                  </World>
                  <World heat={heat}>
                    <Pic id="OBJ08" cx={bx + 40} cy={640 - p * 40} h={1250} rot={8} />
                  </World>
                  <Sys>
                    {Array.from({ length: 6 }, (_, i) => {
                      const age = (k - i) + (1 - ph) * 0.4;
                      if (age < 0) return null;
                      return <circle key={i} cx={bx} cy={by} r={60 + age * 170} fill="none" stroke={ui} strokeWidth={3 - age * 0.4} opacity={clamp(1 - age / 6)} />;
                    })}
                  </Sys>
                  <Big t={t} li={59} />
                </>
              );
            },
          },
          // 0061–0062 神が成した歴史の / 結ぶ答えは砂の味がする: desert, the words turn to sand
          {
            s: l(60).start,
            e: l(62).start,
            r: (t) => {
              const d = t - l(60).start;
              const lines = [60, 61];
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG05" zoom={1.25 + d * 0.01} py={0.85} px={noise(d * 0.1, "des") * 0.3} />
                  </World>
                  {lines.map((li) => {
                    const L0 = l(li);
                    if (t < L0.start) return null;
                    const chars = [...L0.text];
                    const sandAt = li === 60 ? l(61).start + 0.4 : L0.start + (L0.end - L0.start) * 0.62;
                    const size = li === 60 ? 150 : 110;
                    const y0 = li === 60 ? 150 : 400;
                    const n = Math.min(chars.length, Math.ceil(clamp((quant(t, 4) - L0.start) / ((L0.end - L0.start) * 0.5)) * chars.length + 0.001));
                    return chars.map((ch, i) => {
                      if (i >= n) return null;
                      const cx = 120 + i * size * 1.06;
                      const ts = sandAt + i * 0.06;
                      const s = clamp((t - ts) / 0.9);
                      return (
                        <React.Fragment key={`${li}${i}`}>
                          <div style={{ position: "absolute", left: cx, top: y0, fontFamily: MINCHO, fontWeight: li === 60 ? 300 : 600, fontSize: size, color: WHITE, opacity: 1 - s, textShadow: "0 0 20px rgba(0,0,0,0.5)" }}>{ch}</div>
                          {s > 0 && (
                            <Sys>
                              {Array.from({ length: 40 }, (_, j) => {
                                const sx = cx + rnd(`sd${li}${i}${j}`) * size;
                                const sy = y0 + rnd(`se${li}${i}${j}`) * size * 1.1;
                                const dx = s * rndr(`sv${li}${i}${j}`, 200, 900);
                                const dy = s * rndr(`sw${li}${i}${j}`, -120, 80) + noise(s * 3, `sn${j}`) * 20;
                                return <rect key={j} x={sx + dx} y={sy + dy} width={4} height={4} fill={WHITE} opacity={(1 - s) * 0.9} />;
                              })}
                            </Sys>
                          )}
                        </React.Fragment>
                      );
                    });
                  })}
                </>
              );
            },
          },
          // 0063 死んだ変数で繰り返す: night ruins, the log mirrored and garbling (callback to A)
          {
            s: l(62).start,
            e: l(63).start,
            r: (t, p) => {
              const cold = pal(0.02);
              return (
                <>
                  <World heat={0.02}>
                    <Bg id="BG01b" zoom={1.2 - p * 0.06} py={0.4} />
                  </World>
                  <Sys>
                    <Log
                      t={t}
                      t0={l(62).start}
                      lines={["let dead = vars.filter(v => !v.alive)", "for (const v of dead) {", "  repeat(v)", "  count += 1", "}", "heat = 41.2", "heat += count * 0.1", "send(log, to: ???)", "  -> timeout"]}
                      x={1290}
                      y={190}
                      ui={cold.ui}
                      plate={cold.plate}
                      max={9}
                      div={1}
                      size={19}
                      num0={7}
                      garble={p * 0.5}
                      w={520}
                    />
                  </Sys>
                  <Lyric text={l(62).text} t={t} start={l(62).start} end={l(62).end} x={260} y={150} size={74} vertical weight={600} shadow="0 0 14px rgba(0,0,0,0.9)" />
                </>
              );
            },
          },
          // 0064 数え事が孕んだ熱: she, half body; the glyph 熱 is a window onto fire
          {
            s: l(63).start,
            e: l(64).start,
            r: (t, p) => {
              const hit = after(t, l(63).start, 0.25);
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG07" zoom={1.2} opacity={0.35} />
                  </World>
                  <World heat={0.62}>
                    <GlyphWindow text="熱" id="BG07h" x={760} y={40} size={1000} font={MINCHO} bgSize="2200px 1240px" bgPos={`${-760 - p * 80}px -100px`} />
                  </World>
                  <Char heat={heat}>
                    <Pic id="CH02" cx={560} cy={760 - p * 30} h={1400} />
                  </Char>
                  <Big t={t} li={63} x={96} y={120} />
                  <Flash a={hit} color="#FF7A45" blend="screen" />
                </>
              );
            },
          },
          // 0065–0066 誰かの澄んだ瞳の / 色をした星に問いかけている: one cold star; we look up to it
          {
            s: l(64).start,
            e: l(65).end,
            r: (t) => {
              const up = easeInOut(prog(t, l(65).start, l(65).end));
              const cold = pal(0.0);
              return (
                <>
                  <World heat={0.03}>
                    <Bg id="BG06a" zoom={1.35} py={0.9 - up * 1.6} />
                  </World>
                  <Sys>
                    <Glint x={STAR_POS.x} y={STAR_POS.y} s={7 + featS("vocal", t, 0.3) * 3} color="#C9D3DC" t={t} />
                    {t >= l(65).start && <circle cx={STAR_POS.x} cy={STAR_POS.y} r={70 - up * 20} fill="none" stroke={cold.ui} strokeWidth={1.5} strokeDasharray="6 8" />}
                  </Sys>
                  {t >= l(65).start && <Silhouette id="CH-F1" cx={620} cy={1120 + (1 - up) * 300} w={760} color="#020304" />}
                  <Lyric text={l(64).text} t={t} start={l(64).start} end={l(64).end} x={96} y={760} size={78} weight={300} span={0.55} opacity={t < l(65).start ? 1 : 0.35} />
                  <Lyric text={l(65).text} t={t} start={l(65).start} end={l(65).end} x={96} y={870} size={78} weight={500} span={0.55} />
                </>
              );
            },
          },
        ]}
      />
    </>
  );
};


// ---------------- D: chant ----------------
const D_SHOTS: { id: string; kind: "bg" | "char" | "throat" | "eye" | "far" | "hands" }[] = [
  { id: "BG06b", kind: "bg" },
  { id: "CH-F1", kind: "throat" },
  { id: "BG06a", kind: "bg" },
  { id: "CH-E1", kind: "eye" },
  { id: "CH01", kind: "far" },
  { id: "CH-H1", kind: "hands" },
  { id: "BG06a", kind: "bg" },
  { id: "CH-F1", kind: "char" },
];

export const SceneD: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  const P = pal(heat);
  const t0 = 87.54;
  const silence = t >= 108.9 && t < 110.0;
  const shotLen = BEAT * 8;
  const idx = Math.floor((t - t0) / shotLen);
  const v = featS("vocal", t, 0.12);
  const renderShot = (i: number, a: number) => {
    const sh = D_SHOTS[((i % D_SHOTS.length) + D_SHOTS.length) % D_SHOTS.length];
    const p = (t - t0 - i * shotLen) / shotLen;
    const z = 1.05 + p * 0.08;
    let node: React.ReactNode;
    if (sh.kind === "bg")
      node = (
        <World heat={heat}>
          <Bg id={sh.id} zoom={z} py={0.2} />
        </World>
      );
    else if (sh.kind === "throat")
      node = (
        <>
          <World heat={heat}>
            <Bg id="BG06b" zoom={1.4} />
          </World>
          <Char heat={heat}>
            <Pic id="CH-F1" cx={1000 - p * 30} cy={300} h={2300} />
          </Char>
        </>
      );
    else if (sh.kind === "eye")
      node = (
        <Char heat={heat}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${1.9 + p * 0.25})`, transformOrigin: "73% 56%" }}>
            <Bg id="CH-E1" />
          </div>
        </Char>
      );
    else if (sh.kind === "far")
      node = (
        <>
          <World heat={heat}>
            <Bg id="BG06b" zoom={z} />
          </World>
          <Char heat={heat}>
            <Pic id="CH01" cx={1180} cy={560} h={170} />
            <Pic id="CH01" cx={1180} cy={730} h={170} opacity={0.25} style={{ transform: "scaleY(-1)", filter: "blur(1.5px)" }} />
          </Char>
        </>
      );
    else if (sh.kind === "hands")
      node = (
        <>
          <World heat={heat}>
            <Bg id="BG06a" zoom={1.5} opacity={0.5} />
          </World>
          <Char heat={heat}>
            <Pic id="CH-H1" cx={960} cy={560 + p * 20} w={1500 * z} />
          </Char>
        </>
      );
    else
      node = (
        <>
          <World heat={heat}>
            <Bg id="BG06a" zoom={1.2} />
          </World>
          <Char heat={heat}>
            <Pic id="CH-F1" cx={1240} cy={600 - p * 20} h={1150 * z} />
          </Char>
        </>
      );
    return (
      <div key={i} style={{ position: "absolute", inset: 0, opacity: a }}>
        {node}
      </div>
    );
  };
  const p = (t - t0) / shotLen - idx;
  const fade = clamp(p / 0.12);
  const recIn = t >= 110.0;
  return (
    <>
      <Black />
      {!silence && !recIn && (
        <>
          {idx > 0 && fade < 1 && renderShot(idx - 1, 1)}
          {renderShot(idx, fade)}
          <Layer style={{ background: "linear-gradient(transparent 60%, rgba(0,0,0,0.5))" }} />
          <Sys>
            <WaveLine t={t} v={v} ui={P.ui} />
            <Log
              t={t}
              t0={t0}
              lines={Array.from({ length: 40 }, (_, i) => {
                const tt = t0 + i * BEAT * 2;
                const m = Math.floor(tt / 60);
                const s = (tt % 60).toFixed(2).padStart(5, "0");
                return `[0${m}:${s}] —`;
              })}
              x={110}
              y={720}
              ui={P.ui}
              max={6}
              div={0.5}
              size={17}
              num0={60}
            />
          </Sys>
        </>
      )}
      {recIn && (
        <World heat={0.2}>
          <Pic id="OBJ14" cx={960} cy={1240 - easeInOut(prog(t, 110.0, 110.4)) * 520} w={1100} rot={-6} />
        </World>
      )}
    </>
  );
};

const WaveLine: React.FC<{ t: number; v: number; ui: string }> = ({ t, v, ui }) => (
  <>
    <line x1={0} x2={1920} y1={540} y2={540} stroke={ui} strokeWidth={1} opacity={0.25} />
    {/* WAVE replaces the words: amplitude follows the voice */}
    {Array.from({ length: 3 }, (_, k) => {
      const pts: string[] = [];
      for (let i = 0; i <= 240; i++) {
        const u = i / 240;
        const env = Math.sin(Math.PI * u) ** 1.5;
        const y = 540 + Math.sin(u * (18 + k * 7) + t * (2.2 + k)) * env * (10 + v * 140) * (1 - k * 0.3) + noise(u * 30 + t * 3, `dw${k}`) * v * 20 * env;
        pts.push(`${(u * 1920).toFixed(1)},${y.toFixed(1)}`);
      }
      return <polyline key={k} points={pts.join(" ")} fill="none" stroke={k === 0 ? WHITE : ui} strokeWidth={k === 0 ? 2 : 1} opacity={k === 0 ? 0.9 : 0.5} />;
    })}
  </>
);

