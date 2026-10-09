import React from "react";
import { FPS, rnd } from "../lib/time";
import { Ctx, Render } from "./engine";
import { NOISE } from "./filler";

// Slow-section player (A / D / G / J): long shots, push-ins, soft transitions.
//   cut      hard cut
//   dissolve crossfade
//   signal   crossfade broken by a few frames of tearing noise (the recording stutters)
//   black    dip to black

export type Trans = "cut" | "dissolve" | "signal" | "black";
export type SShot = { s: number; e: number; r: Render; tin?: Trans; tdur?: number };

const abs: React.CSSProperties = { position: "absolute", inset: 0 };

const ctxFor = (sh: SShot, i: number, t: number): Ctx => ({
  t,
  s: sh.s,
  e: sh.e,
  lt: t - sh.s,
  p: (t - sh.s) / Math.max(1 / FPS, sh.e - sh.s),
  k: i,
  j: 0,
  seed: `sl${sh.s.toFixed(2)}`,
  li: -1,
  rep: 0,
});

export const SlowPlayer: React.FC<{ t: number; shots: SShot[] }> = ({ t, shots }) => {
  const i = shots.findIndex((sh) => t >= sh.s && t < sh.e);
  if (i < 0) return null;
  const sh = shots[i];
  const cur = sh.r(ctxFor(sh, i, t));
  const tin = sh.tin ?? "dissolve";
  const dur = sh.tdur ?? 0.6;
  const lt = t - sh.s;
  if (tin === "cut" || i === 0 || lt >= dur) return <>{cur}</>;
  const prev = shots[i - 1];
  const q = lt / dur;
  if (tin === "black") {
    const a = q < 0.5 ? q * 2 : 2 - q * 2;
    return (
      <div style={abs}>
        {q < 0.5 ? prev.r(ctxFor(prev, i - 1, t)) : cur}
        <div style={{ ...abs, background: "#000", opacity: a }} />
      </div>
    );
  }
  const f = Math.floor(t * FPS);
  const stutter = tin === "signal" && q > 0.3 && q < 0.7 && rnd(`st${sh.s}${f}`) < 0.6;
  return (
    <div style={abs}>
      {prev.r(ctxFor(prev, i - 1, t))}
      <div style={{ ...abs, opacity: q }}>{cur}</div>
      {stutter && <div style={{ ...abs, opacity: 0.55, mixBlendMode: "screen" }}>{NOISE({ ...ctxFor(sh, i, t), seed: `stn${f}` })}</div>}
    </div>
  );
};

// Shots from absolute start times; each runs until the next one starts (the last until `end`).
export const timeline = (end: number, items: [number, Render, Trans?, number?][]): SShot[] =>
  items.map(([s, r, tin, tdur], k) => ({ s, e: k + 1 < items.length ? items[k + 1][0] : end, r, tin, tdur }));
