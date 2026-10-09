import React from "react";
import { staticFile } from "remotion";
import { heatAt } from "../lib/heat";
import { clamp, FPS, prog, rnd, SEC, secAt } from "../lib/time";

// Signal degradation: a recording device running in radiation and heat.
// Two families, both always on and scaled by one intensity `d` (0..1):
//   analog interference  — horizontal tearing, chroma shift, a rolling band, vertical-hold jumps
//   sensor / radiation   — white sparkles, accumulating hot pixels, CCD column smear, line dropouts

const W = 1920;
const H = 1080;
const abs: React.CSSProperties = { position: "absolute", inset: 0 };

// Section boosts: the sprint sections run hotter on the signal than their heat alone suggests.
const SEC_BOOST: Record<string, number> = { A: 0, B: 0.14, C: 0.08, D: -0.04, E: 0.16, F1: 0.05, F2: 0.08, G: 0.06, H: 0.1, I: 0.24, J: -0.06 };

export const distortAt = (t: number) => {
  const sec = secAt(t);
  // weak while the world is still cold; accelerates as it heats up
  const h = heatAt(t);
  let d = 0.04 + 0.6 * h ** 1.3 + (SEC_BOOST[sec] ?? 0) * (0.5 + h);
  // A's last bar foreshadows B; J drains back to the floor.
  if (sec === "A") d += 0.25 * prog(t, SEC.A[1] - 1.3, SEC.A[1]);
  if (sec === "J") d = Math.max(0.05, d * (1 - prog(t, 230, 236)));
  return clamp(d);
};

// Extra signal kicks registered by scenes (cut points etc.): returns 0..1 for the current frame.
export type Kick = (t: number) => number;

type Band = { y: number; h: number; dx: number };

// Tear bands for frame f. Bursts last a few frames so tears read as interference, not noise.
const tearBands = (t: number, d: number, kick: number): Band[] => {
  const f = Math.floor(t * FPS);
  const bands: Band[] = [];
  // a burst starts on frame b and lasts 1..4 frames
  for (let back = 0; back < 4; back++) {
    const b = f - back;
    const len = 1 + Math.floor(rnd(`tl${b}`) * 4);
    if (back >= len) continue;
    const p = 0.01 + d * 0.45 + kick * 0.6;
    if (rnd(`tb${b}`) > p) continue;
    const n = 1 + Math.floor(rnd(`tn${b}`) * (1 + d * 5 + kick * 3));
    for (let i = 0; i < n; i++) {
      // mostly wide bands, with the odd thin sliver
      const thin = rnd(`tt${b}:${i}`) < 0.25;
      const h = thin ? 3 + rnd(`th${b}:${i}`) * 12 : 10 + rnd(`th${b}:${i}`) ** 1.5 * (70 + d * 300 + kick * 200);
      const y = rnd(`ty${b}:${i}`) * H;
      // bands drift a little within the burst
      const dx = (rnd(`tx${b}:${i}`) * 2 - 1) * (12 + d * 110 + kick * 120) * (1 + back * 0.15);
      bands.push({ y: y + back * 6, h, dx });
    }
  }
  return bands;
};

const ROLL_PERIOD = 4.7;

export { tearBands };

export const Signal: React.FC<{ t: number; d: number; kick?: number; children: React.ReactNode }> = ({ t, d, kick = 0, children }) => {
  const f = Math.floor(t * FPS);
  const bands = tearBands(t, d, kick);
  // rolling interference band adds a soft constant shear where it passes
  const ry = ((t / ROLL_PERIOD) % 1) * (H + 400) - 200;
  bands.push({ y: ry - 70, h: 140, dx: 1 + d * 18 }, { y: ry - 6, h: 12, dx: -(2 + d * 30) });
  const chroma = 0.8 + d * 7 + kick * 10;
  // multipath ghost + horizontal smear
  const g = 0.08 + d * 0.6 + kick * 0.3;
  const gx = 10 + d * 18;
  // vertical hold: rare 1–2 frame jumps
  let vy = 0;
  for (let back = 0; back < 2; back++) {
    const b = f - back;
    if (rnd(`vh${b}`) < 0.002 + d * 0.012 + kick * 0.05) vy = (rnd(`vy${b}`) * 2 - 1) * (20 + d * 120);
  }
  const maxDx = Math.max(1, ...bands.map((b) => Math.abs(b.dx)));
  const S = maxDx * 2.2;
  const id = `sig${f}`;
  const col = (dx: number) => `rgb(${Math.round(127.5 + (dx / S) * 255)},128,128)`;
  return (
    <div style={{ ...abs, overflow: "hidden", background: "#000" }}>
      <div style={{ ...abs, filter: `url(#${id})`, transform: vy ? `translateY(${vy}px)` : undefined }}>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter
            id={id}
            x={0}
            y={0}
            width={W}
            height={H}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodColor="rgb(128,128,128)" result="base" />
            {bands.map((b, i) => (
              <feFlood key={i} x={0} y={b.y} width={W} height={b.h} floodColor={col(b.dx)} result={`b${i}`} />
            ))}
            <feMerge result="map">
              <feMergeNode in="base" />
              {bands.map((_, i) => (
                <feMergeNode key={i} in={`b${i}`} />
              ))}
            </feMerge>
            <feDisplacementMap in="SourceGraphic" in2="map" scale={S} xChannelSelector="R" yChannelSelector="G" result="d0" />
            <feOffset in="d0" dx={gx} dy={0} result="gh" />
            <feComposite in="d0" in2="gh" operator="arithmetic" k1={0} k2={1 - 0.22 * g} k3={0.22 * g} k4={0} result="d1" />
            <feGaussianBlur in="d0" stdDeviation={`${10 + d * 14} 0`} result="sm0" />
            <feOffset in="sm0" dx={gx * 1.6} dy={0} result="sm" />
            <feComposite in="d1" in2="sm" operator="arithmetic" k1={0} k2={1 - 0.15 * g} k3={0.2 * g} k4={0} result="d" />
            <feOffset in="d" dx={-chroma} dy={0} result="o1" />
            <feColorMatrix in="o1" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r" />
            <feColorMatrix in="d" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g" />
            <feOffset in="d" dx={chroma} dy={0} result="o3" />
            <feColorMatrix in="o3" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="bl" />
            <feBlend in="r" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="bl" mode="screen" />
          </filter>
        </svg>
        {children}
      </div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {bands.slice(0, -2).map((b, i) =>
          b.h > 40 ? (
            <g key={i}>
              <rect x={0} y={b.y} width={W} height={b.h} fill="#fff" opacity={0.04 + 0.05 * rnd(`bl${f}:${i}`)} />
              <rect x={0} y={b.y + (rnd(`be${f}:${i}`) < 0.5 ? 0 : b.h - 2)} width={W} height={2} fill="#fff" opacity={0.35} />
            </g>
          ) : null,
        )}
      </svg>
    </div>
  );
};

// ---------- sensor / radiation noise ----------
const HOT_POOL = Array.from({ length: 420 }, (_, i) => ({
  x: Math.floor(rnd(`hpx${i}`) * W),
  y: Math.floor(rnd(`hpy${i}`) * H),
  c: ["#FFFFFF", "#FFFFFF", "#FF3B30", "#38FF6A", "#4A7BFF"][Math.floor(rnd(`hpc${i}`) * 5)],
  blink: rnd(`hpb${i}`) < 0.3,
}));
// Damage accumulates over the song and never heals.
const hotCount = (t: number) => Math.floor(3 + 40 * clamp(t / 130) + 160 * clamp((t - 130) / 100) ** 1.4);

export const SensorNoise: React.FC<{ t: number; d: number; kick?: number }> = ({ t, d, kick = 0 }) => {
  const f = Math.floor(t * FPS);
  const nSpark = Math.round(4 + d * 70 + kick * 60);
  const sparks = Array.from({ length: nSpark }, (_, i) => {
    const s = 1 + Math.floor(rnd(`sps${f}:${i}`) ** 3 * 4);
    return { x: rnd(`spx${f}:${i}`) * W, y: rnd(`spy${f}:${i}`) * H, s, o: 0.5 + rnd(`spo${f}:${i}`) * 0.5, cross: s > 2 };
  });
  const hot = HOT_POOL.slice(0, hotCount(t));
  // CCD column smear and line dropouts
  const cols: { x: number; y0: number; w: number; o: number }[] = [];
  for (let back = 0; back < 3; back++) {
    const b = f - back;
    if (rnd(`cl${b}`) < 0.015 + d * 0.1 + kick * 0.2 && rnd(`cll${b}`) * 3 > back) {
      const n = 1 + Math.floor(rnd(`cn${b}`) * 3);
      for (let i = 0; i < n; i++)
        cols.push({ x: rnd(`cx${b}:${i}`) * W, y0: rnd(`cy${b}:${i}`) < 0.5 ? 0 : rnd(`cy2${b}:${i}`) * H, w: rnd(`cw${b}:${i}`) < 0.7 ? 1 : 2, o: 0.25 + rnd(`co${b}:${i}`) * 0.55 });
    }
  }
  const drops: { y: number; h: number; white: boolean }[] = [];
  if (rnd(`dr${f}`) < 0.02 + d * 0.12 + kick * 0.2) {
    const n = 1 + Math.floor(rnd(`dn${f}`) * 4);
    for (let i = 0; i < n; i++) drops.push({ y: rnd(`dy${f}:${i}`) * H, h: 1 + Math.floor(rnd(`dh${f}:${i}`) * 3), white: rnd(`dw${f}:${i}`) < 0.35 });
  }
  const ry = ((t / ROLL_PERIOD) % 1) * (H + 400) - 200;
  const tile = f % 6;
  return (
    <>
      {/* rolling band */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: W,
          top: ry - 150,
          height: 300,
          background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)",
          mixBlendMode: "overlay",
          opacity: 0.08 + d * 0.42,
        }}
      />
      <div style={{ position: "absolute", left: 0, width: W, top: ry, height: 3, background: "#fff", opacity: 0.05 + d * 0.25 }} />
      {/* grain: denser and brighter as the sensor degrades */}
      <div
        style={{
          ...abs,
          backgroundImage: `url(${staticFile(`fx/grain${tile}.png`)})`,
          backgroundPosition: `${Math.floor(rnd(`gx${f}`) * 512)}px ${Math.floor(rnd(`gy${f}`) * 512)}px`,
          mixBlendMode: "overlay",
          opacity: 0.1 + d * 0.16,
        }}
      />
      <div
        style={{
          ...abs,
          backgroundImage: `url(${staticFile(`fx/grain${(tile + 3) % 6}.png`)})`,
          backgroundPosition: `${Math.floor(rnd(`hx${f}`) * 512)}px ${Math.floor(rnd(`hy${f}`) * 512)}px`,
          mixBlendMode: "screen",
          opacity: 0.02 + d * 0.07,
        }}
      />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {cols.map((c, i) => (
          <rect key={`c${i}`} x={c.x} y={c.y0} width={c.w} height={H - c.y0} fill="#fff" opacity={c.o} />
        ))}
        {drops.map((r, i) => (
          <rect key={`d${i}`} x={0} y={r.y} width={W} height={r.h} fill={r.white ? "#fff" : "#000"} opacity={r.white ? 0.5 : 0.85} />
        ))}
        {hot.map((p, i) =>
          p.blink && rnd(`hb${f}:${i}`) < 0.5 ? null : <rect key={`h${i}`} x={p.x} y={p.y} width={2} height={2} fill={p.c} />,
        )}
        {sparks.map((s, i) =>
          s.cross ? (
            <g key={`s${i}`} fill="#fff" opacity={s.o}>
              <rect x={s.x - s.s * 1.5} y={s.y} width={s.s * 3} height={1} />
              <rect x={s.x} y={s.y - s.s * 1.5} width={1} height={s.s * 3} />
            </g>
          ) : (
            <rect key={`s${i}`} x={s.x} y={s.y} width={s.s} height={s.s} fill="#fff" opacity={s.o} />
          ),
        )}
      </svg>
      {/* scanlines + vignette */}
      <div
        style={{
          ...abs,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 1px, transparent 3px)",
          opacity: 0.1 + d * 0.06,
        }}
      />
      <div style={{ ...abs, background: "radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)" }} />
    </>
  );
};
